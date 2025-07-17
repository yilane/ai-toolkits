// 简化的背景移除工具
class BackgroundRemover {
    constructor() {
        this.init();
    }

    init() {
        document.getElementById('fileInput').addEventListener('change', this.handleFile.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.download.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clear.bind(this));
        this.setupDragAndDrop();
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
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processFile(file);
            }
        });
    }

    handleFile(e) {
        const file = e.target.files[0];
        if (file) this.processFile(file);
    }

    async processFile(file) {
        document.getElementById('progressOverlay').style.display = 'flex';
        
        // 模拟AI处理
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                
                // 简单的背景移除效果（实际应用中需要更复杂的AI算法）
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    this.resultBlob = blob;
                    this.showResult(canvas.toDataURL());
                    document.getElementById('progressOverlay').style.display = 'none';
                }, 'image/png');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showResult(dataUrl) {
        document.getElementById('previewSection').style.display = 'block';
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = `
            <div class="image-item">
                <img class="image-preview" src="${dataUrl}" alt="处理结果">
                <div class="image-info">
                    <div class="image-name">背景已移除</div>
                    <div class="image-stats">
                        <span>格式: PNG</span>
                        <span>透明背景</span>
                    </div>
                </div>
            </div>
        `;
    }

    download() {
        if (!this.resultBlob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.resultBlob);
        link.download = 'background_removed.png';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    clear() {
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        this.resultBlob = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BackgroundRemover();
}); 