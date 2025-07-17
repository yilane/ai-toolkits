class WatermarkTool {
    constructor() {
        this.originalImage = null;
        this.init();
    }

    init() {
        document.getElementById('fileInput').addEventListener('change', this.handleFile.bind(this));
        document.getElementById('addWatermarkBtn').addEventListener('click', this.addWatermark.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.download.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clear.bind(this));
        
        // 实时更新显示
        document.getElementById('fontSize').addEventListener('input', (e) => {
            document.getElementById('fontSizeValue').textContent = e.target.value + 'px';
        });
        document.getElementById('opacity').addEventListener('input', (e) => {
            document.getElementById('opacityValue').textContent = Math.round(e.target.value * 100) + '%';
        });
        
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

    processFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                document.getElementById('settingsSection').style.display = 'block';
            };
            this.originalImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    addWatermark() {
        if (!this.originalImage) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.originalImage.width;
        canvas.height = this.originalImage.height;
        
        // 绘制原图
        ctx.drawImage(this.originalImage, 0, 0);
        
        // 水印设置
        const text = document.getElementById('watermarkText').value;
        const fontSize = parseInt(document.getElementById('fontSize').value);
        const opacity = parseFloat(document.getElementById('opacity').value);
        const position = document.getElementById('position').value;
        
        // 设置水印样式
        ctx.font = `${fontSize}px Arial`;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.8})`;
        ctx.lineWidth = 2;
        
        // 计算位置
        const textWidth = ctx.measureText(text).width;
        let x, y;
        
        switch (position) {
            case 'bottom-right':
                x = canvas.width - textWidth - 20;
                y = canvas.height - 20;
                break;
            case 'bottom-left':
                x = 20;
                y = canvas.height - 20;
                break;
            case 'top-right':
                x = canvas.width - textWidth - 20;
                y = fontSize + 20;
                break;
            case 'top-left':
                x = 20;
                y = fontSize + 20;
                break;
            case 'center':
                x = (canvas.width - textWidth) / 2;
                y = canvas.height / 2;
                break;
        }
        
        // 绘制水印
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
        
        canvas.toBlob((blob) => {
            this.resultBlob = blob;
            this.showResult(canvas.toDataURL());
        }, 'image/png');
    }

    showResult(dataUrl) {
        document.getElementById('previewSection').style.display = 'block';
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = `
            <div class="image-item">
                <img class="image-preview" src="${dataUrl}" alt="带水印图片">
                <div class="image-info">
                    <div class="image-name">已添加水印</div>
                    <div class="image-stats">
                        <span>格式: PNG</span>
                        <span>水印已添加</span>
                    </div>
                </div>
            </div>
        `;
    }

    download() {
        if (!this.resultBlob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(this.resultBlob);
        link.download = 'watermarked_image.png';
        link.click();
        URL.revokeObjectURL(link.href);
    }

    clear() {
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('settingsSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        this.originalImage = null;
        this.resultBlob = null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WatermarkTool();
}); 