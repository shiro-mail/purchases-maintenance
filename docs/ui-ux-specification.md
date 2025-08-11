# UI/UX仕様書
## 購入管理・保守管理システム

### 1. 概要

本文書では、購入管理・保守管理システムのユーザーインターフェース設計とユーザーエクスペリエンス要件を定義します。特に、新規要件である全選択/全解除チェックボックス機能の詳細仕様を含みます。

### 2. 全体設計方針

#### 2.1 デザイン原則
- **一貫性**: 全画面で統一されたUI要素とインタラクション
- **直感性**: ユーザーが迷わない明確なナビゲーション
- **効率性**: 最小限のクリックで目的を達成
- **アクセシビリティ**: キーボード操作とスクリーンリーダー対応

#### 2.2 レスポンシブデザイン
- **デスクトップ**: 1200px以上（メイン対象）
- **タブレット**: 768px-1199px（サブ対応）
- **モバイル**: 767px以下（基本機能のみ）

### 3. チェックボックス機能仕様

#### 3.1 マスターチェックボックス

**配置場所**: 基本情報一覧テーブルのヘッダー行、選択列

**機能仕様**:
```html
<th>
    <input type="checkbox" id="masterCheckbox" class="master-checkbox">
    <label for="masterCheckbox">選択</label>
</th>
```

**状態管理**:
- **未選択**: 全行チェックボックスが未選択
- **全選択**: 全行チェックボックスが選択済み
- **部分選択**: 一部の行チェックボックスが選択済み（中間状態表示）

**視覚的表現**:
```css
/* 未選択状態 */
.master-checkbox:not(:checked):not(:indeterminate) {
    background-color: #ffffff;
    border: 2px solid #cccccc;
}

/* 全選択状態 */
.master-checkbox:checked {
    background-color: #007bff;
    border: 2px solid #007bff;
}

/* 部分選択状態 */
.master-checkbox:indeterminate {
    background-color: #6c757d;
    border: 2px solid #6c757d;
}
```

#### 3.2 行チェックボックス

**配置場所**: 各データ行の選択列

**機能仕様**:
```html
<td>
    <input type="checkbox" class="row-checkbox" data-index="${idx}" data-id="${id}">
</td>
```

**連動動作**:
- 行チェックボックス変更時 → マスターチェックボックス状態更新
- マスターチェックボックス変更時 → 全行チェックボックス状態更新

#### 3.3 JavaScript実装仕様

**マスターチェックボックス制御**:
```javascript
function updateMasterCheckbox() {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
    const masterCheckbox = document.getElementById('masterCheckbox');
    
    if (checkedCount === 0) {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = false;
    } else if (checkedCount === rowCheckboxes.length) {
        masterCheckbox.checked = true;
        masterCheckbox.indeterminate = false;
    } else {
        masterCheckbox.checked = false;
        masterCheckbox.indeterminate = true;
    }
}
```

**全選択/全解除制御**:
```javascript
function toggleAllCheckboxes(checked) {
    const rowCheckboxes = document.querySelectorAll('.row-checkbox');
    rowCheckboxes.forEach(checkbox => {
        checkbox.checked = checked;
    });
    updateMasterCheckbox();
}
```

### 4. 基本情報一覧画面仕様

#### 4.1 テーブル構造

**表示項目順序**:
1. 選択（チェックボックス）
2. ページ
3. 出荷日
4. 受注番号
5. 納入先番号
6. 担当者
7. 運賃
8. 部品合計
9. 税抜合計
10. 部品詳細（リンク）
11. 操作（編集・削除）

**テーブルヘッダー**:
```html
<thead>
    <tr>
        <th>
            <input type="checkbox" id="masterCheckbox" class="master-checkbox">
            <label for="masterCheckbox">選択</label>
        </th>
        <th>ページ</th>
        <th>出荷日</th>
        <th>受注番号</th>
        <th>納入先番号</th>
        <th>担当者</th>
        <th>運賃</th>
        <th>部品合計</th>
        <th>税抜合計</th>
        <th>部品詳細</th>
        <th>操作</th>
    </tr>
</thead>
```

#### 4.2 データ行表示

**金額表示形式**:
- 運賃: ￥1,000 形式
- 部品合計: ￥10,000 形式
- 税抜合計: ￥11,000 形式

**日付表示形式**:
- 出荷日: YYYY/MM/DD 形式

**操作ボタン**:
- 編集ボタン: 黄色（btn-warning）
- 削除ボタン: 赤色（btn-danger）
- 部品詳細リンク: 青色（btn-info）

#### 4.3 一括操作エリア

**配置場所**: テーブル上部

**構成要素**:
```html
<div class="bulk-actions">
    <button id="refreshData" class="btn btn-primary">データ更新</button>
    <button id="saveSelected" class="btn btn-success" disabled>選択データを保存</button>
    <span id="selectedCount" class="selected-count">0件選択中</span>
</div>
```

**選択件数表示**:
- リアルタイム更新
- 「X件選択中」形式で表示
- 0件の場合は非表示

### 5. フォームバリデーション仕様

#### 5.1 入力値検証

**基本情報フィールド**:
- ページ: 任意入力、英数字
- 出荷日: 必須、日付形式（YYYY/MM/DD）
- 受注番号: 必須、英数字、最大50文字
- 納入先番号: 必須、英数字、最大50文字
- 担当者: 必須、日本語・英数字、最大100文字
- 運賃: 必須、数値、0以上

**エラー表示**:
```html
<div class="form-group">
    <label for="orderNumber">受注番号 <span class="required">*</span></label>
    <input type="text" id="orderNumber" name="order_number" required maxlength="50">
    <div class="error-message" id="orderNumberError"></div>
</div>
```

#### 5.2 リアルタイムバリデーション

**実装方式**:
- フォーカス離脱時（onblur）に検証実行
- エラーメッセージの即座表示
- 正常値入力時のエラーメッセージクリア

### 6. メッセージ表示仕様

#### 6.1 メッセージタイプ

**成功メッセージ**:
```css
.message.success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}
```

**エラーメッセージ**:
```css
.message.error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}
```

**警告メッセージ**:
```css
.message.warning {
    background-color: #fff3cd;
    color: #856404;
    border: 1px solid #ffeaa7;
}
```

**情報メッセージ**:
```css
.message.info {
    background-color: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}
```

#### 6.2 メッセージ表示制御

**自動消去**:
- 成功メッセージ: 3秒後に自動消去
- エラーメッセージ: 手動消去のみ
- 警告メッセージ: 5秒後に自動消去
- 情報メッセージ: 3秒後に自動消去

### 7. アクセシビリティ仕様

#### 7.1 キーボード操作

**チェックボックス操作**:
- Tab: 次のチェックボックスへ移動
- Space: チェックボックスの選択/解除
- Ctrl+A: 全選択（マスターチェックボックスにフォーカス時）

**テーブル操作**:
- 矢印キー: セル間移動
- Enter: 編集モード開始
- Escape: 編集モードキャンセル

#### 7.2 スクリーンリーダー対応

**ARIA属性**:
```html
<input type="checkbox" 
       id="masterCheckbox" 
       class="master-checkbox"
       aria-label="全選択/全解除"
       aria-describedby="selectionHelp">
<div id="selectionHelp" class="sr-only">
    チェックすると全ての行が選択されます
</div>
```

**状態通知**:
- 選択件数変更時の音声通知
- エラーメッセージの音声読み上げ
- 操作完了時の状態通知

### 8. パフォーマンス要件

#### 8.1 レスポンス時間
- チェックボックス操作: 100ms以内
- テーブル描画: 500ms以内（1000件まで）
- 一括操作: 2秒以内

#### 8.2 メモリ使用量
- DOM要素数の最適化
- イベントリスナーの適切な管理
- 不要なデータの定期的なクリア

### 9. ブラウザ対応

#### 9.1 対応ブラウザ
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

#### 9.2 フォールバック対応
- CSS Grid未対応時のFlexboxフォールバック
- JavaScript無効時の基本機能提供
- 古いブラウザでの機能制限通知

---

**作成日**: 2025年8月11日  
**バージョン**: 1.0  
**デザイナー**: UIチーム
