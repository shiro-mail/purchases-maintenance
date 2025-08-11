# データモデル仕様書
## 購入管理・保守管理システム

### 1. 概要

本文書では、購入管理・保守管理システムの統一データモデルを定義します。現在のSQLiteスキーマを基に、データ整合性とパフォーマンスを向上させた設計を提案します。

### 2. 現在のデータモデル分析

#### 2.1 basic_info テーブル
```sql
CREATE TABLE basic_info (
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
);
```

#### 2.2 parts_info テーブル
```sql
CREATE TABLE parts_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    basic_info_id INTEGER NOT NULL,
    part_number TEXT NOT NULL,
    part_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    sales_amount INTEGER NOT NULL,
    FOREIGN KEY (basic_info_id) REFERENCES basic_info (id)
);
```

### 3. 新データモデル設計

#### 3.1 基本情報エンティティ (basic_info)

**目的**: 購入・出荷の基本情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 一意識別子 |
| page | TEXT | NULL許可 | ページ番号 |
| shipment_date | DATE | NOT NULL | 出荷日 |
| order_number | VARCHAR(50) | NOT NULL, UNIQUE | 受注番号 |
| delivery_number | VARCHAR(50) | NOT NULL | 納入先番号 |
| person_in_charge | VARCHAR(100) | NOT NULL | 担当者名 |
| shipping_cost | DECIMAL(10,2) | NOT NULL, DEFAULT 0 | 運賃 |
| parts_total | DECIMAL(10,2) | GENERATED ALWAYS AS (計算式) | 部品合計（計算フィールド） |
| total_amount | DECIMAL(10,2) | GENERATED ALWAYS AS (shipping_cost + parts_total) | 税抜合計（計算フィールド） |
| import_session_id | VARCHAR(36) | NOT NULL | インポートセッションID |
| status | ENUM('pending', 'confirmed', 'completed') | NOT NULL, DEFAULT 'pending' | ステータス |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- `idx_order_number` ON (order_number)
- `idx_shipment_date` ON (shipment_date)
- `idx_import_session` ON (import_session_id)

#### 3.2 部品情報エンティティ (parts_info)

**目的**: 部品の詳細情報を管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | INTEGER | PRIMARY KEY, AUTOINCREMENT | 一意識別子 |
| basic_info_id | INTEGER | NOT NULL, FOREIGN KEY | 基本情報ID |
| part_number | VARCHAR(50) | NOT NULL | 部品番号 |
| part_name | VARCHAR(200) | NOT NULL | 部品名 |
| quantity | INTEGER | NOT NULL, CHECK (quantity > 0) | 数量 |
| unit_price | DECIMAL(10,2) | NOT NULL, CHECK (unit_price >= 0) | 売上単価 |
| sales_amount | DECIMAL(10,2) | GENERATED ALWAYS AS (quantity * unit_price) | 売上金額（計算フィールド） |
| created_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP ON UPDATE | 更新日時 |

**インデックス**:
- `idx_basic_info_id` ON (basic_info_id)
- `idx_part_number` ON (part_number)

**外部キー制約**:
- `fk_parts_basic_info` FOREIGN KEY (basic_info_id) REFERENCES basic_info(id) ON DELETE CASCADE

### 4. 計算フィールドの実装

#### 4.1 部品合計 (parts_total)
```sql
-- basic_infoテーブルでの計算フィールド定義
parts_total DECIMAL(10,2) GENERATED ALWAYS AS (
    (SELECT COALESCE(SUM(sales_amount), 0) 
     FROM parts_info 
     WHERE parts_info.basic_info_id = basic_info.id)
) STORED
```

#### 4.2 税抜合計 (total_amount)
```sql
-- basic_infoテーブルでの計算フィールド定義
total_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    shipping_cost + parts_total
) STORED
```

#### 4.3 売上金額 (sales_amount)
```sql
-- parts_infoテーブルでの計算フィールド定義
sales_amount DECIMAL(10,2) GENERATED ALWAYS AS (
    quantity * unit_price
) STORED
```

### 5. データバリデーション規則

#### 5.1 基本情報バリデーション
- **出荷日**: 有効な日付形式、未来日不可
- **受注番号**: 英数字のみ、重複不可
- **納入先番号**: 英数字のみ
- **担当者**: 日本語・英数字、最大100文字
- **運賃**: 0以上の数値

#### 5.2 部品情報バリデーション
- **部品番号**: 英数字・ハイフン、最大50文字
- **部品名**: 日本語・英数字、最大200文字
- **数量**: 1以上の整数
- **売上単価**: 0以上の数値

### 6. データ移行戦略

#### 6.1 現在データの移行
```sql
-- 既存データの移行スクリプト例
INSERT INTO new_basic_info (
    page, shipment_date, order_number, delivery_number,
    person_in_charge, shipping_cost, import_session_id,
    created_at
)
SELECT 
    page, shipment_date, order_number, delivery_number,
    person_in_charge, shipping_cost, import_session_id,
    created_at
FROM old_basic_info;
```

#### 6.2 データ整合性チェック
- 外部キー制約の確認
- 計算フィールドの値検証
- 重複データの検出・修正

### 7. パフォーマンス最適化

#### 7.1 インデックス戦略
- 検索頻度の高いカラムにインデックス作成
- 複合インデックスの検討（shipment_date + order_number）
- 定期的なインデックス統計の更新

#### 7.2 クエリ最適化
- 計算フィールドの事前計算（STORED）
- 適切なJOIN戦略
- ページネーション対応

### 8. セキュリティ考慮事項

#### 8.1 データ保護
- 個人情報の暗号化（担当者名）
- SQLインジェクション対策
- データアクセス権限の制御

#### 8.2 監査ログ
- データ変更履歴の記録
- アクセスログの保存
- 不正アクセスの検知

### 9. 将来拡張性

#### 9.1 スケーラビリティ
- PostgreSQL移行時の互換性確保
- 水平分割（シャーディング）対応
- レプリケーション対応

#### 9.2 機能拡張
- 承認ワークフロー対応
- 多言語対応
- API連携拡張

---

**作成日**: 2025年8月11日  
**バージョン**: 1.0  
**レビュー者**: システム設計チーム
