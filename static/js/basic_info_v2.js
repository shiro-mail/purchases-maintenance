const BASIC_INFO_V2_BUILD = '20250810-v2-a5';
function parseNumber(val) {
    if (val === null || val === undefined) return 0;
    if (typeof val === 'number') return isFinite(val) ? val : 0;
    if (typeof val === 'string') {
        const s = val.replace(/[￥,\s]/g, '');
        const n = Number(s);
        return isNaN(n) ? 0 : n;
    }
    return 0;
}

function getVal(obj, keys) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
    }
    return '';
}
function mapToJapaneseRecord(src) {
    const page = getVal(src, ['ページ','page','pageNumber']) || '';
    const shipmentDate = getVal(src, ['出荷日','shipment_date','shipmentDate']) || '';
    const orderNumber  = getVal(src, ['受注番号','order_number','orderNumber']) || '';
    const deliveryNo   = getVal(src, ['納入先番号','delivery_number','deliveryNumber']) || '';
    const person       = getVal(src, ['担当者','person_in_charge','personInCharge']) || '';
    const shippingCost = parseNumber(getVal(src, ['運賃','shipping_cost','shippingCost']));
    const partsTotal   = parseNumber(getVal(src, ['部品合計','parts_total','partsTotal']));
    let total          = parseNumber(getVal(src, ['税抜合計','total_amount','totalAmount']));
    if (!total) total = partsTotal + shippingCost;

    const arr = (v) => Array.isArray(v) ? v : [];
    const partNumbers = arr(src['部品番号'] || src['part_numbers'] || src['partNumbers']);
    const partNames   = arr(src['部品名']   || src['part_names']   || src['partNames']);
    const quantities  = arr(src['数量']     || src['quantities']   || src['quantities']);
    const unitPrices  = arr(src['売上単価'] || src['unit_prices']  || src['unitPrices']);
    const salesAmts   = arr(src['売上金額'] || src['sales_amounts']|| src['salesAmounts']);

    return {
        ページ: page,
        出荷日: shipmentDate,
        受注番号: orderNumber,
        納入先番号: deliveryNo,
        担当者: person,
        運賃: shippingCost,
        税抜合計: total,
        部品番号: partNumbers,
        部品名: partNames,
        数量: quantities.map(n => parseNumber(n)),
        売上単価: unitPrices.map(n => parseNumber(n)),
        売上金額: salesAmts.map(n => parseNumber(n)),
    };
}



onDOMReady(() => {
    const tableContainer = document.getElementById('basicInfoTable');
    const saveBtn = document.getElementById('saveSelected');

    function sortByOrderNumberDesc(arr) {
        if (!Array.isArray(arr)) return [];
        return arr.sort((a, b) => {
            const av = getVal(a, ['受注番号','order_number','orderNumber']);
            const bv = getVal(b, ['受注番号','order_number','orderNumber']);
            const ao = Number((av == null ? '' : String(av)).replace(/[^0-9.-]/g, '')) || 0;
            const bo = Number((bv == null ? '' : String(bv)).replace(/[^0-9.-]/g, '')) || 0;
            return bo - ao;
        });
    }


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
        return val;
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
                        <th>選択</th>
                    </tr>
                </thead>
                <tbody>
        `;
        data.forEach((row, idx) => {
            const page = getVal(row, ['ページ','page','pageNumber']);
            const shipmentDate = getVal(row, ['出荷日','shipment_date','shipmentDate']);
            const orderNumber  = getVal(row, ['受注番号','order_number','orderNumber']);
            const deliveryNo   = getVal(row, ['納入先番号','delivery_number','deliveryNumber']);
            const person       = getVal(row, ['担当者','person_in_charge','personInCharge']);
            const shippingCost = parseNumber(getVal(row, ['運賃','shipping_cost','shippingCost']));
            const saRaw = row['売上金額'] || row['sales_amounts'] || row['salesAmounts'];
            const qtRaw = row['数量'] || row['quantities'] || row['quantities'];
            const upRaw = row['売上単価'] || row['unit_prices'] || row['unitPrices'];
            let partsTotal = 0;
            if (Array.isArray(saRaw) && saRaw.length > 0) {
                partsTotal = saRaw.reduce((s, v) => s + parseNumber(v), 0);
            } else if ((Array.isArray(qtRaw) && qtRaw.length > 0) || (Array.isArray(upRaw) && upRaw.length > 0)) {
                const L = Math.max(Array.isArray(qtRaw) ? qtRaw.length : 0, Array.isArray(upRaw) ? upRaw.length : 0);
                for (let i = 0; i < L; i++) {
                    const q = Array.isArray(qtRaw) ? parseNumber(qtRaw[i]) : 0;
                    const p = Array.isArray(upRaw) ? parseNumber(upRaw[i]) : 0;
                    partsTotal += q * p;
                }
            } else {
                partsTotal = parseNumber(getVal(row, ['部品合計','parts_total','partsTotal']));
            }
            const totalRaw = parseNumber(getVal(row, ['税抜合計','total_amount','totalAmount']));
            let total;
            if (Array.isArray(saRaw) || Array.isArray(qtRaw) || Array.isArray(upRaw)) {
                total = partsTotal + shippingCost;
            } else {
                total = totalRaw || (partsTotal + shippingCost);
            }
            html += `
                <tr data-mode="pending" data-index="${idx}">
                    <td>${page}</td>
                    <td>${formatDate(shipmentDate)}</td>
                    <td>${orderNumber}</td>
                    <td>${deliveryNo}</td>
                    <td>${person}</td>
                    <td>${formatCurrency(shippingCost)}</td>
                    <td>${formatCurrency(partsTotal)}</td>
                    <td>${formatCurrency(total)}</td>
                    <td>
                        <a href="/parts_info/pending?index=${idx}" class="btn btn-info">部品詳細</a>
                    </td>
                    <td>
                        <button class="btn btn-warning" data-action="edit" data-index="${idx}">編集</button>
                        <button class="btn btn-danger" data-action="delete" data-index="${idx}">削除</button>
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
        pending = sortByOrderNumberDesc(pending);
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
            const payload = toSave.map(item => mapToJapaneseRecord(item));
            console.log('Saving payload:', payload);

            try {
                showMessage('データを保存中...', 'info');
                const result = await apiCall('/api/save_data', {
                    method: 'POST',
                    body: JSON.stringify(payload)
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
                        pending = sortByOrderNumberDesc(pending);
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
                const msg = (error && error.message) ? `データの保存中にエラーが発生しました: ${error.message}` : 'データの保存中にエラーが発生しました';
                showMessage(msg, 'error');
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

        if (action === 'delete') {
            if (!confirm('この行を削除しますか？（未保存データ）')) return;
            const next = [];
            pending.forEach((item, i) => { if (i !== index) next.push(item); });
            pending = next;
            if (pending.length > 0) {
                try { localStorage.setItem('pendingImport', JSON.stringify(pending)); } catch (e) {}
                pending = sortByOrderNumberDesc(pending);
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
                                <input type="text" name="shipment_date" value="${getVal(row, ['出荷日','shipment_date','shipmentDate'])}">
                            </div>
                            <div class="form-group">
                                <label>受注番号</label>
                                <input type="text" name="order_number" value="${getVal(row, ['受注番号','order_number','orderNumber'])}">
                            </div>
                            <div class="form-group">
                                <label>納入先番号</label>
                                <input type="text" name="delivery_number" value="${getVal(row, ['納入先番号','delivery_number','deliveryNumber'])}">
                            </div>
                            <div class="form-group">
                                <label>担当者</label>
                                <input type="text" name="person_in_charge" value="${getVal(row, ['担当者','person_in_charge','personInCharge'])}">
                            </div>
                            <div class="form-group">
                                <label>運賃</label>
                                <input type="number" name="shipping_cost" value="${parseNumber(getVal(row, ['運賃','shipping_cost','shippingCost']))}">
                            </div>
                            <div class="form-group">
                                <label>部品合計</label>
                                <input type="number" name="parts_total" value="${parseNumber(getVal(row, ['部品合計','parts_total','partsTotal']))}">
                            </div>
                            <div class="form-group">
                                <label>税抜合計</label>
                                <input type="number" name="total_amount" value="${parseNumber(getVal(row, ['税抜合計','total_amount','totalAmount']))}">
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
                    出荷日: fd.get('shipment_date') || '',
                    受注番号: fd.get('order_number') || '',
                    納入先番号: fd.get('delivery_number') || '',
                    担当者: fd.get('person_in_charge') || '',
                    運賃: Number(fd.get('shipping_cost') || 0),
                    部品合計: Number(fd.get('parts_total') || 0),
                    税抜合計: Number(fd.get('total_amount') || 0),
                };
                pending[index] = Object.assign({}, pending[index], updated);
                try { localStorage.setItem('pendingImport', JSON.stringify(pending)); } catch (e) {}
                pending = sortByOrderNumberDesc(pending);
                renderTable(pending);
                close();
                showMessage('未保存データを更新しました', 'success');
            });

            return;
        }
    }, true);

    loadPendingAndRender();
});
