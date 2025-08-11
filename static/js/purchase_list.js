onDOMReady(() => {
    const confirmBtn = document.getElementById('confirmData');
    const tableContainer = document.getElementById('purchaseListTable');
    const deleteAllBtn = document.getElementById('deleteAll');
    
    confirmBtn.addEventListener('click', loadPurchaseList);
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', async () => {
            const ok = window.confirm('本当にデータベース内の仕入データを全て削除しますか？（開発用）');
            if (!ok) return;
            deleteAllBtn.disabled = true;
            try {
                const res = await apiCall('/api/delete_all_data', { method: 'POST' });
                if (res && res.success) {
                    tableContainer.innerHTML = '<div class="empty-state">データがありません</div>';
                    alert('全件削除しました（開発用）');
                } else {
                    alert((res && res.error) || '削除に失敗しました');
                }
            } catch (e) {
                console.error('delete all error', e);
                alert('削除中にエラーが発生しました');
            } finally {
                deleteAllBtn.disabled = false;
            }
        });
    }
    
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
            const ao = Number((a.order_number || '').toString().replace(/[^0-9.-]/g, '')) || 0;
            const bo = Number((b.order_number || '').toString().replace(/[^0-9.-]/g, '')) || 0;
            return bo - ao;
        });
        
        let html = `
            <div class="list-summary">
                <p><strong>総件数:</strong> ${data.length}件</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ページ</th>
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
                    <td>${record.ページ || ''}</td>
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
