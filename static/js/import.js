onDOMReady(() => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const previewSection = document.getElementById('previewSection');
    const previewData = document.getElementById('previewData');
    const saveDataBtn = document.getElementById('saveData');
    const cancelImportBtn = document.getElementById('cancelImport');
    
    let currentData = null;
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const fileText = document.querySelector('.file-text');
            fileText.textContent = file.name;
        }
    });
    
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        const file = fileInput.files[0];
        
        if (!file) {
            showMessage('ファイルを選択してください', 'error');
            return;
        }
        
        formData.append('file', file);
        
        try {
            showMessage('ファイルを読み込み中...', 'info');
            
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                currentData = result.data;
                displayPreview(currentData);
                showMessage('ファイルの読み込みが完了しました', 'success');
            } else {
                showMessage(result.error || 'ファイルの読み込みに失敗しました', 'error');
            }
        } catch (error) {
            showMessage('ファイルの読み込み中にエラーが発生しました', 'error');
            console.error('Upload error:', error);
        }
    });
    
    function displayPreview(data) {
        if (!data || data.length === 0) {
            previewData.innerHTML = '<p>データがありません</p>';
            return;
        }
        
        let html = `
            <div class="preview-summary">
                <p><strong>読み込み件数:</strong> ${data.length}件</p>
            </div>
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>出荷日</th>
                            <th>受注番号</th>
                            <th>納入先番号</th>
                            <th>担当者</th>
                            <th>部品数</th>
                            <th>税抜合計</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        data.forEach((record, index) => {
            const partsCount = Array.isArray(record['部品番号']) ? record['部品番号'].length : 1;
            html += `
                <tr>
                    <td>${formatDate(record['出荷日'])}</td>
                    <td>${record['受注番号']}</td>
                    <td>${record['納入先番号']}</td>
                    <td>${record['担当者']}</td>
                    <td>${partsCount}点</td>
                    <td>${formatCurrency(parseInt(record['税抜合計']))}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        previewData.innerHTML = html;
        previewSection.style.display = 'block';
    }
    
    saveDataBtn.addEventListener('click', async () => {
        if (!currentData) {
            showMessage('保存するデータがありません', 'error');
            return;
        }
        
        try {
            showMessage('データを保存中...', 'info');
            
            const result = await apiCall('/api/save_data', {
                method: 'POST',
                body: JSON.stringify(currentData)
            });
            
            if (result.success) {
                showMessage('データの保存が完了しました', 'success');
                setTimeout(() => {
                    window.location.href = '/basic_info';
                }, 2000);
            } else {
                showMessage(result.error || 'データの保存に失敗しました', 'error');
            }
        } catch (error) {
            showMessage('データの保存中にエラーが発生しました', 'error');
            console.error('Save error:', error);
        }
    });
    
    cancelImportBtn.addEventListener('click', () => {
        currentData = null;
        previewSection.style.display = 'none';
        uploadForm.reset();
        document.querySelector('.file-text').textContent = 'JSONファイルを選択してください';
        document.getElementById('messageArea').innerHTML = '';
    });
});
