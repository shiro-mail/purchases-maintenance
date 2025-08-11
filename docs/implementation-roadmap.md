# 実装ロードマップ
## 購入管理・保守管理システム 仕様固定アプローチ

### 1. 概要

本文書では、仕様固定アプローチによる購入管理・保守管理システムの実装計画を定義します。Phase 1で策定した要件定義に基づき、段階的な実装スケジュールと成功基準を明確化します。

### 2. 実装方針

#### 2.1 仕様固定アプローチの適用
- **Phase 1**: 完全な要件定義・設計完了後に実装開始
- **Phase 2**: 統一されたアーキテクチャによる一括実装
- **Phase 3**: 包括的テスト・検証による品質確保

#### 2.2 技術的負債解消戦略
- 現在の分散したエラーハンドリングを統一
- データ変換ロジックの複雑性を解消
- フロントエンド・バックエンド間のデータ整合性確保

### 3. Phase 2: 実装フェーズ

#### 3.1 Phase 2-1: コアシステム再構築 (2週間)

**目標**: 統一されたデータモデルとAPI基盤の構築

**実装内容**:

**データベース層**:
```sql
-- 新データモデルの実装
CREATE TABLE basic_info_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT,
    shipment_date DATE NOT NULL,
    order_number VARCHAR(50) NOT NULL UNIQUE,
    delivery_number VARCHAR(50) NOT NULL,
    person_in_charge VARCHAR(100) NOT NULL,
    shipping_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    parts_total DECIMAL(10,2) GENERATED ALWAYS AS (
        (SELECT COALESCE(SUM(sales_amount), 0) 
         FROM parts_info_v2 
         WHERE parts_info_v2.basic_info_id = basic_info_v2.id)
    ) STORED,
    total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
        shipping_cost + parts_total
    ) STORED,
    import_session_id VARCHAR(36) NOT NULL,
    status ENUM('pending', 'confirmed', 'completed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE
);
```

**API層統一**:
```python
# app/api/base.py
class BaseAPI:
    def __init__(self):
        self.validator = DataValidator()
        self.error_handler = ErrorHandler()
    
    def standardize_response(self, data=None, message="", success=True):
        return {
            'success': success,
            'data': data,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }

# app/api/basic_info.py
class BasicInfoAPI(BaseAPI):
    def create(self, data):
        try:
            validated_data = self.validator.validate_basic_info(data)
            result = self.service.create_basic_info(validated_data)
            return self.standardize_response(result, "基本情報を作成しました")
        except ValidationError as e:
            return self.error_handler.handle_validation_error(e)
```

**成功基準**:
- [ ] 新データモデルでの CRUD 操作完了
- [ ] 統一 API レスポンス形式の実装
- [ ] 計算フィールド（部品合計・税抜合計）の正確な動作
- [ ] 既存データの新モデルへの移行完了

#### 3.2 Phase 2-2: チェックボックス機能実装 (1週間)

**目標**: 全選択/全解除チェックボックス機能の完全実装

**実装内容**:

**HTML構造**:
```html
<!-- templates/basic_info_v3.html -->
<table class="data-table">
    <thead>
        <tr>
            <th class="checkbox-column">
                <div class="checkbox-container">
                    <input type="checkbox" 
                           id="masterCheckbox" 
                           class="master-checkbox"
                           aria-label="全選択/全解除">
                    <label for="masterCheckbox">選択</label>
                </div>
            </th>
            <th>ページ</th>
            <th>出荷日</th>
            <!-- 他のヘッダー -->
        </tr>
    </thead>
    <tbody id="dataTableBody">
        <!-- 動的生成される行 -->
    </tbody>
</table>

<div class="bulk-actions">
    <span id="selectedCount" class="selected-count">0件選択中</span>
    <button id="saveSelected" class="btn btn-success" disabled>
        選択データを保存
    </button>
</div>
```

**JavaScript実装**:
```javascript
// static/js/checkbox_manager.js
class CheckboxManager {
    constructor(tableSelector) {
        this.table = document.querySelector(tableSelector);
        this.masterCheckbox = document.getElementById('masterCheckbox');
        this.selectedCountElement = document.getElementById('selectedCount');
        this.saveButton = document.getElementById('saveSelected');
        
        this.init();
    }
    
    init() {
        this.masterCheckbox.addEventListener('change', (e) => {
            this.toggleAllCheckboxes(e.target.checked);
        });
        
        this.table.addEventListener('change', (e) => {
            if (e.target.classList.contains('row-checkbox')) {
                this.updateMasterCheckboxState();
                this.updateSelectedCount();
                this.updateSaveButtonState();
            }
        });
    }
    
    toggleAllCheckboxes(checked) {
        const rowCheckboxes = this.table.querySelectorAll('.row-checkbox');
        rowCheckboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
        this.updateSelectedCount();
        this.updateSaveButtonState();
    }
    
    updateMasterCheckboxState() {
        const rowCheckboxes = this.table.querySelectorAll('.row-checkbox');
        const checkedCount = this.table.querySelectorAll('.row-checkbox:checked').length;
        
        if (checkedCount === 0) {
            this.masterCheckbox.checked = false;
            this.masterCheckbox.indeterminate = false;
        } else if (checkedCount === rowCheckboxes.length) {
            this.masterCheckbox.checked = true;
            this.masterCheckbox.indeterminate = false;
        } else {
            this.masterCheckbox.checked = false;
            this.masterCheckbox.indeterminate = true;
        }
    }
    
    updateSelectedCount() {
        const checkedCount = this.table.querySelectorAll('.row-checkbox:checked').length;
        this.selectedCountElement.textContent = `${checkedCount}件選択中`;
        this.selectedCountElement.style.display = checkedCount > 0 ? 'inline' : 'none';
    }
    
    updateSaveButtonState() {
        const checkedCount = this.table.querySelectorAll('.row-checkbox:checked').length;
        this.saveButton.disabled = checkedCount === 0;
    }
    
    getSelectedIds() {
        return Array.from(this.table.querySelectorAll('.row-checkbox:checked'))
            .map(checkbox => parseInt(checkbox.dataset.id));
    }
}
```

**CSS実装**:
```css
/* static/css/checkbox.css */
.checkbox-column {
    width: 80px;
    text-align: center;
}

.checkbox-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.master-checkbox,
.row-checkbox {
    width: 18px;
    height: 18px;
    cursor: pointer;
}

.master-checkbox:indeterminate {
    background-color: #6c757d;
    border-color: #6c757d;
}

.selected-count {
    font-weight: bold;
    color: #007bff;
    margin-right: 16px;
}

.bulk-actions {
    margin: 16px 0;
    padding: 12px;
    background-color: #f8f9fa;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}
```

**成功基準**:
- [ ] マスターチェックボックスによる全選択/全解除機能
- [ ] 部分選択時の中間状態表示
- [ ] 選択件数のリアルタイム更新
- [ ] 保存ボタンの状態連動
- [ ] キーボード操作対応（Tab, Space, Ctrl+A）

#### 3.3 Phase 2-3: データ取込機能強化 (1週間)

**目標**: 統一されたデータ取込処理とエラーハンドリング

**実装内容**:

**統一データ変換サービス**:
```python
# app/services/data_import_service.py
class DataImportService:
    def __init__(self):
        self.validator = DataValidator()
        self.transformer = DataTransformer()
    
    def process_json_file(self, file) -> ImportResult:
        try:
            raw_data = self._read_json_file(file)
            normalized_data = self.transformer.normalize_json_data(raw_data)
            validated_data = self.validator.validate_import_data(normalized_data)
            
            return ImportResult(
                success=True,
                data=validated_data,
                message=f"{len(validated_data)}件のデータを読み込みました"
            )
        except Exception as e:
            return ImportResult(
                success=False,
                error=str(e),
                message="ファイルの読み込みに失敗しました"
            )
    
    def process_dify_images(self, files) -> ImportResult:
        try:
            extracted_data = []
            for file in files:
                result = self.dify_service.extract_data(file)
                extracted_data.extend(result)
            
            normalized_data = self.transformer.normalize_dify_data(extracted_data)
            validated_data = self.validator.validate_import_data(normalized_data)
            
            return ImportResult(
                success=True,
                data=validated_data,
                message=f"{len(validated_data)}件のデータを抽出しました"
            )
        except DifyAPIError as e:
            return ImportResult(
                success=False,
                error=f"DIFY_API_ERROR: {str(e)}",
                message="画像からのデータ抽出に失敗しました"
            )
```

**統一バリデーション**:
```python
# app/validators/data_validator.py
class DataValidator:
    def validate_basic_info(self, data: dict) -> dict:
        errors = []
        
        # 必須フィールドチェック
        required_fields = ['出荷日', '受注番号', '納入先番号', '担当者']
        for field in required_fields:
            if not data.get(field):
                errors.append(ValidationError(field, f"{field}は必須です"))
        
        # 日付形式チェック
        if data.get('出荷日'):
            try:
                datetime.strptime(data['出荷日'], '%Y/%m/%d')
            except ValueError:
                errors.append(ValidationError('出荷日', '有効な日付形式で入力してください'))
        
        # 数値チェック
        numeric_fields = ['運賃', '税抜合計']
        for field in numeric_fields:
            if data.get(field) is not None:
                try:
                    float(data[field])
                except (ValueError, TypeError):
                    errors.append(ValidationError(field, f"{field}は数値で入力してください"))
        
        if errors:
            raise ValidationException(errors)
        
        return data
```

**成功基準**:
- [ ] JSON・PNG両形式の統一処理
- [ ] 包括的なデータバリデーション
- [ ] 詳細なエラーメッセージ表示
- [ ] プレビュー機能の安定動作

### 4. Phase 3: テスト・検証フェーズ (1週間)

#### 4.1 自動テスト実装

**単体テスト**:
```python
# tests/test_basic_info_service.py
class TestBasicInfoService:
    def test_create_basic_info_success(self):
        service = BasicInfoService()
        data = {
            '出荷日': '2025/08/01',
            '受注番号': '1234567',
            '納入先番号': '00000000',
            '担当者': '田中',
            '運賃': 0
        }
        
        result = service.create_basic_info(data)
        
        assert result.success == True
        assert result.data.order_number == '1234567'
    
    def test_checkbox_functionality(self):
        # チェックボックス機能のテスト
        pass
```

**統合テスト**:
```python
# tests/test_integration.py
class TestDataImportIntegration:
    def test_json_upload_to_database(self):
        # JSONアップロード→データベース保存の統合テスト
        pass
    
    def test_dify_api_integration(self):
        # Dify API連携の統合テスト
        pass
```

#### 4.2 ユーザビリティテスト

**テストシナリオ**:
1. **データ取込シナリオ**:
   - JSONファイルアップロード
   - PNG画像アップロード
   - エラーファイルの処理

2. **チェックボックス操作シナリオ**:
   - 全選択/全解除操作
   - 部分選択状態の確認
   - 一括保存操作

3. **データ管理シナリオ**:
   - 基本情報の編集・削除
   - 部品情報の詳細表示
   - 検索・フィルタリング

**成功基準**:
- [ ] 全テストケースの合格
- [ ] レスポンス時間要件の達成
- [ ] エラーハンドリングの適切な動作
- [ ] ユーザビリティ要件の満足

### 5. Phase 4: 本番リリース準備 (3日間)

#### 4.1 データ移行

**移行スクリプト**:
```python
# scripts/migrate_data.py
def migrate_existing_data():
    # 既存データの新モデルへの移行
    old_records = db.session.query(OldBasicInfo).all()
    
    for old_record in old_records:
        new_record = BasicInfo(
            page=old_record.page,
            shipment_date=old_record.shipment_date,
            order_number=old_record.order_number,
            # ... 他のフィールド
        )
        db.session.add(new_record)
    
    db.session.commit()
```

#### 4.2 本番環境設定

**環境設定**:
```bash
# production.env
FLASK_ENV=production
DATABASE_URL=postgresql://user:pass@localhost/purchases_db
DIFY_API_KEY=prod_api_key
SECRET_KEY=production_secret_key
```

**デプロイメント**:
```bash
# deploy.sh
#!/bin/bash
git pull origin main
pip install -r requirements.txt
flask db upgrade
systemctl restart purchases-app
systemctl restart nginx
```

### 6. 成功基準・検証項目

#### 6.1 機能要件
- [ ] 全選択/全解除チェックボックス機能の完全動作
- [ ] 部品合計・税抜合計の正確な計算表示
- [ ] JSONファイル取込の安定動作
- [ ] PNG画像取込（Dify API）の安定動作
- [ ] データ整合性の確保

#### 6.2 非機能要件
- [ ] レスポンス時間: 通常操作 < 2秒
- [ ] エラー率: < 1%
- [ ] 可用性: 99%以上
- [ ] セキュリティ要件の満足

#### 6.3 技術要件
- [ ] 統一されたエラーハンドリング
- [ ] 一貫したAPIレスポンス形式
- [ ] コードカバレッジ 80%以上
- [ ] 技術的負債の解消

### 7. リスク管理

#### 7.1 技術リスク
- **Dify API障害**: フォールバック機能の実装
- **データ移行失敗**: ロールバック手順の準備
- **パフォーマンス劣化**: 負荷テストの実施

#### 7.2 スケジュールリスク
- **要件変更**: 変更管理プロセスの確立
- **テスト期間不足**: 自動テストの充実
- **リソース不足**: 優先度の明確化

### 8. 完了条件

#### 8.1 Phase 2完了条件
- 全機能要件の実装完了
- 単体テスト・統合テストの合格
- コードレビューの完了
- ドキュメントの更新

#### 8.2 プロジェクト完了条件
- 本番環境での安定動作確認
- ユーザー受け入れテストの合格
- 運用手順書の作成
- 保守体制の確立

---

**作成日**: 2025年8月11日  
**バージョン**: 1.0  
**プロジェクトマネージャー**: 開発チーム
