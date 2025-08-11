# アーキテクチャ仕様書
## 購入管理・保守管理システム

### 1. 概要

本文書では、購入管理・保守管理システムの統一アーキテクチャを定義します。現在の技術的負債を解消し、スケーラブルで保守性の高いシステム設計を提案します。

### 2. システム全体構成

#### 2.1 アーキテクチャ概要図

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Browser)     │    │   (Flask)       │    │   Services      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ • HTML/CSS/JS   │◄──►│ • REST API      │◄──►│ • Dify API      │
│ • Responsive    │    │ • Business      │    │ • File Storage  │
│ • SPA-like      │    │   Logic         │    │                 │
└─────────────────┘    │ • Data Access   │    └─────────────────┘
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Database      │
                       │   (SQLite)      │
                       ├─────────────────┤
                       │ • basic_info    │
                       │ • parts_info    │
                       │ • audit_log     │
                       └─────────────────┘
```

#### 2.2 技術スタック

**フロントエンド**:
- HTML5 + CSS3 + Vanilla JavaScript
- Bootstrap 5 (UIフレームワーク)
- Chart.js (将来のグラフ表示用)

**バックエンド**:
- Python 3.9+
- Flask 2.0+ (Webフレームワーク)
- SQLAlchemy (ORM)
- Marshmallow (シリアライゼーション)

**データベース**:
- SQLite (開発・小規模運用)
- PostgreSQL (将来の本格運用)

**外部連携**:
- Dify API (画像データ抽出)
- Requests (HTTP通信)

### 3. レイヤー構成

#### 3.1 プレゼンテーション層

**責務**:
- ユーザーインターフェースの提供
- ユーザー入力の受付と検証
- レスポンスデータの表示

**構成要素**:
```
frontend/
├── templates/          # Jinja2テンプレート
│   ├── base.html      # 共通レイアウト
│   ├── index.html     # メニュー画面
│   ├── import.html    # データ取込画面
│   ├── basic_info.html # 基本情報一覧
│   └── parts_info.html # 部品情報詳細
├── static/
│   ├── css/           # スタイルシート
│   ├── js/            # JavaScript
│   └── images/        # 画像ファイル
└── components/        # 再利用可能コンポーネント
```

#### 3.2 アプリケーション層

**責務**:
- ビジネスロジックの実装
- トランザクション管理
- 外部API連携

**構成要素**:
```python
# app/services/
class BasicInfoService:
    def create_basic_info(self, data: dict) -> BasicInfo:
        # ビジネスロジック実装
        pass
    
    def bulk_save(self, items: List[dict]) -> BulkSaveResult:
        # 一括保存処理
        pass

class DifyIntegrationService:
    def extract_data_from_image(self, file) -> List[dict]:
        # Dify API連携処理
        pass
```

#### 3.3 データアクセス層

**責務**:
- データベース操作の抽象化
- クエリの最適化
- データ整合性の確保

**構成要素**:
```python
# app/repositories/
class BasicInfoRepository:
    def find_by_id(self, id: int) -> Optional[BasicInfo]:
        pass
    
    def find_all_paginated(self, page: int, limit: int) -> PaginatedResult:
        pass
    
    def bulk_insert(self, items: List[BasicInfo]) -> List[int]:
        pass
```

### 4. データフロー設計

#### 4.1 データ取込フロー

```
[ファイル選択] → [アップロード] → [データ解析] → [バリデーション] → [プレビュー] → [保存]
      │              │              │              │              │           │
      ▼              ▼              ▼              ▼              ▼           ▼
   Frontend     Flask Route    Service Layer   Validation    Frontend    Database
```

**詳細処理**:
1. **ファイル選択**: フロントエンドでファイル選択
2. **アップロード**: Flask routeでファイル受信
3. **データ解析**: Service layerでJSON/PNG解析
4. **バリデーション**: データ形式・内容の検証
5. **プレビュー**: フロントエンドで確認画面表示
6. **保存**: ユーザー確認後にデータベース保存

#### 4.2 チェックボックス操作フロー

```
[マスターチェック] → [状態更新] → [行チェック連動] → [選択件数更新] → [保存ボタン制御]
        │               │              │                │                │
        ▼               ▼              ▼                ▼                ▼
   JavaScript      State Update   DOM Manipulation   UI Update      Button State
```

### 5. エラーハンドリング戦略

#### 5.1 統一エラーハンドリング

**Flask Error Handler**:
```python
@app.errorhandler(ValidationError)
def handle_validation_error(error):
    return jsonify({
        'success': False,
        'error': {
            'code': 'VALIDATION_ERROR',
            'message': str(error),
            'details': error.details if hasattr(error, 'details') else []
        },
        'timestamp': datetime.utcnow().isoformat()
    }), 400
```

**JavaScript Error Handler**:
```javascript
class ErrorHandler {
    static handle(error, context = '') {
        console.error(`Error in ${context}:`, error);
        
        const message = error.response?.data?.error?.message || 
                       error.message || 
                       '予期しないエラーが発生しました';
        
        showMessage(message, 'error');
    }
}
```

#### 5.2 エラー分類

| レベル | 種類 | 処理方法 |
|--------|------|----------|
| INFO | 正常処理完了 | ユーザー通知 |
| WARNING | 軽微な問題 | ユーザー警告 |
| ERROR | 処理失敗 | エラーメッセージ表示 |
| CRITICAL | システム障害 | ログ記録 + 管理者通知 |

### 6. セキュリティアーキテクチャ

#### 6.1 セキュリティ層

```
┌─────────────────────────────────────────┐
│           Security Layer                │
├─────────────────────────────────────────┤
│ • Input Validation                      │
│ • SQL Injection Prevention             │
│ • XSS Protection                       │
│ • File Upload Security                 │
│ • Rate Limiting                        │
└─────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────┐
│         Application Layer               │
└─────────────────────────────────────────┘
```

**実装例**:
```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app,
    key_func=get_remote_address,
    default_limits=["1000 per hour"]
)

@app.route('/api/upload', methods=['POST'])
@limiter.limit("10 per minute")
def upload_file():
    # ファイルアップロード処理
    pass
```

#### 6.2 データ保護

**暗号化**:
- 個人情報の暗号化保存
- 通信データのHTTPS暗号化
- APIキーの環境変数管理

**アクセス制御**:
- IPアドレス制限
- セッション管理
- CSRF対策

### 7. パフォーマンス最適化

#### 7.1 データベース最適化

**インデックス戦略**:
```sql
-- 検索頻度の高いカラムにインデックス
CREATE INDEX idx_basic_info_order_number ON basic_info(order_number);
CREATE INDEX idx_basic_info_shipment_date ON basic_info(shipment_date);
CREATE INDEX idx_parts_info_basic_id ON parts_info(basic_info_id);

-- 複合インデックス
CREATE INDEX idx_basic_info_date_order ON basic_info(shipment_date, order_number);
```

**クエリ最適化**:
```python
# N+1問題の回避
def get_basic_info_with_parts(basic_id: int):
    return db.session.query(BasicInfo)\
        .options(joinedload(BasicInfo.parts))\
        .filter(BasicInfo.id == basic_id)\
        .first()
```

#### 7.2 フロントエンド最適化

**JavaScript最適化**:
```javascript
// デバウンス処理
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 検索処理のデバウンス
const debouncedSearch = debounce(performSearch, 300);
```

**DOM操作最適化**:
```javascript
// 仮想スクロール（大量データ対応）
class VirtualTable {
    constructor(container, data, rowHeight = 40) {
        this.container = container;
        this.data = data;
        this.rowHeight = rowHeight;
        this.visibleRows = Math.ceil(container.clientHeight / rowHeight) + 2;
    }
    
    render(startIndex) {
        // 表示範囲のみレンダリング
    }
}
```

### 8. 監視・ログ設計

#### 8.1 ログ設計

**ログレベル**:
```python
import logging

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('app.log'),
        logging.StreamHandler()
    ]
)

# 構造化ログ
logger = logging.getLogger(__name__)

def log_api_call(endpoint, method, status, response_time):
    logger.info({
        'event': 'api_call',
        'endpoint': endpoint,
        'method': method,
        'status': status,
        'response_time': response_time,
        'timestamp': datetime.utcnow().isoformat()
    })
```

#### 8.2 メトリクス収集

**パフォーマンスメトリクス**:
- レスポンス時間
- スループット
- エラー率
- リソース使用率

**ビジネスメトリクス**:
- データ取込件数
- 処理成功率
- ユーザー操作頻度

### 9. デプロイメント設計

#### 9.1 環境構成

**開発環境**:
```
Development
├── SQLite Database
├── Flask Development Server
├── Hot Reload
└── Debug Mode
```

**本番環境**:
```
Production
├── PostgreSQL Database
├── Gunicorn WSGI Server
├── Nginx Reverse Proxy
└── SSL/TLS Termination
```

#### 9.2 CI/CD パイプライン

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Tests
        run: python -m pytest
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: ./deploy.sh
```

### 10. 将来拡張性

#### 10.1 マイクロサービス移行準備

**サービス分割案**:
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Import        │  │   Basic Info    │  │   Parts         │
│   Service       │  │   Service       │  │   Service       │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • File Upload   │  │ • CRUD          │  │ • CRUD          │
│ • Data Parse    │  │ • Validation    │  │ • Calculation   │
│ • Dify API      │  │ • Business      │  │ • Inventory     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

#### 10.2 技術スタック移行

**フロントエンド現代化**:
- Vanilla JS → React/Vue.js
- Bootstrap → Tailwind CSS
- REST API → GraphQL

**バックエンド強化**:
- Flask → FastAPI
- SQLite → PostgreSQL
- 同期処理 → 非同期処理

---

**作成日**: 2025年8月11日  
**バージョン**: 1.0  
**アーキテクト**: システム設計チーム
