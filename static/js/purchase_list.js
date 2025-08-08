onDOMReady(() => {
    const confirmBtn = document.getElementById('confirmData');
    const tableContainer = document.getElementById('purchaseListTable');
    
    confirmBtn.addEventListener('click', loadPurchaseList);
    
    async function loadPurchaseList() {
        try {
            tableContainer.innerHTML = '<div class="loading">データを読み込み中...</div>';
            
            const data = await apiCall('/api/purchase_list');
            
            if (data.length === 0) {
                tableContainer.innerHTML = '<div class="empty-state">データがありません</div>';
                return;
            }
            
            displayPurchaseList(data);
        } catch (error) {
            tableContainer.innerHTML = '<div class="empty-state">データの読み込みに失敗しました</div>';
            console.error('Load error:', error);
        }
    }
    
    function displayPurchaseList(data) {
        data.sort((a, b) => {
            const dateA = new Date(a.shipment_date.replace(/(\d{2})\/(\d{2})\/(\d{2})/, '20$3-$2-$1'));
            const dateB = new Date(b.shipment_date.replace(/(\d{2})\/(\d{2})\/(\d{2})/, '20$3-$2-$1'));
            return dateB - dateA;
        });
        
        let html = `
            <div class="list-summary">
                <p><strong>総件数:</strong> ${data.length}件</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>出荷日</th>
                        <th>受注番号</th>
                        <th>納入先番号</th>
                        <th>担当者</th>
                        <th>運賃</th>
                        <th>税抜合計</th>
                        <th>登録日時</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        data.forEach(record => {
            const createdAt = new Date(record.created_at).toLocaleString('ja-JP');
            html += `
                <tr>
                    <td>${formatDate(record.shipment_date)}</td>
                    <td>${record.order_number}</td>
                    <td>${record.delivery_number}</td>
                    <td>${record.person_in_charge}</td>
                    <td>${formatCurrency(record.shipping_cost)}</td>
                    <td>${formatCurrency(record.total_amount)}</td>
                    <td>${createdAt}</td>
                </tr>
            `;
        });
        
        html += `
                </tbody>
            </table>
        `;
        
        tableContainer.innerHTML = html;
    }
});
