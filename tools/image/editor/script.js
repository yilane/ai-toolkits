class PhotoEditor {
    constructor() {
        this.originalImage = null;
        this.currentImage = null;
        this.mainCanvas = null;
        this.overlayCanvas = null;
        this.mainCtx = null;
        this.overlayCtx = null;
        this.currentTool = 'select';
        this.isDrawing = false;
        this.elements = [];
        this.history = [];
        this.historyIndex = -1;
        this.selectedElement = null;
        this.textStyles = {
            fontSize: 24,
            fontFamily: 'Arial',
            color: '#000000',
            bold: false,
            italic: false,
            underline: false
        };
        this.brushSettings = {
            size: 5,
            color: '#ff0000',
            type: 'round',
            opacity: 1
        };
        this.currentFilter = 'none';
        this.filterIntensity = 100;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupDragAndDrop();
        this.setupCanvas();
    }

    setupEventListeners() {
        // 文件上传
        document.getElementById('fileInput').addEventListener('change', this.handleFileSelect.bind(this));

        // 工具切换
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.addEventListener('click', this.switchTool.bind(this));
        });

        // 操作按钮
        document.getElementById('undoBtn').addEventListener('click', this.undo.bind(this));
        document.getElementById('redoBtn').addEventListener('click', this.redo.bind(this));
        document.getElementById('resetBtn').addEventListener('click', this.reset.bind(this));
        document.getElementById('downloadBtn').addEventListener('click', this.showExportModal.bind(this));

        // 文字工具
        this.setupTextControls();

        // 画笔工具
        this.setupDrawControls();

        // 滤镜工具
        this.setupFilterControls();

        // 贴纸工具
        this.setupStickerControls();

        // 导出模态框
        this.setupExportModal();
    }

    setupTextControls() {
        const fontSize = document.getElementById('fontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        const fontFamily = document.getElementById('fontFamily');
        const textColor = document.getElementById('textColor');
        const addTextBtn = document.getElementById('addTextBtn');
        const styleButtons = document.querySelectorAll('.style-btn');

        fontSize.addEventListener('input', (e) => {
            this.textStyles.fontSize = parseInt(e.target.value);
            fontSizeValue.textContent = e.target.value + 'px';
        });

        fontFamily.addEventListener('change', (e) => {
            this.textStyles.fontFamily = e.target.value;
        });

        textColor.addEventListener('change', (e) => {
            this.textStyles.color = e.target.value;
        });

        styleButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const style = e.target.getAttribute('data-style');
                this.textStyles[style] = !this.textStyles[style];
                btn.classList.toggle('active', this.textStyles[style]);
            });
        });

        addTextBtn.addEventListener('click', this.addText.bind(this));
    }

    setupDrawControls() {
        const brushSize = document.getElementById('brushSize');
        const brushSizeValue = document.getElementById('brushSizeValue');
        const brushColor = document.getElementById('brushColor');
        const brushType = document.getElementById('brushType');
        const brushOpacity = document.getElementById('brushOpacity');
        const brushOpacityValue = document.getElementById('brushOpacityValue');
        const clearDrawBtn = document.getElementById('clearDrawBtn');

        brushSize.addEventListener('input', (e) => {
            this.brushSettings.size = parseInt(e.target.value);
            brushSizeValue.textContent = e.target.value + 'px';
        });

        brushColor.addEventListener('change', (e) => {
            this.brushSettings.color = e.target.value;
        });

        brushType.addEventListener('change', (e) => {
            this.brushSettings.type = e.target.value;
        });

        brushOpacity.addEventListener('input', (e) => {
            this.brushSettings.opacity = parseFloat(e.target.value);
            brushOpacityValue.textContent = Math.round(e.target.value * 100) + '%';
        });

        clearDrawBtn.addEventListener('click', this.clearDrawing.bind(this));
    }

    setupFilterControls() {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const filterControls = document.getElementById('filterControls');
        const filterIntensity = document.getElementById('filterIntensity');
        const filterValue = document.getElementById('filterValue');
        const filterLabel = document.getElementById('filterLabel');
        const applyFilterBtn = document.getElementById('applyFilterBtn');

        filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.selectFilter(filter);
                
                // 更新按钮状态
                filterButtons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // 显示/隐藏控制面板
                if (filter === 'none') {
                    filterControls.style.display = 'none';
                    this.applyFilter('none');
                } else {
                    filterControls.style.display = 'block';
                    this.updateFilterLabel(filter);
                }
            });
        });

        filterIntensity.addEventListener('input', (e) => {
            this.filterIntensity = parseInt(e.target.value);
            filterValue.textContent = e.target.value + '%';
        });

        applyFilterBtn.addEventListener('click', () => {
            this.applyFilter(this.currentFilter);
        });
    }

    setupStickerControls() {
        const stickerItems = document.querySelectorAll('.sticker-item');
        const stickerSize = document.getElementById('stickerSize');
        const stickerSizeValue = document.getElementById('stickerSizeValue');

        stickerItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const sticker = e.target.getAttribute('data-sticker');
                this.selectedSticker = sticker;
                this.mainCanvas.style.cursor = 'copy';
            });
        });

        stickerSize.addEventListener('input', (e) => {
            this.stickerSize = parseInt(e.target.value);
            stickerSizeValue.textContent = e.target.value + 'px';
        });
    }

    setupExportModal() {
        const exportModal = document.getElementById('exportModal');
        const exportQuality = document.getElementById('exportQuality');
        const exportQualityValue = document.getElementById('exportQualityValue');
        const cancelExportBtn = document.getElementById('cancelExportBtn');
        const confirmExportBtn = document.getElementById('confirmExportBtn');

        exportQuality.addEventListener('input', (e) => {
            exportQualityValue.textContent = e.target.value + '%';
        });

        cancelExportBtn.addEventListener('click', () => {
            exportModal.style.display = 'none';
        });

        confirmExportBtn.addEventListener('click', this.exportImage.bind(this));
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
                this.handleFile(file);
            }
        });
    }

    setupCanvas() {
        this.mainCanvas = document.getElementById('mainCanvas');
        this.overlayCanvas = document.getElementById('overlayCanvas');
        this.mainCtx = this.mainCanvas.getContext('2d');
        this.overlayCtx = this.overlayCanvas.getContext('2d');

        this.mainCanvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.mainCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.mainCanvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.mainCanvas.addEventListener('click', this.handleClick.bind(this));
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.originalImage = img;
                this.currentImage = img;
                this.setupEditor();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    setupEditor() {
        document.getElementById('editorSection').style.display = 'block';
        this.resizeCanvas();
        this.drawImage();
        this.saveState();
    }

    resizeCanvas() {
        const container = document.querySelector('.canvas-container');
        const maxWidth = container.clientWidth - 40;
        const maxHeight = container.clientHeight - 40;
        
        let canvasWidth = this.originalImage.width;
        let canvasHeight = this.originalImage.height;
        
        const scaleX = maxWidth / canvasWidth;
        const scaleY = maxHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY, 1);
        
        canvasWidth *= scale;
        canvasHeight *= scale;
        
        this.mainCanvas.width = canvasWidth;
        this.mainCanvas.height = canvasHeight;
        this.overlayCanvas.width = canvasWidth;
        this.overlayCanvas.height = canvasHeight;
        
        this.scaleFactor = scale;
    }

    drawImage() {
        this.mainCtx.clearRect(0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.mainCtx.drawImage(this.currentImage, 0, 0, this.mainCanvas.width, this.mainCanvas.height);
        this.drawElements();
    }

    drawElements() {
        this.elements.forEach(element => {
            this.drawElement(element);
        });
    }

    drawElement(element) {
        this.mainCtx.save();
        
        switch (element.type) {
            case 'text':
                this.drawTextElement(element);
                break;
            case 'drawing':
                this.drawDrawingElement(element);
                break;
            case 'sticker':
                this.drawStickerElement(element);
                break;
        }
        
        this.mainCtx.restore();
    }

    drawTextElement(element) {
        this.mainCtx.font = `${element.bold ? 'bold ' : ''}${element.italic ? 'italic ' : ''}${element.fontSize}px ${element.fontFamily}`;
        this.mainCtx.fillStyle = element.color;
        this.mainCtx.textAlign = 'left';
        this.mainCtx.textBaseline = 'top';
        
        const lines = element.text.split('\n');
        lines.forEach((line, index) => {
            this.mainCtx.fillText(line, element.x, element.y + (index * element.fontSize * 1.2));
            
            if (element.underline) {
                const textWidth = this.mainCtx.measureText(line).width;
                this.mainCtx.beginPath();
                this.mainCtx.moveTo(element.x, element.y + (index * element.fontSize * 1.2) + element.fontSize);
                this.mainCtx.lineTo(element.x + textWidth, element.y + (index * element.fontSize * 1.2) + element.fontSize);
                this.mainCtx.strokeStyle = element.color;
                this.mainCtx.lineWidth = 1;
                this.mainCtx.stroke();
            }
        });
    }

    drawDrawingElement(element) {
        this.mainCtx.globalAlpha = element.opacity;
        this.mainCtx.strokeStyle = element.color;
        this.mainCtx.lineWidth = element.size;
        this.mainCtx.lineCap = element.type === 'round' ? 'round' : 'square';
        this.mainCtx.lineJoin = 'round';
        
        this.mainCtx.beginPath();
        element.points.forEach((point, index) => {
            if (index === 0) {
                this.mainCtx.moveTo(point.x, point.y);
            } else {
                this.mainCtx.lineTo(point.x, point.y);
            }
        });
        this.mainCtx.stroke();
    }

    drawStickerElement(element) {
        this.mainCtx.font = `${element.size}px Arial`;
        this.mainCtx.textAlign = 'center';
        this.mainCtx.textBaseline = 'middle';
        this.mainCtx.fillText(element.sticker, element.x, element.y);
    }

    switchTool(e) {
        const tool = e.target.closest('.tool-btn').getAttribute('data-tool');
        this.currentTool = tool;
        
        // 更新工具按钮状态
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        e.target.closest('.tool-btn').classList.add('active');
        
        // 显示对应的工具面板
        this.showToolPanel(tool);
        
        // 更新鼠标样式
        this.updateCursor();
    }

    showToolPanel(tool) {
        document.querySelectorAll('.tool-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(tool + 'Panel').classList.add('active');
    }

    updateCursor() {
        const cursors = {
            select: 'default',
            text: 'text',
            draw: 'crosshair',
            filter: 'default',
            sticker: 'copy'
        };
        this.mainCanvas.style.cursor = cursors[this.currentTool] || 'default';
    }

    handleMouseDown(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentTool === 'draw') {
            this.isDrawing = true;
            this.currentDrawing = {
                type: 'drawing',
                points: [{x, y}],
                color: this.brushSettings.color,
                size: this.brushSettings.size,
                opacity: this.brushSettings.opacity,
                brushType: this.brushSettings.type
            };
        }
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const rect = this.mainCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentTool === 'draw') {
            this.currentDrawing.points.push({x, y});
            this.drawImage();
            this.drawElement(this.currentDrawing);
        }
    }

    handleMouseUp() {
        if (this.isDrawing && this.currentTool === 'draw') {
            this.elements.push(this.currentDrawing);
            this.saveState();
            this.isDrawing = false;
            this.currentDrawing = null;
        }
    }

    handleClick(e) {
        const rect = this.mainCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (this.currentTool === 'sticker' && this.selectedSticker) {
            this.addSticker(x, y);
        }
    }

    addText() {
        const text = document.getElementById('textContent').value;
        if (!text.trim()) return;
        
        const textElement = {
            type: 'text',
            text: text,
            x: this.mainCanvas.width / 2 - 100,
            y: this.mainCanvas.height / 2 - 50,
            fontSize: this.textStyles.fontSize,
            fontFamily: this.textStyles.fontFamily,
            color: this.textStyles.color,
            bold: this.textStyles.bold,
            italic: this.textStyles.italic,
            underline: this.textStyles.underline
        };
        
        this.elements.push(textElement);
        this.drawImage();
        this.saveState();
        
        document.getElementById('textContent').value = '';
    }

    addSticker(x, y) {
        const stickerElement = {
            type: 'sticker',
            sticker: this.selectedSticker,
            x: x,
            y: y,
            size: this.stickerSize || 60
        };
        
        this.elements.push(stickerElement);
        this.drawImage();
        this.saveState();
    }

    selectFilter(filter) {
        this.currentFilter = filter;
    }

    updateFilterLabel(filter) {
        const labels = {
            brightness: '亮度',
            contrast: '对比度',
            saturate: '饱和度',
            blur: '模糊程度',
            sepia: '复古强度',
            grayscale: '灰度强度',
            invert: '反色强度'
        };
        
        document.getElementById('filterLabel').textContent = labels[filter] || '强度';
    }

    applyFilter(filter) {
        if (filter === 'none') {
            this.currentImage = this.originalImage;
            this.drawImage();
            this.saveState();
            return;
        }
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.originalImage.width;
        canvas.height = this.originalImage.height;
        
        ctx.filter = this.getFilterString(filter);
        ctx.drawImage(this.originalImage, 0, 0);
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.drawImage();
            this.saveState();
        };
        img.src = canvas.toDataURL();
    }

    getFilterString(filter) {
        const intensity = this.filterIntensity;
        
        switch (filter) {
            case 'grayscale':
                return `grayscale(${intensity}%)`;
            case 'sepia':
                return `sepia(${intensity}%)`;
            case 'invert':
                return `invert(${intensity}%)`;
            case 'blur':
                return `blur(${intensity / 20}px)`;
            case 'brightness':
                return `brightness(${intensity}%)`;
            case 'contrast':
                return `contrast(${intensity}%)`;
            case 'saturate':
                return `saturate(${intensity}%)`;
            default:
                return 'none';
        }
    }

    clearDrawing() {
        this.elements = this.elements.filter(element => element.type !== 'drawing');
        this.drawImage();
        this.saveState();
    }

    saveState() {
        const state = {
            elements: JSON.parse(JSON.stringify(this.elements)),
            currentImage: this.currentImage.src
        };
        
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex++;
        
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState();
        }
    }

    restoreState() {
        const state = this.history[this.historyIndex];
        this.elements = JSON.parse(JSON.stringify(state.elements));
        
        const img = new Image();
        img.onload = () => {
            this.currentImage = img;
            this.drawImage();
        };
        img.src = state.currentImage;
    }

    reset() {
        this.elements = [];
        this.currentImage = this.originalImage;
        this.drawImage();
        this.saveState();
    }

    showExportModal() {
        document.getElementById('exportModal').style.display = 'flex';
    }

    exportImage() {
        const format = document.getElementById('exportFormat').value;
        const quality = parseInt(document.getElementById('exportQuality').value) / 100;
        
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        exportCanvas.width = this.originalImage.width;
        exportCanvas.height = this.originalImage.height;
        
        // 绘制当前图像
        exportCtx.drawImage(this.currentImage, 0, 0);
        
        // 绘制所有元素
        const scaleX = this.originalImage.width / this.mainCanvas.width;
        const scaleY = this.originalImage.height / this.mainCanvas.height;
        
        exportCtx.save();
        exportCtx.scale(scaleX, scaleY);
        
        this.elements.forEach(element => {
            this.drawElementOnContext(exportCtx, element);
        });
        
        exportCtx.restore();
        
        // 导出图片
        const mimeType = format === 'png' ? 'image/png' : 
                        format === 'jpeg' ? 'image/jpeg' : 'image/webp';
        
        exportCanvas.toBlob((blob) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `edited_image.${format}`;
            link.click();
            URL.revokeObjectURL(link.href);
        }, mimeType, quality);
        
        document.getElementById('exportModal').style.display = 'none';
    }

    drawElementOnContext(ctx, element) {
        ctx.save();
        
        switch (element.type) {
            case 'text':
                ctx.font = `${element.bold ? 'bold ' : ''}${element.italic ? 'italic ' : ''}${element.fontSize}px ${element.fontFamily}`;
                ctx.fillStyle = element.color;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                
                const lines = element.text.split('\n');
                lines.forEach((line, index) => {
                    ctx.fillText(line, element.x, element.y + (index * element.fontSize * 1.2));
                    
                    if (element.underline) {
                        const textWidth = ctx.measureText(line).width;
                        ctx.beginPath();
                        ctx.moveTo(element.x, element.y + (index * element.fontSize * 1.2) + element.fontSize);
                        ctx.lineTo(element.x + textWidth, element.y + (index * element.fontSize * 1.2) + element.fontSize);
                        ctx.strokeStyle = element.color;
                        ctx.lineWidth = 1;
                        ctx.stroke();
                    }
                });
                break;
                
            case 'drawing':
                ctx.globalAlpha = element.opacity;
                ctx.strokeStyle = element.color;
                ctx.lineWidth = element.size;
                ctx.lineCap = element.brushType === 'round' ? 'round' : 'square';
                ctx.lineJoin = 'round';
                
                ctx.beginPath();
                element.points.forEach((point, index) => {
                    if (index === 0) {
                        ctx.moveTo(point.x, point.y);
                    } else {
                        ctx.lineTo(point.x, point.y);
                    }
                });
                ctx.stroke();
                break;
                
            case 'sticker':
                ctx.font = `${element.size}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(element.sticker, element.x, element.y);
                break;
        }
        
        ctx.restore();
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new PhotoEditor();
});