onDOMReady(() => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const difyUploadForm = document.getElementById('difyUploadForm');
    const difyFileInput = document.getElementById('difyFileInput');
    const previewSection = document.getElementById('previewSection');
    const previewData = document.getElementById('previewData');
    const saveDataBtn = document.getElementById('saveData');
    const cancelImportBtn = document.getElementById('cancelImport');
    const fileSourceRadio = document.getElementById('fileSource');
    const difySourceRadio = document.getElementById('difySource');
    const fileUploadSection = document.getElementById('fileUploadSection');
    const difyFetchSection = document.getElementById('difyFetchSection');
    
    let currentData = null;
    
    fileSourceRadio.addEventListener('change', toggleDataSource);
    difySourceRadio.addEventListener('change', toggleDataSource);
    
    function toggleDataSource() {
        if (fileSourceRadio.checked) {
            fileUploadSection.style.display = 'block';
            difyFetchSection.style.display = 'none';
        } else {
            fileUploadSection.style.display = 'none';
            difyFetchSection.style.display = 'block';
        }
    }
    
    difyFileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            const fileText = document.querySelector('.dify-file-text');
            if (files.length === 1) {
                fileText.textContent = files[0].name;
            } else {
                fileText.textContent = `${files.length}個のファイルが選択されました`;
            }
        }
    });
    
    difyUploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData();
        const files = difyFileInput.files;
        
        if (!files || files.length === 0) {
            showMessage('PNGファイルを選択してください', 'error');
            return;
        }
        
        for (let i = 0; i < files.length; i++) {
            formData.append('files', files[i]);
        }
        
        try {
            const submitBtn = difyUploadForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = `Difyで分析中... (${files.length}ファイル)`;
            showMessage(`${files.length}個のファイルをDifyで分析中...`, 'info');
            
            const response = await fetch('/api/dify/fetch-data-multiple', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                currentData = result.data;
                displayPreview(result.data);
                
                let message = `Difyからデータを取得しました (${result.processed_count}/${result.total_count}ファイル処理完了)`;
                if (result.errors && result.errors.length > 0) {
                    message += `\n警告: ${result.errors.join('; ')}`;
                }
                showMessage(message, result.errors.length > 0 ? 'warning' : 'success');
            } else {
                showMessage(result.error || 'Difyからのデータ取得に失敗しました', 'error');
            }
        } catch (error) {
            showMessage('Difyからのデータ取得中にエラーが発生しました', 'error');
            console.error('Dify fetch error:', error);
        } finally {
            const submitBtn = difyUploadForm.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Difyでデータ分析';
        }
    });
    
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
        difyUploadForm.reset();
        document.querySelector('.file-text').textContent = 'JSONファイルを選択してください';
        document.querySelector('.dify-file-text').textContent = 'PNGファイルを選択してください（複数選択可）';
        document.getElementById('messageArea').innerHTML = '';
        fileSourceRadio.checked = true;
        toggleDataSource();
    });
});
