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
        const totalSalesAmount = data.reduce((sum, part) => sum + part.sales_amount, 0);
        
        let html = `
            <div class="parts-summary">
                <p><strong>売上金額合計:</strong> ${formatCurrency(totalSalesAmount)}</p>
            </div>
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
    
    window.editPart = async function(id) {
        try {
            const data = await apiCall(`/api/parts_info/${basicId}`);
            const part = data.find(p => p.id === id);
            
            if (!part) {
                showMessage('部品情報が見つかりません', 'error');
                return;
            }
            
            showEditModal(part);
        } catch (error) {
            showMessage('部品情報の取得に失敗しました', 'error');
            console.error('Edit error:', error);
        }
    };
    
    window.deletePart = async function(id) {
        if (!confirm('この部品情報を削除しますか？')) {
            return;
        }
        
        try {
            const result = await apiCall(`/api/parts_info/${id}`, {
                method: 'DELETE'
            });
            
            if (result.success) {
                showMessage('部品情報を削除しました', 'success');
                loadPartsInfo(); // Reload the table
            } else {
                showMessage(result.error || '削除に失敗しました', 'error');
            }
        } catch (error) {
            showMessage('削除中にエラーが発生しました', 'error');
            console.error('Delete error:', error);
        }
    };
    
    function showEditModal(part) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>部品情報編集</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editPartForm">
                        <div class="form-group">
                            <label for="part_number">部品番号</label>
                            <input type="text" id="part_number" name="part_number" value="${part.part_number}" required>
                        </div>
                        <div class="form-group">
                            <label for="part_name">部品名</label>
                            <input type="text" id="part_name" name="part_name" value="${part.part_name}" required>
                        </div>
                        <div class="form-group">
                            <label for="quantity">数量</label>
                            <input type="number" id="quantity" name="quantity" value="${part.quantity}" required>
                        </div>
                        <div class="form-group">
                            <label for="unit_price">売上単価</label>
                            <input type="number" id="unit_price" name="unit_price" value="${part.unit_price}" required>
                        </div>
                        <div class="form-group">
                            <label for="sales_amount">売上金額</label>
                            <input type="number" id="sales_amount" name="sales_amount" value="${part.sales_amount}" readonly>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                    <button class="btn btn-primary" onclick="savePart(${part.id})">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        window.currentModal = modal;
        
        const quantityInput = document.getElementById('quantity');
        const unitPriceInput = document.getElementById('unit_price');
        const salesAmountInput = document.getElementById('sales_amount');
        
        function calculateSalesAmount() {
            const quantity = parseFloat(quantityInput.value) || 0;
            const unitPrice = parseFloat(unitPriceInput.value) || 0;
            const salesAmount = quantity * unitPrice;
            salesAmountInput.value = salesAmount;
        }
        
        quantityInput.addEventListener('input', calculateSalesAmount);
        unitPriceInput.addEventListener('input', calculateSalesAmount);
    }
    
    window.closeModal = function() {
        if (window.currentModal) {
            document.body.removeChild(window.currentModal);
            window.currentModal = null;
        }
    };
    
    window.savePart = async function(id) {
        const form = document.getElementById('editPartForm');
        const formData = new FormData(form);
        
        const data = {
            part_number: formData.get('part_number'),
            part_name: formData.get('part_name'),
            quantity: formData.get('quantity'),
            unit_price: formData.get('unit_price'),
            sales_amount: formData.get('sales_amount')
        };
        
        try {
            const result = await apiCall(`/api/parts_info/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                showMessage('部品情報を更新しました', 'success');
                closeModal();
                loadPartsInfo(); // Reload the table
            } else {
                showMessage(result.error || '更新に失敗しました', 'error');
            }
        } catch (error) {
            showMessage('更新中にエラーが発生しました', 'error');
            console.error('Save error:', error);
        }
    };
});
