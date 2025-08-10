const BASIC_INFO_V2_BUILD = '20250810-v2-a1';

onDOMReady(() => {
    const tableContainer = document.getElementById('basicInfoTable');
    const saveBtn = document.getElementById('saveSelected');

    try { if (typeof showMessage === 'function') showMessage(`basic_info_v2.js ${BASIC_INFO_V2_BUILD} を読み込みました`, 'info'); } catch (_) {}

    let pending = null;
    try {
        const raw = localStorage.getItem('pendingImport');
        pending = raw ? JSON.parse(raw) : null;
    } catch (e) {
        pending = null;
    }

    function enableSave(enabled) {
        if (saveBtn) saveBtn.disabled = !enabled;
    }

    function formatCurrency(val) {
        const n = Number(val || 0);
        return '￥' + n.toLocaleString('ja-JP');
    }

    function formatDate(val) {
        if (!val) return '';
        return val; // keep original string
    }

    function renderTable(data) {
        if (!Array.isArray(data) || data.length === 0) {
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
        data.forEach((row, idx) => {
            const partsTotal = Number(row.parts_total || row.partsTotal || 0);
            const shippingCost = Number(row.shipping_cost || row.shippingCost || 0);
            const total = Number(row.total_amount || row.totalAmount || (partsTotal + shippingCost));
            html += `
                <tr data-mode="pending" data-index="${idx}">
                    <td>${formatDate(row.shipment_date || row.shipmentDate)}</td>
                    <td>${row.order_number || row.orderNumber || ''}</td>
                    <td>${row.delivery_number || row.deliveryNumber || ''}</td>
                    <td>${row.person_in_charge || row.personInCharge || ''}</td>
                    <td>${formatCurrency(shippingCost)}</td>
                    <td>${formatCurrency(partsTotal)}</td>
                    <td>${formatCurrency(total)}</td>
                    <td>
                        <a href="#" class="btn btn-info" data-action="parts" data-index="${idx}">部品詳細</a>
                    </td>
                    <td>
                        <button class="btn btn-warning" data-action="edit" data-index="${idx}">編集</button>
                        <button class="btn btn-danger" data-action="delete" data-index="${idx}">削除</button>
                        <button class="btn btn-secondary" data-action="test" data-index="${idx}">テスト</button>
                    </td>
                    <td>
                        <input type="checkbox" class="row-check" data-index="${idx}">
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

    function loadPendingAndRender() {
        let data = [];
        try {
            const raw = localStorage.getItem('pendingImport');
            data = raw ? JSON.parse(raw) : [];
        } catch (e) {
            data = [];
        }
        pending = data;
        enableSave(Array.isArray(pending) && pending.length > 0);
        renderTable(pending);
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

            const toSave = checked.map(i => pending[i]).filter(Boolean);

            try {
                showMessage('データを保存中...', 'info');
                const result = await apiCall('/api/save_data', {
                    method: 'POST',
                    body: JSON.stringify(toSave)
                });
                if (result && result.success) {
                    const keep = [];
                    pending.forEach((item, i) => {
                        if (!checked.includes(i)) keep.push(item);
                    });
                    pending = keep;
                    if (pending.length > 0) {
                        try { localStorage.setItem('pendingImport', JSON.stringify(pending)); } catch (e) {}
                        showMessage('選択したデータを保存しました', 'success');
                        renderTable(pending);
                        enableSave(true);
                    } else {
                        localStorage.removeItem('pendingImport');
                        showMessage('選択したデータを保存しました（全件保存済み）', 'success');
                        tableContainer.innerHTML = '<div class="empty-state">保存対象のデータがありません。</div>';
                        enableSave(false);
                    }
                } else {
                    showMessage((result && result.error) || 'データの保存に失敗しました', 'error');
                }
            } catch (error) {
                showMessage('データの保存中にエラーが発生しました', 'error');
                console.error('Save selected error:', error);
            }
        });
    }

    tableContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const btn = target.closest('[data-action]');
        if (!btn) return;

        const action = btn.getAttribute('data-action');
        const index = parseInt(btn.getAttribute('data-index'), 10);
        if (isNaN(index) || !pending || !pending[index]) return;
        e.preventDefault();
        e.stopPropagation();

        if (action === 'test') {
            try { window.alert('テストボタンの動作確認'); } catch (_) {}
            try { showMessage('テストボタンがクリックされました', 'info'); } catch (_) {}
            return;
        }

        if (action === 'parts') {
            showMessage('未保存データのため「部品詳細」は保存後にご利用ください。', 'warning');
            return;
        }

        if (action === 'delete') {
            if (!confirm('この行を削除しますか？（未保存データ）')) return;
            const next = [];
            pending.forEach((item, i) => { if (i !== index) next.push(item); });
            pending = next;
            if (pending.length > 0) {
                try { localStorage.setItem('pendingImport', JSON.stringify(pending)); } catch (e) {}
                renderTable(pending);
                enableSave(true);
            } else {
                localStorage.removeItem('pendingImport');
                tableContainer.innerHTML = '<div class="empty-state">保存対象のデータがありません。</div>';
                enableSave(false);
            }
            showMessage('未保存データの行を削除しました', 'success');
            return;
        }

        if (action === 'edit') {
            const row = pending[index];
            const modal = document.createElement('div');
            modal.className = 'modal show';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>未保存データの編集</h3>
                        <button class="modal-close" data-close="1">&times;</button>
                    </div>
                    <div class="modal-body">
                        <form id="editFormPending">
                            <div class="form-group">
                                <label>出荷日</label>
                                <input type="text" name="shipment_date" value="${row.shipment_date || row.shipmentDate || ''}">
                            </div>
                            <div class="form-group">
                                <label>受注番号</label>
                                <input type="text" name="order_number" value="${row.order_number || row.orderNumber || ''}">
                            </div>
                            <div class="form-group">
                                <label>納入先番号</label>
                                <input type="text" name="delivery_number" value="${row.delivery_number || row.deliveryNumber || ''}">
                            </div>
                            <div class="form-group">
                                <label>担当者</label>
                                <input type="text" name="person_in_charge" value="${row.person_in_charge || row.personInCharge || ''}">
                            </div>
                            <div class="form-group">
                                <label>運賃</label>
                                <input type="number" name="shipping_cost" value="${row.shipping_cost || row.shippingCost || 0}">
                            </div>
                            <div class="form-group">
                                <label>部品合計</label>
                                <input type="number" name="parts_total" value="${row.parts_total || row.partsTotal || 0}">
                            </div>
                            <div class="form-group">
                                <label>税抜合計</label>
                                <input type="number" name="total_amount" value="${row.total_amount || row.totalAmount || 0}">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" data-close="1">キャンセル</button>
                        <button class="btn btn-primary" data-save="1">保存</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            function close() {
                if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
            }

            modal.addEventListener('click', (ev) => {
                const c = ev.target.closest('[data-close]');
                if (c) { close(); }
            });

            const saveEl = modal.querySelector('[data-save]');
            saveEl.addEventListener('click', () => {
                const form = modal.querySelector('#editFormPending');
                const fd = new FormData(form);
                const updated = {
                    shipment_date: fd.get('shipment_date') || '',
                    order_number: fd.get('order_number') || '',
                    delivery_number: fd.get('delivery_number') || '',
                    person_in_charge: fd.get('person_in_charge') || '',
                    shipping_cost: Number(fd.get('shipping_cost') || 0),
                    parts_total: Number(fd.get('parts_total') || 0),
                    total_amount: Number(fd.get('total_amount') || 0),
                };
                pending[index] = Object.assign({}, pending[index], updated);
                try { localStorage.setItem('pendingImport', JSON.stringify(pending)); } catch (e) {}
                renderTable(pending);
                close();
                showMessage('未保存データを更新しました', 'success');
            });

            return;
        }
    }, true);

    loadPendingAndRender();
});
