onDOMReady(() => {
    const container = document.getElementById('partsInfoPendingTable');

    function getParam(name) {
        const u = new URL(window.location.href);
        return u.searchParams.get(name);
    }
    function arr(v) {
        if (Array.isArray(v)) return v.slice();
        if (v === undefined || v === null) return [];
        return [v];
    }
    function parseNumber(val) {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'number') return isFinite(val) ? val : 0;
        const s = String(val).replace(/[￥,\s]/g, '');
        const n = Number(s);
        return isNaN(n) ? 0 : n;
    }
    function loadPendingAll() {
        try {
            const raw = localStorage.getItem('pendingImport');
            return raw ? JSON.parse(raw) : [];
        } catch (_) {
            return [];
        }
    }
    function savePendingAll(data) {
        try {
            localStorage.setItem('pendingImport', JSON.stringify(data));
        } catch (_) {}
    }

    function render(rec, idx) {
        const partNumbers = arr(rec['部品番号'] || rec['part_numbers'] || rec['partNumbers']);
        const partNames   = arr(rec['部品名']   || rec['part_names']   || rec['partNames']);
        const quantities  = arr(rec['数量']     || rec['quantities']   || rec['quantities']);
        const unitPrices  = arr(rec['売上単価'] || rec['unit_prices']  || rec['unitPrices']);
        const salesAmts   = arr(rec['売上金額'] || rec['sales_amounts']|| rec['salesAmounts']);

        const rows = [];
        const L = Math.max(partNumbers.length, partNames.length, quantities.length, unitPrices.length, salesAmts.length);
        for (let i = 0; i < L; i++) {
            const qty = parseNumber(quantities[i]);
            const price = parseNumber(unitPrices[i]);
            const amt = salesAmts[i] != null ? parseNumber(salesAmts[i]) : (qty * price);
            rows.push({
                no: partNumbers[i] || '',
                name: partNames[i] || '',
                qty,
                price,
                amt
            });
        }
        const total = rows.reduce((s, r) => s + (r.amt != null ? r.amt : (r.qty * r.price)), 0);

        let html = `
            <div class="parts-summary">
                <p><strong>売上金額合計:</strong> ${formatCurrency(total)}</p>
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
        rows.forEach((p, i) => {
            const amt = p.amt != null ? p.amt : (p.qty * p.price);
            html += `
                <tr data-i="${i}">
                    <td>${p.no}</td>
                    <td>${p.name}</td>
                    <td>${p.qty}</td>
                    <td>${formatCurrency(p.price)}</td>
                    <td>${formatCurrency(amt)}</td>
                    <td>
                        <button class="btn btn-warning" data-action="edit" data-index="${i}">編集</button>
                        <button class="btn btn-danger" data-action="delete" data-index="${i}">削除</button>
                    </td>
                </tr>
            `;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;

        container.onclick = (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn || !container.contains(btn)) return;
            const action = btn.dataset.action;
            const i = Number(btn.dataset.index);
            if (Number.isNaN(i)) return;

            const all = loadPendingAll();
            if (!Array.isArray(all) || !all[idx]) return;

            const pn = arr(all[idx]['部品番号'] || all[idx]['part_numbers'] || all[idx]['partNumbers']);
            const pm = arr(all[idx]['部品名']   || all[idx]['part_names']   || all[idx]['partNames']);
            const qt = arr(all[idx]['数量']     || all[idx]['quantities']   || all[idx]['quantities']);
            const up = arr(all[idx]['売上単価'] || all[idx]['unit_prices']  || all[idx]['unitPrices']);
            const sa = arr(all[idx]['売上金額'] || all[idx]['sales_amounts']|| all[idx]['salesAmounts']);

            if (action === 'delete') {
                if (!confirm('この部品情報を削除しますか？')) return;
                pn.splice(i, 1);
                pm.splice(i, 1);
                qt.splice(i, 1);
                up.splice(i, 1);
                sa.splice(i, 1);
                all[idx]['部品番号'] = pn;
                all[idx]['部品名'] = pm;
                all[idx]['数量'] = qt;
                all[idx]['売上単価'] = up;
                all[idx]['売上金額'] = sa;
                savePendingAll(all);
                render(all[idx], idx);
                showMessage('部品情報を削除しました（未保存）', 'success');
                return;
            }

            if (action === 'edit') {
                const modal = document.createElement('div');
                modal.className = 'modal show';
                const currentQty = parseNumber(qt[i]);
                const currentPrice = parseNumber(up[i]);
                const currentAmt = currentQty * currentPrice;
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>部品情報編集（未保存）</h3>
                            <button class="modal-close" data-close="1">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form id="editPendingPart">
                                <div class="form-group"><label>部品番号</label><input name="no" value="${pn[i] || ''}"></div>
                                <div class="form-group"><label>部品名</label><input name="name" value="${pm[i] || ''}"></div>
                                <div class="form-group"><label>数量</label><input type="number" name="qty" value="${currentQty}" step="1" min="0"></div>
                                <div class="form-group"><label>売上単価</label><input type="number" name="price" value="${currentPrice}" step="1" min="0"></div>
                                <div class="form-group"><label>売上金額</label><input type="number" name="amt" value="${currentAmt}" readonly></div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" data-close="1">キャンセル</button>
                            <button class="btn btn-primary" data-save="1">保存</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                const close = () => { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); };
                modal.addEventListener('click', (ev) => {
                    if (ev.target.closest('[data-close]')) close();
                });

                const form = modal.querySelector('#editPendingPart');
                const qtyInput = form.querySelector('input[name="qty"]');
                const priceInput = form.querySelector('input[name="price"]');
                const amtInput = form.querySelector('input[name="amt"]');
                const recalc = () => {
                    const q = parseNumber(qtyInput.value);
                    const p = parseNumber(priceInput.value);
                    amtInput.value = (q * p);
                };
                qtyInput.addEventListener('input', recalc);
                priceInput.addEventListener('input', recalc);

                modal.querySelector('[data-save]').addEventListener('click', () => {
                    const fd = new FormData(form);
                    const no = fd.get('no') || '';
                    const name = fd.get('name') || '';
                    const qty = parseNumber(fd.get('qty'));
                    const price = parseNumber(fd.get('price'));
                    const amt = qty * price;

                    pn[i] = no;
                    pm[i] = name;
                    qt[i] = qty;
                    up[i] = price;
                    sa[i] = amt;

                    all[idx]['部品番号'] = pn;
                    all[idx]['部品名'] = pm;
                    all[idx]['数量'] = qt;
                    all[idx]['売上単価'] = up;
                    all[idx]['売上金額'] = sa;
                    savePendingAll(all);

                    close();
                    render(all[idx], idx);
                    showMessage('部品情報を更新しました（未保存）', 'success');
                });
            }
        };
    }

    const indexStr = getParam('index');
    const index = Number(indexStr);
    const all = loadPendingAll();
    if (Number.isNaN(index) || !Array.isArray(all) || !all[index]) {
        container.innerHTML = '<div class="empty-state">未保存データが見つかりません</div>';
        return;
    }
    render(all[index], index);
});
