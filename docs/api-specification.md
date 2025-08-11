# API仕様書
## 購入管理・保守管理システム

### 1. 概要

本文書では、購入管理・保守管理システムのREST API仕様を定義します。統一されたレスポンス形式とエラーハンドリング戦略により、フロントエンドとバックエンドの整合性を確保します。

### 2. 共通仕様

#### 2.1 ベースURL
```
http://localhost:5000/api
```

#### 2.2 共通ヘッダー
```http
Content-Type: application/json
Accept: application/json
```

#### 2.3 統一レスポンス形式

**成功レスポンス**:
```json
{
    "success": true,
    "data": {
        // レスポンスデータ
    },
    "message": "操作が正常に完了しました",
    "timestamp": "2025-08-11T10:35:02Z"
}
```

**エラーレスポンス**:
```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "入力値に誤りがあります",
        "details": [
            {
                "field": "order_number",
                "message": "受注番号は必須です"
            }
        ]
    },
    "timestamp": "2025-08-11T10:35:02Z"
}
```

#### 2.4 HTTPステータスコード

| コード | 説明 | 使用場面 |
|--------|------|----------|
| 200 | OK | 正常処理完了 |
| 201 | Created | リソース作成成功 |
| 400 | Bad Request | 入力値エラー |
| 404 | Not Found | リソース未発見 |
| 500 | Internal Server Error | サーバー内部エラー |

### 3. データ取込API

#### 3.1 JSONファイルアップロード

**エンドポイント**: `POST /upload`

**リクエスト**:
```http
POST /api/upload
Content-Type: multipart/form-data

file: [JSONファイル]
```

**レスポンス**:
```json
{
    "success": true,
    "data": [
        {
            "ページ": "1",
            "出荷日": "2025/08/01",
            "受注番号": "1234567",
            "納入先番号": "00000000",
            "担当者": "田中",
            "運賃": 0,
            "部品合計": 100,
            "税抜合計": 100,
            "部品番号": ["123456-7890"],
            "部品名": ["パッキン"],
            "数量": [1],
            "売上単価": [100],
            "売上金額": [100]
        }
    ],
    "message": "ファイルの読み込みが完了しました"
}
```

#### 3.2 PNG画像アップロード（Dify API連携）

**エンドポイント**: `POST /dify/fetch-data`

**リクエスト**:
```http
POST /api/dify/fetch-data
Content-Type: multipart/form-data

file: [PNGファイル]
```

**レスポンス**:
```json
{
    "success": true,
    "data": [
        {
            // JSONファイルアップロードと同じ形式
        }
    ],
    "message": "画像からのデータ抽出が完了しました"
}
```

#### 3.3 複数PNG画像アップロード

**エンドポイント**: `POST /dify/fetch-data-multiple`

**リクエスト**:
```http
POST /api/dify/fetch-data-multiple
Content-Type: multipart/form-data

files: [PNGファイル配列]
```

### 4. 基本情報管理API

#### 4.1 基本情報一覧取得

**エンドポイント**: `GET /basic_info`

**クエリパラメータ**:
```
?page=1&limit=50&sort=order_number&order=desc&filter=pending
```

**レスポンス**:
```json
{
    "success": true,
    "data": {
        "items": [
            {
                "id": 1,
                "page": "1",
                "shipment_date": "2025-08-01",
                "order_number": "1234567",
                "delivery_number": "00000000",
                "person_in_charge": "田中",
                "shipping_cost": 0,
                "parts_total": 100,
                "total_amount": 100,
                "status": "pending",
                "created_at": "2025-08-11T10:35:02Z"
            }
        ],
        "pagination": {
            "current_page": 1,
            "total_pages": 10,
            "total_items": 500,
            "items_per_page": 50
        }
    }
}
```

#### 4.2 基本情報一括保存

**エンドポイント**: `POST /save_data`

**リクエスト**:
```json
{
    "items": [
        {
            "ページ": "1",
            "出荷日": "2025/08/01",
            "受注番号": "1234567",
            "納入先番号": "00000000",
            "担当者": "田中",
            "運賃": 0,
            "税抜合計": 100,
            "部品番号": ["123456-7890"],
            "部品名": ["パッキン"],
            "数量": [1],
            "売上単価": [100],
            "売上金額": [100]
        }
    ]
}
```

**レスポンス**:
```json
{
    "success": true,
    "data": {
        "saved_count": 1,
        "failed_count": 0,
        "saved_ids": [1]
    },
    "message": "1件のデータを保存しました"
}
```

#### 4.3 基本情報更新

**エンドポイント**: `PUT /basic_info/{id}`

**リクエスト**:
```json
{
    "page": "1",
    "shipment_date": "2025-08-01",
    "order_number": "1234567",
    "delivery_number": "00000000",
    "person_in_charge": "田中",
    "shipping_cost": 0
}
```

#### 4.4 基本情報削除

**エンドポイント**: `DELETE /basic_info/{id}`

**レスポンス**:
```json
{
    "success": true,
    "message": "基本情報を削除しました"
}
```

#### 4.5 一括削除

**エンドポイント**: `DELETE /basic_info/bulk`

**リクエスト**:
```json
{
    "ids": [1, 2, 3, 4, 5]
}
```

**レスポンス**:
```json
{
    "success": true,
    "data": {
        "deleted_count": 5
    },
    "message": "5件のデータを削除しました"
}
```

### 5. 部品情報管理API

#### 5.1 部品情報取得

**エンドポイント**: `GET /parts_info/{basic_id}`

**レスポンス**:
```json
{
    "success": true,
    "data": [
        {
            "id": 1,
            "basic_info_id": 1,
            "part_number": "123456-7890",
            "part_name": "パッキン",
            "quantity": 1,
            "unit_price": 100,
            "sales_amount": 100
        }
    ]
}
```

#### 5.2 部品情報更新

**エンドポイント**: `PUT /parts_info/{id}`

**リクエスト**:
```json
{
    "part_number": "123456-7890",
    "part_name": "パッキン",
    "quantity": 2,
    "unit_price": 150
}
```

#### 5.3 部品情報削除

**エンドポイント**: `DELETE /parts_info/{id}`

### 6. 仕入一覧API

#### 6.1 仕入一覧取得

**エンドポイント**: `GET /purchase_list`

**クエリパラメータ**:
```
?page=1&limit=50&search=田中&date_from=2025-08-01&date_to=2025-08-31
```

**レスポンス**:
```json
{
    "success": true,
    "data": {
        "items": [
            {
                "id": 1,
                "page": "1",
                "shipment_date": "2025-08-01",
                "order_number": "1234567",
                "delivery_number": "00000000",
                "person_in_charge": "田中",
                "shipping_cost": 0,
                "parts_total": 100,
                "total_amount": 100,
                "parts_count": 1
            }
        ],
        "pagination": {
            "current_page": 1,
            "total_pages": 10,
            "total_items": 500,
            "items_per_page": 50
        }
    }
}
```

### 7. エラーハンドリング仕様

#### 7.1 エラーコード定義

| コード | 説明 | HTTPステータス |
|--------|------|----------------|
| VALIDATION_ERROR | 入力値検証エラー | 400 |
| NOT_FOUND | リソース未発見 | 404 |
| DUPLICATE_ERROR | 重複エラー | 409 |
| DIFY_API_ERROR | Dify API連携エラー | 500 |
| DATABASE_ERROR | データベースエラー | 500 |
| INTERNAL_ERROR | 内部エラー | 500 |

#### 7.2 バリデーションエラー詳細

**フィールド別エラーメッセージ**:
```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "入力値に誤りがあります",
        "details": [
            {
                "field": "shipment_date",
                "message": "出荷日は有効な日付形式で入力してください",
                "value": "invalid-date"
            },
            {
                "field": "order_number",
                "message": "受注番号は50文字以内で入力してください",
                "value": "very-long-order-number..."
            }
        ]
    }
}
```

### 8. セキュリティ仕様

#### 8.1 入力値検証
- SQLインジェクション対策
- XSS対策
- ファイルアップロード制限

#### 8.2 レート制限
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1628678400
```

#### 8.3 CORS設定
```http
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
```

### 9. パフォーマンス仕様

#### 9.1 レスポンス時間目標
- 単純取得: 200ms以内
- 一覧取得: 500ms以内
- 一括処理: 2秒以内
- Dify API連携: 30秒以内

#### 9.2 ページネーション
- デフォルト件数: 50件
- 最大件数: 1000件
- カーソルベースページング対応

### 10. 監視・ログ仕様

#### 10.1 アクセスログ
```json
{
    "timestamp": "2025-08-11T10:35:02Z",
    "method": "POST",
    "path": "/api/save_data",
    "status": 200,
    "response_time": 150,
    "user_agent": "Mozilla/5.0...",
    "ip_address": "192.168.1.100"
}
```

#### 10.2 エラーログ
```json
{
    "timestamp": "2025-08-11T10:35:02Z",
    "level": "ERROR",
    "message": "Database connection failed",
    "error_code": "DATABASE_ERROR",
    "stack_trace": "...",
    "request_id": "req-123456"
}
```

---

**作成日**: 2025年8月11日  
**バージョン**: 1.0  
**API設計者**: バックエンドチーム
