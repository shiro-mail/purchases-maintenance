onDOMReady(() => {
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const difyUploadForm = document.getElementById('difyUploadForm');
    const difyFileInput = document.getElementById('difyFileInput');
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
            
            if (response.ok && result.success) {
                currentData = result.data;
                try {
                    localStorage.setItem('pendingImport', JSON.stringify(result.data));
                } catch (e) {}
                window.location.href = '/basic_info';
            } else {
                const errorMessage = result.error || result.errors?.join('; ') || 'Difyからのデータ取得に失敗しました';
                showMessage(errorMessage, 'error');
            }
        } catch (error) {
            showMessage('Difyからのデータ取得中にエラーが発生しました', 'error');
            console.error('Dify fetch error:', error);
        }finally {
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
                try {
                    localStorage.setItem('pendingImport', JSON.stringify(result.data));
                } catch (e) {}
                window.location.href = '/basic_info';
            } else {
                showMessage(result.error || 'ファイルの読み込みに失敗しました', 'error');
            }
        } catch (error) {
            showMessage('ファイルの読み込み中にエラーが発生しました', 'error');
            console.error('Upload error:', error);
        }
    });
    
    
    
});
