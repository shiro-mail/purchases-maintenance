from flask import Flask, render_template, request, jsonify, redirect, url_for
import sqlite3
import json
import os
import uuid
import requests
import time
from datetime import datetime
from config import DifyConfig

app = Flask(__name__)

def init_db():
    conn = sqlite3.connect('purchases.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS basic_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            page TEXT,
            shipment_date TEXT NOT NULL,
            order_number TEXT NOT NULL,
            delivery_number TEXT NOT NULL,
            person_in_charge TEXT NOT NULL,
            shipping_cost INTEGER NOT NULL,
            total_amount INTEGER NOT NULL,
            import_session_id TEXT NOT NULL DEFAULT 'legacy',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS parts_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            basic_info_id INTEGER NOT NULL,
            part_number TEXT NOT NULL,
            part_name TEXT NOT NULL,
            quantity INTEGER NOT NULL,
            unit_price INTEGER NOT NULL,
            sales_amount INTEGER NOT NULL,
            FOREIGN KEY (basic_info_id) REFERENCES basic_info (id)
        )
    ''')
    
    try:
        cursor.execute('PRAGMA table_info(basic_info)')
        columns = [column[1] for column in cursor.fetchall()]
        if 'page' not in columns:
            cursor.execute('ALTER TABLE basic_info ADD COLUMN page TEXT')
            print('Database migration: Added page column to basic_info table')
    except Exception as e:
        print(f'Database migration warning: {e}')
    
    conn.commit()
    conn.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/import')
def import_file():
    return render_template('import.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'ファイルが選択されていません'}), 400
    
    if file and file.filename.endswith('.json'):
        try:
            content = file.read().decode('utf-8')
            data = json.loads(content)
            
            if isinstance(data, dict) and 'text' in data:
                import re
                extracted_data = []
                for item in data['text']:
                    if isinstance(item, dict):
                        transformed_item = {
                            'ページ': item.get('ページ', ''),
                            '出荷日': item.get('出荷日', ''),
                            '受注番号': item.get('受注番号', ''),
                            '納入先番号': item.get('納入先番号', ''),
                            '担当者': item.get('担当者', ''),
                            '運賃': item.get('運賃', 0),
                            '税抜合計': item.get('税抜合計', 0),
                            '部品番号': item.get('部品番号', []),
                            '部品名': item.get('部品名', []),
                            '数量': item.get('数量', []),
                            '売上単価': item.get('売上単価', []),
                            '売上金額': item.get('売上金額', [])
                        }
                        
                        if '明細' in item and isinstance(item['明細'], list):
                            parts_numbers = []
                            parts_names = []
                            quantities = []
                            unit_prices = []
                            amounts = []
                            
                            for detail in item['明細']:
                                parts_numbers.append(detail.get('部品番号', ''))
                                parts_names.append(detail.get('部品名', ''))
                                quantities.append(str(detail.get('数量', 0)))
                                unit_prices.append(str(detail.get('売上単価', 0)))
                                amounts.append(str(detail.get('売上金額', 0)))
                            
                            transformed_item['部品番号'] = parts_numbers
                            transformed_item['部品名'] = parts_names
                            transformed_item['数量'] = quantities
                            transformed_item['売上単価'] = unit_prices
                            transformed_item['売上金額'] = amounts
                        
                        extracted_data.append(transformed_item)
                    else:
                        json_matches = re.findall(r'```json\n(.*?)\n```', str(item), re.DOTALL)
                        for json_match in json_matches:
                            try:
                                parsed_json = json.loads(json_match)
                                if isinstance(parsed_json, list):
                                    extracted_data.extend(parsed_json)
                                else:
                                    extracted_data.append(parsed_json)
                            except json.JSONDecodeError:
                                continue
                
                if extracted_data:
                    data = extracted_data
                else:
                    return jsonify({'error': 'Dify形式のJSONからデータを抽出できませんでした'}), 400
            
            if not isinstance(data, list):
                return jsonify({'error': 'JSONデータは配列形式である必要があります'}), 400
            
            return jsonify({'success': True, 'data': data})
        except Exception as e:
            return jsonify({'error': f'JSONファイルの読み込みに失敗しました: {str(e)}'}), 400
    
    return jsonify({'error': '有効なJSONファイルを選択してください'}), 400

@app.route('/api/dify/fetch-data', methods=['POST'])
def fetch_data_from_dify():
    """Fetch data from Dify workflow using PNG file upload"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'ファイルが選択されていません'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'ファイルが選択されていません'}), 400
        
        if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            return jsonify({'error': 'PNG、JPG、またはJPEGファイルを選択してください'}), 400
        
        file.seek(0)  # Reset file pointer
        
        upload_files = {
            'file': (file.filename, file, file.content_type)
        }
        upload_data = {
            'user': 'purchases-maintenance-app'
        }
        
        print(f"DEBUG: Uploading file to Dify first")
        
        upload_response = requests.post(
            f"{DifyConfig.DIFY_API_BASE_URL}/v1/files/upload",
            headers={'Authorization': f'Bearer {DifyConfig.DIFY_API_KEY}'},
            files=upload_files,
            data=upload_data,
            timeout=30
        )
        
        print(f"DEBUG: Upload response status: {upload_response.status_code}")
        print(f"DEBUG: Upload response text: {upload_response.text}")
        
        if upload_response.status_code != 201:
            return jsonify({
                'error': f'Difyファイルアップロードエラー: {upload_response.status_code} - {upload_response.text}'
            }), 500
        
        upload_result = upload_response.json()
        file_id = upload_result.get('id')
        
        if not file_id:
            return jsonify({'error': 'ファイルアップロードからIDを取得できませんでした'}), 500
        
        file_extension = file.filename.lower().split('.')[-1] if file.filename else ''
        file_type = "image" if file_extension in ['png', 'jpg', 'jpeg'] else "file"
        
        workflow_payload = {
            "inputs": {
                "input_file": [{
                    "type": file_type,
                    "transfer_method": "local_file", 
                    "upload_file_id": file_id
                }]
            },
            "response_mode": "blocking",
            "user": "purchases-maintenance-app"
        }
        
        print(f"DEBUG: Executing workflow with file ID: {file_id}, file type: {file_type}")
        
        workflow_response = requests.post(
            DifyConfig.get_workflow_run_url(),
            headers=DifyConfig.get_headers(),
            json=workflow_payload,
            timeout=60
        )
        
        print(f"DEBUG: Workflow response status: {workflow_response.status_code}")
        
        if workflow_response.status_code != 200:
            print(f"DEBUG: Full workflow error response: {workflow_response.text}")
            return jsonify({
                'error': f'Difyワークフロー実行エラー: {workflow_response.status_code} - {workflow_response.text}'
            }), 500
        
        workflow_result = workflow_response.json()
        
        if 'data' in workflow_result and workflow_result['data'].get('status') == 'failed':
            error_msg = workflow_result['data'].get('error', 'Unknown workflow error')
            return jsonify({'error': f'Difyワークフロー実行失敗: {error_msg}'}), 500
        
        if 'data' in workflow_result and 'outputs' in workflow_result['data']:
            outputs = workflow_result['data']['outputs']
            
            if 'text' in outputs:
                text_data = outputs['text']
            else:
                return jsonify({'error': 'Difyワークフローから"text"キーが見つかりませんでした'}), 500
            
            try:
                if isinstance(text_data, str):
                    cleaned_text = text_data.strip()
                    if not cleaned_text or cleaned_text in ['[]', '[\n]', '[\n\n]']:
                        return jsonify({
                            'error': 'Difyから有効なデータが抽出されませんでした（画像に請求書データが含まれていない可能性があります）'
                        }), 500
                    
                    data = json.loads(cleaned_text)
                    if isinstance(data, list) and len(data) == 0:
                        return jsonify({
                            'error': 'Difyから有効なデータが抽出されませんでした（空の配列が返されました）'
                        }), 500
                else:
                    data = text_data
            except json.JSONDecodeError as e:
                return jsonify({'error': f'JSON解析エラー: {str(e)}'}), 500
            
            if not isinstance(data, list):
                return jsonify({'error': 'データは配列形式である必要があります'}), 400
            
            return jsonify({'success': True, 'data': data})
        else:
            return jsonify({'error': 'Difyワークフローの実行に失敗しました'}), 500
            
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Dify APIのタイムアウトが発生しました（60秒）'}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Dify API接続エラー: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'データ取得中にエラーが発生しました: {str(e)}'}), 500

@app.route('/api/dify/fetch-data-multiple', methods=['POST'])
def fetch_data_from_dify_multiple():
    """Fetch data from Dify workflow using multiple PNG file uploads"""
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'ファイルが選択されていません'}), 400
        
        files = request.files.getlist('files')
        if not files or len(files) == 0:
            return jsonify({'error': 'ファイルが選択されていません'}), 400
        
        all_data = []
        processed_count = 0
        errors = []
        
        for i, file in enumerate(files):
            if file.filename == '':
                continue
                
            if not file.filename.lower().endswith(('.png', '.jpg', '.jpeg')):
                errors.append(f'{file.filename}: PNG、JPG、またはJPEGファイルではありません')
                continue
            
            try:
                file.seek(0)
                
                upload_files = {
                    'file': (file.filename, file, file.content_type)
                }
                upload_data = {
                    'user': 'purchases-maintenance-app'
                }
                
                print(f"DEBUG: Uploading file {i+1}/{len(files)}: {file.filename}")
                
                upload_response = requests.post(
                    f"{DifyConfig.DIFY_API_BASE_URL}/v1/files/upload",
                    headers={'Authorization': f'Bearer {DifyConfig.DIFY_API_KEY}'},
                    files=upload_files,
                    data=upload_data,
                    timeout=30
                )
                
                print(f"DEBUG: Upload response status for {file.filename}: {upload_response.status_code}")
                
                if upload_response.status_code != 201:
                    errors.append(f'{file.filename}: アップロードエラー ({upload_response.status_code})')
                    continue
                
                upload_result = upload_response.json()
                file_id = upload_result.get('id')
                
                if not file_id:
                    errors.append(f'{file.filename}: ファイルIDの取得に失敗')
                    continue
                
                file_extension = file.filename.lower().split('.')[-1] if file.filename else ''
                file_type = "image" if file_extension in ['png', 'jpg', 'jpeg'] else "file"
                
                workflow_payload = {
                    "inputs": {
                        "input_file": [{
                            "type": file_type,
                            "transfer_method": "local_file", 
                            "upload_file_id": file_id
                        }]
                    },
                    "response_mode": "blocking",
                    "user": "purchases-maintenance-app"
                }
                
                print(f"DEBUG: Executing workflow for {file.filename} with file ID: {file_id}, file type: {file_type}")
                
                workflow_response = requests.post(
                    DifyConfig.get_workflow_run_url(),
                    headers=DifyConfig.get_headers(),
                    json=workflow_payload,
                    timeout=60
                )
                
                print(f"DEBUG: Workflow response status for {file.filename}: {workflow_response.status_code}")
                
                if workflow_response.status_code != 200:
                    error_detail = workflow_response.text if workflow_response.text else "Unknown error"
                    print(f"DEBUG: Full workflow error response for {file.filename}: {workflow_response.text}")
                    errors.append(f'{file.filename}: ワークフロー実行エラー ({workflow_response.status_code}): {error_detail}')
                    continue
                
                workflow_result = workflow_response.json()
                print(f"DEBUG: Workflow result status for {file.filename}: {workflow_result.get('data', {}).get('status', 'unknown')}")
                if 'data' in workflow_result and workflow_result['data'].get('status') == 'failed':
                    error_msg = workflow_result['data'].get('error', 'Unknown workflow error')
                    if 'Provided image is not valid' in error_msg:
                        errors.append(f'{file.filename}: 画像が無効です（画像形式またはファイルが破損している可能性があります）')
                    else:
                        errors.append(f'{file.filename}: Difyワークフロー実行失敗: {error_msg}')
                    continue
                
                if 'data' in workflow_result and 'outputs' in workflow_result['data']:
                    outputs = workflow_result['data']['outputs']
                    
                    if 'text' in outputs:
                        text_data = outputs['text']
                        
                        try:
                            if isinstance(text_data, str):
                                cleaned_text = text_data.strip()
                                if not cleaned_text or cleaned_text in ['[]', '[\n]', '[\n\n]']:
                                    errors.append(f'{file.filename}: Difyから有効なデータが抽出されませんでした（画像に請求書データが含まれていない可能性があります）')
                                    continue
                                
                                data = json.loads(cleaned_text)
                            else:
                                data = text_data
                            
                            if isinstance(data, list) and len(data) > 0:
                                all_data.extend(data)
                                processed_count += 1
                                print(f"DEBUG: Successfully processed {file.filename}, added {len(data)} records")
                            else:
                                errors.append(f'{file.filename}: Difyから有効なデータが抽出されませんでした（空の配列が返されました）')
                        except json.JSONDecodeError as e:
                            errors.append(f'{file.filename}: JSON解析エラー: {str(e)}')
                    else:
                        errors.append(f'{file.filename}: テキストデータが見つかりません')
                else:
                    errors.append(f'{file.filename}: ワークフロー結果の取得に失敗')
                    
            except Exception as e:
                errors.append(f'{file.filename}: {str(e)}')
        
        if processed_count == 0:
            return jsonify({'error': f'すべてのファイルの処理に失敗しました。エラー: {"; ".join(errors)}'}), 500
        
        result = {
            'success': True, 
            'data': all_data,
            'processed_count': processed_count,
            'total_count': len(files),
            'errors': errors
        }
        
        return jsonify(result)
        
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Dify APIのタイムアウトが発生しました（60秒）'}), 500
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Dify API接続エラー: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'複数ファイル処理中にエラーが発生しました: {str(e)}'}), 500

@app.route('/basic_info')
def basic_info():
    return render_template('basic_info.html')

@app.route('/parts_info/<int:basic_id>')
def parts_info(basic_id):
    return render_template('parts_info.html', basic_id=basic_id)

@app.route('/parts_info/pending')
def parts_info_pending():
    return render_template('parts_info_pending.html')

@app.route('/purchase_list')
def purchase_list():
    return render_template('purchase_list.html')

@app.route('/api/save_data', methods=['POST'])
def save_data():
    try:
        data = request.json
        conn = sqlite3.connect('purchases.db')
        cursor = conn.cursor()
        
        session_id = str(uuid.uuid4())
        
        for record in data:
            cursor.execute('''
                INSERT INTO basic_info 
                (page, shipment_date, order_number, delivery_number, person_in_charge, shipping_cost, total_amount, import_session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                record.get('ページ', ''),
                record['出荷日'],
                record['受注番号'],
                record['納入先番号'],
                record['担当者'],
                int(record['運賃']),
                int(record['税抜合計']),
                session_id
            ))
            
            basic_id = cursor.lastrowid
            
            parts_count = len(record['部品番号'])
            for i in range(parts_count):
                cursor.execute('''
                    INSERT INTO parts_info 
                    (basic_info_id, part_number, part_name, quantity, unit_price, sales_amount)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    basic_id,
                    record['部品番号'][i],
                    record['部品名'][i],
                    int(record['数量'][i]),
                    int(record['売上単価'][i]),
                    int(record['売上金額'][i])
                ))
        
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'session_id': session_id})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/basic_info')
def api_basic_info():
    conn = sqlite3.connect('purchases.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT import_session_id 
        FROM basic_info 
        ORDER BY created_at DESC 
        LIMIT 1
    ''')
    
    latest_session = cursor.fetchone()
    if not latest_session:
        conn.close()
        return jsonify([])
    
    latest_session_id = latest_session[0]
    
    cursor.execute('''
        SELECT b.id, b.page, b.shipment_date, b.order_number, b.delivery_number, b.person_in_charge, 
               b.shipping_cost, b.total_amount, b.created_at,
               COALESCE(SUM(p.sales_amount), 0) as parts_total
        FROM basic_info b
        LEFT JOIN parts_info p ON b.id = p.basic_info_id
        WHERE b.import_session_id = ?
        GROUP BY b.id, b.page, b.shipment_date, b.order_number, b.delivery_number, b.person_in_charge, 
                 b.shipping_cost, b.total_amount, b.created_at
        ORDER BY b.shipment_date DESC
    ''', (latest_session_id,))
    
    records = []
    for row in cursor.fetchall():
        parts_total = row[9]
        calculated_total = row[7] + parts_total
        records.append({
            'id': row[0],
            'ページ': row[1],
            'shipment_date': row[2],
            'order_number': row[3],
            'delivery_number': row[4],
            'person_in_charge': row[5],
            'shipping_cost': row[6],
            'parts_total': parts_total,
            'total_amount': calculated_total,
            'created_at': row[8]
        })
    
    conn.close()
    return jsonify(records)

@app.route('/api/purchase_list')
def api_purchase_list():
    conn = sqlite3.connect('purchases.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, page, shipment_date, order_number, delivery_number, person_in_charge, 
               shipping_cost, total_amount, created_at
        FROM basic_info 
        ORDER BY shipment_date DESC
    ''')
    
    records = []
    for row in cursor.fetchall():
        records.append({
            'id': row[0],
            'ページ': row[1],
            'shipment_date': row[2],
            'order_number': row[3],
            'delivery_number': row[4],
            'person_in_charge': row[5],
            'shipping_cost': row[6],
            'total_amount': row[7],
            'created_at': row[8]
        })
    
    conn.close()
    return jsonify(records)

@app.route('/api/parts_info/<int:basic_id>')
def api_parts_info(basic_id):
    conn = sqlite3.connect('purchases.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, part_number, part_name, quantity, unit_price, sales_amount
        FROM parts_info 
        WHERE basic_info_id = ?
    ''', (basic_id,))
    
    parts = []
    for row in cursor.fetchall():
        parts.append({
            'id': row[0],
            'part_number': row[1],
            'part_name': row[2],
            'quantity': row[3],
            'unit_price': row[4],
            'sales_amount': row[5]
        })
    
    conn.close()
    return jsonify(parts)

@app.route('/api/basic_info/<int:record_id>', methods=['PUT'])
def update_basic_info(record_id):
    try:
        data = request.json
        conn = sqlite3.connect('purchases.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE basic_info 
            SET page = ?, shipment_date = ?, order_number = ?, delivery_number = ?, 
                person_in_charge = ?, shipping_cost = ?, total_amount = ?
            WHERE id = ?
        ''', (
            data.get('page', ''),
            data['shipment_date'],
            data['order_number'],
            data['delivery_number'],
            data['person_in_charge'],
            int(data['shipping_cost']),
            int(data['total_amount']),
            record_id
        ))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'レコードが見つかりません'}), 404
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/basic_info/<int:record_id>', methods=['DELETE'])
def delete_basic_info(record_id):
    try:
        conn = sqlite3.connect('purchases.db')
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM parts_info WHERE basic_info_id = ?', (record_id,))
        
        cursor.execute('DELETE FROM basic_info WHERE id = ?', (record_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': 'レコードが見つかりません'}), 404
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/basic_info/delete/<int:record_id>', methods=['GET'])
def delete_basic_info_page(record_id):
    try:
        conn = sqlite3.connect('purchases.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM parts_info WHERE basic_info_id = ?', (record_id,))
        cursor.execute('DELETE FROM basic_info WHERE id = ?', (record_id,))
        conn.commit()
        conn.close()
        return redirect(url_for('basic_info'))
    except Exception as e:
        return redirect(url_for('basic_info'))

@app.route('/api/parts_info/<int:part_id>', methods=['PUT'])
def update_parts_info(part_id):
    try:
        data = request.json
        conn = sqlite3.connect('purchases.db')
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE parts_info 
            SET part_number = ?, part_name = ?, quantity = ?, 
                unit_price = ?, sales_amount = ?
            WHERE id = ?
        ''', (
            data['part_number'],
            data['part_name'],
            int(data['quantity']),
            int(data['unit_price']),
            int(data['sales_amount']),
            part_id
        ))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': '部品情報が見つかりません'}), 404
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/parts_info/<int:part_id>', methods=['DELETE'])
def delete_parts_info(part_id):
    try:
        conn = sqlite3.connect('purchases.db')
        cursor = conn.cursor()
        
        cursor.execute('DELETE FROM parts_info WHERE id = ?', (part_id,))
        
        if cursor.rowcount == 0:
            conn.close()
            return jsonify({'error': '部品情報が見つかりません'}), 404
        
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/delete_all_data', methods=['POST'])
def delete_all_data():
    try:
        conn = sqlite3.connect('purchases.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM parts_info')
        cursor.execute('DELETE FROM basic_info')
        conn.commit()
        conn.close()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=8001)
