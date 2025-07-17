class DocumentConverter {
    constructor() {
        this.files = [];
        this.convertedFiles = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
    }

    setupEventListeners() {
        document.getElementById('fileInput').addEventListener('change', this.handleFileSelect.bind(this));
        document.getElementById('convertBtn').addEventListener('click', this.convertFiles.bind(this));
        document.getElementById('downloadAllBtn').addEventListener('click', this.downloadAll.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clearAll.bind(this));
    }

    setupDragAndDrop() {
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = Array.from(e.dataTransfer.files);
            this.handleFiles(files);
        });
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.handleFiles(files);
    }

    handleFiles(files) {
        this.files = files;
        if (files.length > 0) {
            document.getElementById('settingsSection').style.display = 'block';
        }
    }

    async convertFiles() {
        if (this.files.length === 0) return;
        
        document.getElementById('progressOverlay').style.display = 'flex';
        this.convertedFiles = [];
        
        const targetFormat = document.getElementById('targetFormat').value;
        
        for (let i = 0; i < this.files.length; i++) {
            const file = this.files[i];
            document.getElementById('progressFill').style.width = ((i + 1) / this.files.length * 100) + '%';
            document.getElementById('progressText').textContent = `正在转换: ${file.name}`;
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 模拟转换结果
            const convertedFile = {
                originalName: file.name,
                convertedName: this.changeFileExtension(file.name, '.' + targetFormat),
                originalSize: file.size,
                convertedSize: Math.round(file.size * 0.8),
                format: targetFormat.toUpperCase(),
                downloadUrl: URL.createObjectURL(file) // 模拟下载URL
            };
            
            this.convertedFiles.push(convertedFile);
        }
        
        document.getElementById('progressOverlay').style.display = 'none';
        this.displayResults();
    }

    changeFileExtension(filename, newExtension) {
        const lastDotIndex = filename.lastIndexOf('.');
        return filename.substring(0, lastDotIndex) + newExtension;
    }

    displayResults() {
        document.getElementById('previewSection').style.display = 'block';
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';
        
        this.convertedFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            item.innerHTML = `
                <div class="file-info">
                    <h4>${file.convertedName}</h4>
                    <p>格式: ${file.format} | 大小: ${this.formatFileSize(file.convertedSize)}</p>
                </div>
                <button class="download-btn" onclick="downloadFile(${index})">下载</button>
            `;
            fileList.appendChild(item);
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    downloadFile(index) {
        const file = this.convertedFiles[index];
        const link = document.createElement('a');
        link.href = file.downloadUrl;
        link.download = file.convertedName;
        link.click();
    }

    downloadAll() {
        this.convertedFiles.forEach((file, index) => {
            setTimeout(() => {
                this.downloadFile(index);
            }, index * 500);
        });
    }

    clearAll() {
        this.files = [];
        this.convertedFiles = [];
        document.getElementById('settingsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
    }
}

let documentConverter;
document.addEventListener('DOMContentLoaded', () => {
    documentConverter = new DocumentConverter();
    window.downloadFile = documentConverter.downloadFile.bind(documentConverter);
}); 