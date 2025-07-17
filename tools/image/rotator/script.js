class ImageRotator {
    constructor() {
        this.files = [];
        this.rotatedImages = [];
        this.rotationAngle = 0;
        this.init();
    }

    init() {
        document.getElementById('fileInput').addEventListener('change', this.handleFiles.bind(this));
        document.getElementById('rotateBtn').addEventListener('click', this.rotateImages.bind(this));
        document.getElementById('downloadAllBtn').addEventListener('click', this.downloadAll.bind(this));
        document.getElementById('clearBtn').addEventListener('click', this.clear.bind(this));
        
        // 快速旋转按钮
        document.querySelectorAll('.rotate-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.rotationAngle = parseInt(e.target.getAttribute('data-angle'));
                document.getElementById('rotateAngle').value = this.rotationAngle;
                document.getElementById('angleValue').textContent = this.rotationAngle + '°';
            });
        });
        
        // 角度滑块
        document.getElementById('rotateAngle').addEventListener('input', (e) => {
            this.rotationAngle = parseInt(e.target.value);
            document.getElementById('angleValue').textContent = e.target.value + '°';
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
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('image/')
            );
            this.processFiles(files);
        });
    }

    handleFiles(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
    }

    processFiles(files) {
        this.files = files;
        if (files.length > 0) {
            document.getElementById('settingsSection').style.display = 'block';
        }
    }

    async rotateImages() {
        if (this.files.length === 0) return;
        
        this.rotatedImages = [];
        
        for (const file of this.files) {
            const rotatedBlob = await this.rotateImage(file, this.rotationAngle);
            this.rotatedImages.push({
                originalFile: file,
                rotatedBlob: rotatedBlob,
                angle: this.rotationAngle
            });
        }
        
        this.showResults();
    }

    rotateImage(file, angle) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // 计算旋转后的尺寸
                    const radian = (angle * Math.PI) / 180;
                    const cos = Math.abs(Math.cos(radian));
                    const sin = Math.abs(Math.sin(radian));
                    
                    canvas.width = img.width * cos + img.height * sin;
                    canvas.height = img.width * sin + img.height * cos;
                    
                    // 移动到中心点
                    ctx.translate(canvas.width / 2, canvas.height / 2);
                    ctx.rotate(radian);
                    
                    // 绘制图像
                    ctx.drawImage(img, -img.width / 2, -img.height / 2);
                    
                    canvas.toBlob((blob) => {
                        resolve(blob);
                    }, file.type);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    showResults() {
        document.getElementById('previewSection').style.display = 'block';
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = '';
        
        this.rotatedImages.forEach((imageData, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            
            const preview = document.createElement('img');
            preview.className = 'image-preview';
            preview.src = URL.createObjectURL(imageData.rotatedBlob);
            
            const info = document.createElement('div');
            info.className = 'image-info';
            info.innerHTML = `
                <div class="image-name">${imageData.originalFile.name}</div>
                <div class="image-stats">
                    <span>旋转角度: ${imageData.angle}°</span>
                    <span>格式: ${imageData.originalFile.type.split('/')[1].toUpperCase()}</span>
                </div>
                <button class="download-btn" onclick="window.downloadSingle(${index})">下载</button>
            `;
            
            item.appendChild(preview);
            item.appendChild(info);
            imageList.appendChild(item);
        });
    }

    downloadSingle(index) {
        const imageData = this.rotatedImages[index];
        const link = document.createElement('a');
        link.href = URL.createObjectURL(imageData.rotatedBlob);
        link.download = `rotated_${imageData.originalFile.name}`;
        link.click();
        URL.revokeObjectURL(link.href);
    }

    downloadAll() {
        this.rotatedImages.forEach((imageData, index) => {
            setTimeout(() => {
                this.downloadSingle(index);
            }, index * 500);
        });
    }

    clear() {
        this.files = [];
        this.rotatedImages = [];
        document.getElementById('settingsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.getElementById('fileInput').value = '';
        document.getElementById('rotateAngle').value = '0';
        document.getElementById('angleValue').textContent = '0°';
        this.rotationAngle = 0;
    }
}

// 将downloadSingle方法暴露到全局作用域
let imageRotator;
document.addEventListener('DOMContentLoaded', () => {
    imageRotator = new ImageRotator();
    window.downloadSingle = imageRotator.downloadSingle.bind(imageRotator);
}); 