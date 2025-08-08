onDOMReady(() => {
    const tableContainer = document.getElementById('partsInfoTable');
    
    loadPartsInfo();
    
    async function loadPartsInfo() {
        try {
            tableContainer.innerHTML = '<div class="loading">データを読み込み中...</div>';
            
            const data = await apiCall(`/api/parts_info/${basicId}`);
            
            if (data.length === 0) {
                tableContainer.innerHTML = '<div class="empty-state">部品情報がありません</div>';
                return;
            }
            
            displayPartsInfo(data);
        } catch (error) {
            tableContainer.innerHTML = '<div class="empty-state">データの読み込みに失敗しました</div>';
            console.error('Load error:', error);
        }
    }
    
    function displayPartsInfo(data) {
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>部品番号</th>
                        <th>部品名</th>
                        <th>数量</th>
                        <th>売上単価</th>
                        <th>売上金額</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(part => {
            html += `
                <tr>
                    <td>${part.part_number}</td>
                    <td>${part.part_name}</td>
                    <td>${part.quantity}</td>
                    <td>${formatCurrency(part.unit_price)}</td>
                    <td>${formatCurrency(part.sales_amount)}</td>
                    <td>
                        <button onclick="editPart(${part.id})" class="btn btn-secondary">編集</button>
                        <button onclick="deletePart(${part.id})" class="btn btn-secondary">削除</button>
                    </td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = html;
    }
    
    window.editPart = function(id) {
        alert('編集機能は今後実装予定です');
    };
    
    window.deletePart = function(id) {
        if (confirm('この部品情報を削除しますか？')) {
            alert('削除機能は今後実装予定です');
        }
    };
});
