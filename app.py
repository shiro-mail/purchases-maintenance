from flask import Flask, render_template, request, jsonify, redirect, url_for
import sqlite3
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__)

def init_db():
    conn = sqlite3.connect('purchases.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS basic_info (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            
            return jsonify({'success': True, 'data': data})
        except Exception as e:
            return jsonify({'error': f'JSONファイルの読み込みに失敗しました: {str(e)}'}), 400
    
    return jsonify({'error': '有効なJSONファイルを選択してください'}), 400

@app.route('/basic_info')
def basic_info():
    return render_template('basic_info.html')

@app.route('/parts_info/<int:basic_id>')
def parts_info(basic_id):
    return render_template('parts_info.html', basic_id=basic_id)

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
                (shipment_date, order_number, delivery_number, person_in_charge, shipping_cost, total_amount, import_session_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
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
        SELECT id, shipment_date, order_number, delivery_number, person_in_charge, 
               shipping_cost, total_amount, created_at
        FROM basic_info 
        WHERE import_session_id = ?
        ORDER BY shipment_date DESC
    ''', (latest_session_id,))
    
    records = []
    for row in cursor.fetchall():
        records.append({
            'id': row[0],
            'shipment_date': row[1],
            'order_number': row[2],
            'delivery_number': row[3],
            'person_in_charge': row[4],
            'shipping_cost': row[5],
            'total_amount': row[6],
            'created_at': row[7]
        })
    
    conn.close()
    return jsonify(records)

@app.route('/api/purchase_list')
def api_purchase_list():
    conn = sqlite3.connect('purchases.db')
    cursor = conn.cursor()
    
    cursor.execute('''
        SELECT id, shipment_date, order_number, delivery_number, person_in_charge, 
               shipping_cost, total_amount, created_at
        FROM basic_info 
        ORDER BY shipment_date DESC
    ''')
    
    records = []
    for row in cursor.fetchall():
        records.append({
            'id': row[0],
            'shipment_date': row[1],
            'order_number': row[2],
            'delivery_number': row[3],
            'person_in_charge': row[4],
            'shipping_cost': row[5],
            'total_amount': row[6],
            'created_at': row[7]
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
            SET shipment_date = ?, order_number = ?, delivery_number = ?, 
                person_in_charge = ?, shipping_cost = ?, total_amount = ?
            WHERE id = ?
        ''', (
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

if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=8000)
