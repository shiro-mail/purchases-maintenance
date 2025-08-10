window.openPartsDetail = function(id) {
    if (id === undefined || id === null) return;
    try {
        window.location.href = `/parts_info/${id}`;
    } catch (e) {
        window.location.assign(`/parts_info/${id}`);
    }
};
onDOMReady(() => {
    const refreshBtn = document.getElementById('refreshData');
    const saveBtn = document.getElementById('saveSelected');
    const tableContainer = document.getElementById('basicInfoTable');

    let pendingRaw = localStorage.getItem('pendingImport');
    let pending = null;
    try { pending = pendingRaw ? JSON.parse(pendingRaw) : null; } catch (e) { pending = null; }

    function enableSave(enabled) {
        if (saveBtn) saveBtn.disabled = !enabled;
    }

    function displayPending(data) {
        if (!data || data.length === 0) {
            tableContainer.innerHTML = '<div class="empty-state">保存対象のデータがありません。</div>';
            return;
        }
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>出荷日</th>
                        <th>受注番号</th>
                        <th>納入先番号</th>
                        <th>担当者</th>
                        <th>運賃</th>
                        <th>部品合計</th>
                        <th>税抜合計</th>
                        <th>部品詳細</th>
                        <th>操作</th>
                        <th>選択</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.forEach((record, index) => {
            const amountsArray = Array.isArray(record['売上金額']) ? record['売上金額'] : [record['売上金額']];
            const partsTotal = (amountsArray || []).reduce((sum, v) => {
                const n = parseInt(v || 0, 10);
                return sum + (isNaN(n) ? 0 : n);
            }, 0);
            const shippingCost = parseInt(record['運賃'] || 0, 10);
            const totalAmount = (isNaN(shippingCost) ? 0 : shippingCost) + partsTotal;
            html += `
                <tr>
                    <td>${formatDate(record['出荷日'])}</td>
                    <td>${record['受注番号']}</td>
                    <td>${record['納入先番号']}</td>
                    <td>${record['担当者']}</td>
                    <td>${formatCurrency(shippingCost || 0)}</td>
                    <td>${formatCurrency(partsTotal)}</td>
                    <td>${formatCurrency(totalAmount)}</td>
                    <td>
                        <a class="btn btn-info disabled" tabindex="-1" aria-disabled="true">部品詳細</a>
                    </td>
                    <td>
                        <button class="btn btn-warning" disabled>編集</button>
                        <button class="btn btn-danger" disabled>削除</button>
                    </td>
                    <td><input type="checkbox" class="row-check" data-index="${index}"></td>
                </tr>
            `;
        });
        html += `
                </tbody>
            </table>
        `;
        tableContainer.innerHTML = html;
    }

    function refreshView() {
        pendingRaw = localStorage.getItem('pendingImport');
        try { pending = pendingRaw ? JSON.parse(pendingRaw) : null; } catch (e) { pending = null; }
        if (Array.isArray(pending) && pending.length > 0) {
            enableSave(true);
            displayPending(pending);
        } else {
            enableSave(false);
            loadBasicInfo();
        }
    }

    refreshView();

    if (refreshBtn) {
        refreshBtn.addEventListener('click', refreshView);
    }
    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            if (!Array.isArray(pending) || pending.length === 0) {
                showMessage('保存対象のデータがありません', 'warning');
                return;
            }
            const checked = Array.from(document.querySelectorAll('input.row-check[type="checkbox"]:checked'))
                .map(cb => parseInt(cb.dataset.index, 10))
                .filter(i => !isNaN(i));
            if (checked.length === 0) {
                showMessage('保存するデータを選択してください', 'warning');
                return;
            }
            function ensureArray(val) {
                if (Array.isArray(val)) return val;
                if (val === undefined || val === null) return [];
                return [val];
            }
            function toIntString(v) {
                const n = parseInt(v || 0, 10);
                return String(isNaN(n) ? 0 : n);
            }
            const toSave = checked.map(i => {
                const rec = {...pending[i]};
                let amounts = ensureArray(rec['売上金額']).map(toIntString);
                let quantities = ensureArray(rec['数量']).map(toIntString);
                let unitPrices = ensureArray(rec['売上単価']).map(toIntString);
                let partNos = ensureArray(rec['部品番号']);
                let partNames = ensureArray(rec['部品名']);
                const partsTotal = (amounts || []).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
                const shipping = parseInt(rec['運賃'] || 0, 10) || 0;
                const taxExcludedTotal = shipping + partsTotal;
                const L = partNos.length;
                amounts = (amounts || []).slice(0, L);
                quantities = (quantities || []).slice(0, L);
                unitPrices = (unitPrices || []).slice(0, L);
                partNames = (partNames || []).slice(0, L);
                return {
                    ...rec,
                    '運賃': String(shipping),
                    '部品番号': partNos,
                    '部品名': partNames,
                    '数量': quantities,
                    '売上単価': unitPrices,
                    '売上金額': amounts,
                    '税抜合計': taxExcludedTotal
                };
            });
            try {
                showMessage('データを保存中...', 'info');
                const result = await apiCall('/api/save_data', {
                    method: 'POST',
                    body: JSON.stringify(toSave)
                });
                if (result.success) {
                    pending = pending.filter((_, idx) => !checked.includes(idx));
                    if (pending.length > 0) {
                        try { localStorage.setItem('pendingImport', JSON.stringify(pending)); } catch (e) {}
                        displayPending(pending);
                        showMessage('選択したデータを保存しました', 'success');
                    } else {
                        localStorage.removeItem('pendingImport');
                        enableSave(false);
                        showMessage('選択したデータを保存しました（全件保存済み）', 'success');
                        loadBasicInfo();
                    }
                } else {
                    showMessage(result.error || 'データの保存に失敗しました', 'error');
                }
            } catch (error) {
                showMessage('データの保存中にエラーが発生しました', 'error');
                console.error('Save selected error:', error);
            }
        });
    }
    tableContainer.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-action="delete"]');
        if (!btn || !tableContainer.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();
        const originalText = btn.textContent;
        btn.textContent = 'クリック認識';
        btn.classList.add('btn-warning');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('btn-warning');
        }, 1000);
        try { console.log('[delete-click] table capture handler reached for id=', btn.getAttribute('data-id')); } catch (_) {}
        try { window.confirm('削除していいですか？'); } catch (_) {}
        return;
    }, true);
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-action="delete"]');
        if (!btn) return;
        e.preventDefault();
        const originalText = btn.textContent;
        btn.textContent = 'クリック認識';
        btn.classList.add('btn-warning');
        setTimeout(() => {
            btn.textContent = originalText;
            btn.classList.remove('btn-warning');
        }, 1000);
        try { console.log('[delete-click] document capture handler reached for id=', btn.getAttribute('data-id')); } catch (_) {}
        try { window.confirm('削除していいですか？'); } catch (_) {}
    tableContainer.addEventListener('click', function(e) {
        const btn = e.target.closest('[data-action="test"]');
        if (!btn || !tableContainer.contains(btn)) return;
        e.preventDefault();
        e.stopPropagation();
        try { window.alert('テストボタンの動作確認'); } catch (_) {}
        try { showMessage('テストボタンがクリックされました', 'info'); } catch (_) {}
        return;
    }, true);

        return;
    }, true);


    window.addEventListener('storage', function(e) {
        if (e.key === 'partsUpdated') {
            loadBasicInfo();
        }
    });
    
    let lastPartsUpdateCheck = 0;
    setInterval(function() {
        const partsUpdate = localStorage.getItem('partsUpdated');
        if (partsUpdate) {
            const updateData = JSON.parse(partsUpdate);
            if (updateData.timestamp > lastPartsUpdateCheck) {
                lastPartsUpdateCheck = updateData.timestamp;
                loadBasicInfo();
            }
        }
    }, 1000);
    
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
                        <th>部品合計</th>
                        <th>税抜合計</th>
                        <th>部品詳細</th>
                        <th>操作</th>
                        <th>選択</th>
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
                    <td>${formatCurrency(record.parts_total)}</td>
                    <td>${formatCurrency(record.total_amount)}</td>
                    <td>
                        <a href="/parts_info/${record.id}" class="btn btn-info" role="button">部品詳細</a>
                    </td>
                    <td>
                        <button class="btn btn-warning" onclick="editRecord(${record.id})">編集</button>
                        <button type="button" class="btn btn-danger" data-action="delete" data-id="${record.id}">削除</button>
                        <button type="button" class="btn btn-secondary" data-action="test" data-id="${record.id}">テスト</button>
                    </td>
                    <td>
                        <input type="checkbox" class="row-check-db" data-id="${record.id}">
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
    
    window.editRecord = async function(id) {
        try {
            const data = await apiCall('/api/basic_info');
            const record = data.find(r => r.id === id);
            
            if (!record) {
                showMessage('レコードが見つかりません', 'error');
                return;
            }
            
            showEditModal(record);
        } catch (error) {
            showMessage('レコードの取得に失敗しました', 'error');
            console.error('Edit error:', error);
        }
    };
    
    window.deleteRecord = async function(id) {
        if (!confirm('このレコードを削除しますか？関連する部品情報も全て削除されます。')) {
            return;
        }
        
        try {
            const result = await apiCall(`/api/basic_info/${id}`, {
                method: 'DELETE'
            });
            
            if (result.success) {
                showMessage('レコードを削除しました', 'success');
                loadBasicInfo(); // Reload the table
            } else {
                showMessage(result.error || '削除に失敗しました', 'error');
            }
        } catch (error) {
            showMessage('削除中にエラーが発生しました', 'error');
            console.error('Delete error:', error);
        }
    };
    
    function showEditModal(record) {
        const modal = document.createElement('div');
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>基本情報編集</h3>
                    <button class="modal-close" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="editForm">
                        <div class="form-group">
                            <label for="shipment_date">出荷日</label>
                            <input type="text" id="shipment_date" name="shipment_date" value="${record.shipment_date}" required>
                        </div>
                        <div class="form-group">
                            <label for="order_number">受注番号</label>
                            <input type="text" id="order_number" name="order_number" value="${record.order_number}" required>
                        </div>
                        <div class="form-group">
                            <label for="delivery_number">納入先番号</label>
                            <input type="text" id="delivery_number" name="delivery_number" value="${record.delivery_number}" required>
                        </div>
                        <div class="form-group">
                            <label for="person_in_charge">担当者</label>
                            <input type="text" id="person_in_charge" name="person_in_charge" value="${record.person_in_charge}" required>
                        </div>
                        <div class="form-group">
                            <label for="shipping_cost">運賃</label>
                            <input type="number" id="shipping_cost" name="shipping_cost" value="${record.shipping_cost}" required>
                        </div>
                        <div class="form-group">
                            <label for="parts_total">部品合計</label>
                            <input type="number" id="parts_total" name="parts_total" value="${record.parts_total}" readonly>
                        </div>
                        <div class="form-group">
                            <label for="total_amount">税抜合計</label>
                            <input type="number" id="total_amount" name="total_amount" value="${record.total_amount}" readonly>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
                    <button class="btn btn-primary" onclick="saveRecord(${record.id})">保存</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        window.currentModal = modal;
        
        const shippingCostInput = document.getElementById('shipping_cost');
        const partsTotalInput = document.getElementById('parts_total');
        const totalAmountInput = document.getElementById('total_amount');
        
        function calculateTotalAmount() {
            const shippingCost = parseFloat(shippingCostInput.value) || 0;
            const partsTotal = parseFloat(partsTotalInput.value) || 0;
            const totalAmount = shippingCost + partsTotal;
            totalAmountInput.value = totalAmount;
        }
        
        shippingCostInput.addEventListener('input', calculateTotalAmount);
    }
    
    window.closeModal = function() {
        if (window.currentModal) {
            document.body.removeChild(window.currentModal);
            window.currentModal = null;
        }
    };
    
    window.saveRecord = async function(id) {
        const form = document.getElementById('editForm');
        const formData = new FormData(form);
        
        const data = {
            shipment_date: formData.get('shipment_date'),
            order_number: formData.get('order_number'),
            delivery_number: formData.get('delivery_number'),
            person_in_charge: formData.get('person_in_charge'),
            shipping_cost: formData.get('shipping_cost'),
            total_amount: formData.get('total_amount')
        };
        
        try {
            const result = await apiCall(`/api/basic_info/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            
            if (result.success) {
                showMessage('レコードを更新しました', 'success');
                closeModal();
                loadBasicInfo(); // Reload the table
            } else {
                showMessage(result.error || '更新に失敗しました', 'error');
            }
        } catch (error) {
            showMessage('更新中にエラーが発生しました', 'error');
            console.error('Save error:', error);
        }
    };
});
