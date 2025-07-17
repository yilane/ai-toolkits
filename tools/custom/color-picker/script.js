class ColorPicker {
    constructor() {
        this.colorPicker = document.getElementById('colorPicker');
        this.colorDisplay = document.getElementById('colorDisplay');
        this.hueSlider = document.getElementById('hueSlider');
        this.satSlider = document.getElementById('satSlider');
        this.lightSlider = document.getElementById('lightSlider');
        this.alphaSlider = document.getElementById('alphaSlider');
        this.hueValue = document.getElementById('hueValue');
        this.satValue = document.getElementById('satValue');
        this.lightValue = document.getElementById('lightValue');
        this.alphaValue = document.getElementById('alphaValue');
        
        this.hexInput = document.getElementById('hexInput');
        this.rgbInput = document.getElementById('rgbInput');
        this.rgbaInput = document.getElementById('rgbaInput');
        this.hslInput = document.getElementById('hslInput');
        this.hslaInput = document.getElementById('hslaInput');
        this.hsvInput = document.getElementById('hsvInput');
        
        this.paletteColors = document.getElementById('paletteColors');
        this.historyColors = document.getElementById('historyColors');
        this.clearHistoryBtn = document.getElementById('clearHistoryBtn');
        
        this.currentColor = { h: 220, s: 100, l: 65, a: 1 };
        this.colorHistory = this.loadHistory();
        this.currentPaletteType = 'complementary';
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateColor();
        this.renderHistory();
        this.generatePalette();
    }

    bindEvents() {
        this.colorPicker.addEventListener('input', (e) => {
            const hex = e.target.value;
            const hsl = this.hexToHsl(hex);
            this.currentColor = { ...hsl, a: this.currentColor.a };
            this.updateSliders();
            this.updateColor();
        });

        this.hueSlider.addEventListener('input', (e) => {
            this.currentColor.h = parseInt(e.target.value);
            this.updateColor();
        });

        this.satSlider.addEventListener('input', (e) => {
            this.currentColor.s = parseInt(e.target.value);
            this.updateColor();
        });

        this.lightSlider.addEventListener('input', (e) => {
            this.currentColor.l = parseInt(e.target.value);
            this.updateColor();
        });

        this.alphaSlider.addEventListener('input', (e) => {
            this.currentColor.a = parseInt(e.target.value) / 100;
            this.updateColor();
        });

        this.hexInput.addEventListener('input', (e) => {
            const hex = e.target.value;
            if (this.isValidHex(hex)) {
                const hsl = this.hexToHsl(hex);
                this.currentColor = { ...hsl, a: this.currentColor.a };
                this.updateSliders();
                this.updateColor();
            }
        });

        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.copyToClipboard(e.target);
            });
        });

        document.querySelectorAll('.palette-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchPaletteTab(e.target);
            });
        });

        this.clearHistoryBtn.addEventListener('click', () => {
            this.clearHistory();
        });
    }

    updateColor() {
        const { h, s, l, a } = this.currentColor;
        
        // 更新滑块值显示
        this.hueValue.textContent = `${h}°`;
        this.satValue.textContent = `${s}%`;
        this.lightValue.textContent = `${l}%`;
        this.alphaValue.textContent = `${Math.round(a * 100)}%`;
        
        // 更新滑块位置
        this.hueSlider.value = h;
        this.satSlider.value = s;
        this.lightSlider.value = l;
        this.alphaSlider.value = Math.round(a * 100);
        
        // 转换为各种格式
        const hex = this.hslToHex(h, s, l);
        const rgb = this.hslToRgb(h, s, l);
        const hsv = this.hslToHsv(h, s, l);
        
        // 更新输入框
        this.hexInput.value = hex;
        this.rgbInput.value = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
        this.rgbaInput.value = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
        this.hslInput.value = `hsl(${h}, ${s}%, ${l}%)`;
        this.hslaInput.value = `hsla(${h}, ${s}%, ${l}%, ${a})`;
        this.hsvInput.value = `hsv(${hsv.h}, ${hsv.s}%, ${hsv.v}%)`;
        
        // 更新颜色选择器
        this.colorPicker.value = hex;
        
        // 更新显示背景
        this.colorDisplay.style.background = `linear-gradient(45deg, ${hex} 0%, ${hex} 100%)`;
        
        // 添加到历史记录
        this.addToHistory(hex);
        
        // 更新调色板
        this.generatePalette();
    }

    updateSliders() {
        const { h, s, l, a } = this.currentColor;
        this.hueSlider.value = h;
        this.satSlider.value = s;
        this.lightSlider.value = l;
        this.alphaSlider.value = Math.round(a * 100);
    }

    // 颜色转换函数
    hslToHex(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
    }

    hslToRgb(h, s, l) {
        l /= 100;
        const a = s * Math.min(l, 1 - l) / 100;
        const f = n => {
            const k = (n + h / 30) % 12;
            const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
            return Math.round(255 * color);
        };
        return { r: f(0), g: f(8), b: f(4) };
    }

    hexToHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    hslToHsv(h, s, l) {
        s /= 100;
        l /= 100;
        const v = s * Math.min(l, 1 - l) + l;
        const sNew = v === 0 ? 0 : 2 * (1 - l / v);
        return {
            h: h,
            s: Math.round(sNew * 100),
            v: Math.round(v * 100)
        };
    }

    isValidHex(hex) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }

    async copyToClipboard(btn) {
        const targetId = btn.dataset.target;
        const input = document.getElementById(targetId);
        const text = input.value;
        
        try {
            await navigator.clipboard.writeText(text);
            btn.textContent = '已复制';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '复制';
                btn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('复制失败:', err);
            input.select();
            document.execCommand('copy');
        }
    }

    // 调色板生成
    generatePalette() {
        const { h, s, l } = this.currentColor;
        let colors = [];

        switch (this.currentPaletteType) {
            case 'complementary':
                colors = this.generateComplementary(h, s, l);
                break;
            case 'analogous':
                colors = this.generateAnalogous(h, s, l);
                break;
            case 'triadic':
                colors = this.generateTriadic(h, s, l);
                break;
            case 'tetradic':
                colors = this.generateTetradic(h, s, l);
                break;
        }

        this.renderPalette(colors);
    }

    generateComplementary(h, s, l) {
        return [
            { h, s, l },
            { h: (h + 180) % 360, s, l }
        ];
    }

    generateAnalogous(h, s, l) {
        return [
            { h: (h - 30 + 360) % 360, s, l },
            { h, s, l },
            { h: (h + 30) % 360, s, l }
        ];
    }

    generateTriadic(h, s, l) {
        return [
            { h, s, l },
            { h: (h + 120) % 360, s, l },
            { h: (h + 240) % 360, s, l }
        ];
    }

    generateTetradic(h, s, l) {
        return [
            { h, s, l },
            { h: (h + 90) % 360, s, l },
            { h: (h + 180) % 360, s, l },
            { h: (h + 270) % 360, s, l }
        ];
    }

    renderPalette(colors) {
        this.paletteColors.innerHTML = '';
        colors.forEach(color => {
            const hex = this.hslToHex(color.h, color.s, color.l);
            const colorEl = document.createElement('div');
            colorEl.className = 'palette-color';
            colorEl.style.backgroundColor = hex;
            colorEl.dataset.color = hex;
            colorEl.addEventListener('click', () => {
                this.selectColor(color);
            });
            this.paletteColors.appendChild(colorEl);
        });
    }

    switchPaletteTab(tab) {
        document.querySelectorAll('.palette-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentPaletteType = tab.dataset.tab;
        this.generatePalette();
    }

    selectColor(color) {
        this.currentColor = { ...color, a: this.currentColor.a };
        this.updateColor();
    }

    // 历史记录管理
    addToHistory(hex) {
        if (!this.colorHistory.includes(hex)) {
            this.colorHistory.unshift(hex);
            if (this.colorHistory.length > 20) {
                this.colorHistory.pop();
            }
            this.saveHistory();
            this.renderHistory();
        }
    }

    renderHistory() {
        this.historyColors.innerHTML = '';
        this.colorHistory.forEach(hex => {
            const colorEl = document.createElement('div');
            colorEl.className = 'history-color';
            colorEl.style.backgroundColor = hex;
            colorEl.addEventListener('click', () => {
                const hsl = this.hexToHsl(hex);
                this.currentColor = { ...hsl, a: this.currentColor.a };
                this.updateColor();
            });
            this.historyColors.appendChild(colorEl);
        });
    }

    clearHistory() {
        this.colorHistory = [];
        this.saveHistory();
        this.renderHistory();
    }

    saveHistory() {
        localStorage.setItem('colorPickerHistory', JSON.stringify(this.colorHistory));
    }

    loadHistory() {
        const saved = localStorage.getItem('colorPickerHistory');
        return saved ? JSON.parse(saved) : [];
    }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    new ColorPicker();
});