onDOMReady(() => {
    const refreshBtn = document.getElementById('refreshData');
    const tableContainer = document.getElementById('basicInfoTable');
    
    loadBasicInfo();
    
    refreshBtn.addEventListener('click', loadBasicInfo);
    
    async function loadBasicInfo() {
        try {
            tableContainer.innerHTML = '<div class="loading">データを読み込み中...</div>';
            
            const data = await apiCall('/api/basic_info');
            
            if (data.length === 0) {
                tableContainer.innerHTML = '<div class="empty-state">データがありません。ファイル取込からデータを追加してください。</div>';
                return;
            }
            
            displayBasicInfo(data);
        } catch (error) {
            tableContainer.innerHTML = '<div class="empty-state">データの読み込みに失敗しました</div>';
            console.error('Load error:', error);
        }
    }
    
    function displayBasicInfo(data) {
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>出荷日</th>
                        <th>受注番号</th>
                        <th>納入先番号</th>
                        <th>担当者</th>
                        <th>運賃</th>
                        <th>税抜合計</th>
                        <th>部品情報</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(record => {
            html += `
                <tr>
                    <td>${formatDate(record.shipment_date)}</td>
                    <td>${record.order_number}</td>
                    <td>${record.delivery_number}</td>
                    <td>${record.person_in_charge}</td>
                    <td>${formatCurrency(record.shipping_cost)}</td>
                    <td>${formatCurrency(record.total_amount)}</td>
                    <td>
                        <a href="/parts_info/${record.id}" class="btn btn-info">部品情報</a>
                    </td>
                    <td>
                        <button onclick="editRecord(${record.id})" class="btn btn-secondary">編集</button>
                        <button onclick="deleteRecord(${record.id})" class="btn btn-secondary">削除</button>
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
    
    window.editRecord = function(id) {
        alert('編集機能は今後実装予定です');
    };
    
    window.deleteRecord = function(id) {
        if (confirm('このレコードを削除しますか？')) {
            alert('削除機能は今後実装予定です');
        }
    };
});
