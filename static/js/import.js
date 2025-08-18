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
    
    // ファイル名表示関連の要素
    const selectedFilesSection = document.getElementById('selectedFilesSection');
    const selectedFilesList = document.getElementById('selectedFilesList');
    
    console.log('DOM elements found:');
    console.log('selectedFilesSection:', selectedFilesSection);
    console.log('selectedFilesList:', selectedFilesList);
    
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
        console.log('File input change event triggered');
        const files = e.target.files;
        console.log('Selected files:', files);
        
        if (files.length > 0) {
            const fileText = document.querySelector('.dify-file-text');
            if (fileText) {
                if (files.length === 1) {
                    fileText.textContent = files[0].name;
                } else {
                    fileText.textContent = `${files.length}個のファイルが選択されました`;
                }
            }
            
            console.log('Calling displaySelectedFiles with', files.length, 'files');
            // 選択されたファイル名を表示エリアに表示
            displaySelectedFiles(files);
        } else {
            console.log('No files selected, hiding section');
            // ファイルが選択されていない場合は表示エリアを非表示
            hideSelectedFiles();
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
    
    // 選択されたファイル名を表示する関数
    function displaySelectedFiles(files) {
        console.log('displaySelectedFiles called with', files.length, 'files');
        console.log('selectedFilesSection:', selectedFilesSection);
        console.log('selectedFilesList:', selectedFilesList);
        
        if (!selectedFilesSection || !selectedFilesList) {
            console.error('Required elements not found');
            return;
        }
        
        selectedFilesList.innerHTML = '';
        
        Array.from(files).forEach((file, index) => {
            console.log('Processing file:', file.name, file.size);
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center justify-between p-3 bg-white rounded-lg border border-green-200 shadow-sm';
            fileItem.innerHTML = `
                <div class="flex items-center">
                    <span class="text-green-600 mr-3">📄</span>
                    <span class="font-medium text-gray-900">${file.name}</span>
                </div>
                <div class="text-sm text-gray-500">
                    ${(file.size / 1024).toFixed(1)} KB
                </div>
            `;
            selectedFilesList.appendChild(fileItem);
        });
        
        console.log('Setting selectedFilesSection display to block');
        selectedFilesSection.style.display = 'block';
    }
    
    // 選択されたファイル表示エリアを非表示にする関数
    function hideSelectedFiles() {
        console.log('hideSelectedFiles called');
        if (selectedFilesSection && selectedFilesList) {
            selectedFilesSection.style.display = 'none';
            selectedFilesList.innerHTML = '';
            console.log('Section hidden successfully');
        } else {
            console.error('Elements not found in hideSelectedFiles');
        }
    }
    
});
