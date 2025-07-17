# AI工具集 - 统一样式系统

## 📋 概述

这是一个完整的、模块化的CSS样式系统，为AI工具集项目提供统一的设计语言和组件库。

## 🏗️ 架构

```
assets/css/
├── base/
│   ├── variables.css      # 设计系统变量
│   └── reset.css          # CSS重置
├── components/
│   ├── buttons.css        # 按钮组件
│   ├── forms.css          # 表单组件
│   ├── layout.css         # 布局组件
│   └── utilities.css      # 工具类
├── common.css             # 主页面样式
├── tools-unified.css      # 工具页面统一样式
└── README.md             # 使用说明
```

## 🎨 设计系统

### 颜色系统
```css
/* 主色调 */
--primary-color: #4d90fe;
--primary-hover: #3b82f6;
--primary-light: rgba(77, 144, 254, 0.1);

/* 状态颜色 */
--success-color: #10B981;
--warning-color: #F59E0B;
--danger-color: #EF4444;
--info-color: #3B82F6;
```

### 间距系统
```css
--spacing-xs: 8px;
--spacing-sm: 16px;
--spacing-md: 24px;
--spacing-lg: 32px;
--spacing-xl: 48px;
```

### 圆角系统
```css
--radius-sm: 6px;
--radius-md: 8px;
--radius-lg: 12px;
--radius-xl: 16px;
--radius-2xl: 24px;
```

### 阴影系统
```css
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.06);
--shadow-base: 0 4px 12px rgba(0, 0, 0, 0.08);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.12);
```

## 🧩 组件使用

### 按钮组件
```html
<!-- 基础按钮 -->
<button class="btn btn-primary">主要按钮</button>
<button class="btn btn-secondary">次要按钮</button>
<button class="btn btn-success">成功按钮</button>

<!-- 按钮尺寸 -->
<button class="btn btn-primary btn-sm">小按钮</button>
<button class="btn btn-primary">默认按钮</button>
<button class="btn btn-primary btn-lg">大按钮</button>

<!-- 轮廓按钮 -->
<button class="btn btn-outline-primary">轮廓按钮</button>

<!-- 返回按钮 -->
<a href="/" class="back-btn">← 返回</a>
```

### 表单组件
```html
<!-- 表单组 -->
<div class="form-group">
    <label class="form-label">标签</label>
    <input type="text" class="form-control" placeholder="请输入...">
</div>

<!-- 文本域 -->
<textarea class="input-textarea" placeholder="请输入内容..."></textarea>

<!-- 上传区域 -->
<div class="upload-area">
    <div class="upload-icon">📁</div>
    <h3>拖拽文件到这里</h3>
    <p>或点击选择文件</p>
</div>
```

### 布局组件
```html
<!-- 工具页面容器 -->
<div class="tool-container">
    <header class="tool-header">
        <a href="/" class="back-btn">← 返回</a>
        <h1>工具标题</h1>
        <p>工具描述</p>
    </header>
    
    <div class="tool-content">
        <div class="input-section">
            <!-- 输入区域 -->
        </div>
        <div class="output-section">
            <!-- 输出区域 -->
        </div>
    </div>
</div>
```

## 🛠️ 工具类

### 间距工具类
```html
<!-- 外边距 -->
<div class="m-sm">小外边距</div>
<div class="mt-md">顶部中等外边距</div>
<div class="mx-auto">水平居中</div>

<!-- 内边距 -->
<div class="p-lg">大内边距</div>
<div class="py-sm">垂直小内边距</div>
```

### 布局工具类
```html
<!-- 弹性布局 -->
<div class="flex flex-between">
    <span>左侧</span>
    <span>右侧</span>
</div>

<!-- 网格布局 -->
<div class="grid grid-2">
    <div>项目1</div>
    <div>项目2</div>
</div>

<!-- 显示控制 -->
<div class="d-none sm:d-block">移动端隐藏</div>
```

### 文本工具类
```html
<!-- 文本颜色 -->
<p class="text-primary">主色调文本</p>
<p class="text-muted">灰色文本</p>
<p class="text-success">成功文本</p>

<!-- 文本大小 -->
<h1 class="text-3xl font-bold">大标题</h1>
<p class="text-sm text-secondary">小文本</p>

<!-- 文本对齐 -->
<p class="text-center">居中文本</p>
```

## 📱 响应式设计

### 断点系统
- **移动端**: `max-width: 768px`
- **平板端**: `769px - 1024px`
- **桌面端**: `min-width: 1025px`

### 响应式工具类
```html
<!-- 响应式显示 -->
<div class="d-block sm:d-none">桌面显示，移动隐藏</div>
<div class="d-none sm:d-block">移动显示，桌面隐藏</div>

<!-- 响应式网格 -->
<div class="grid grid-1 md:grid-2 lg:grid-3">
    <!-- 移动端1列，平板2列，桌面3列 -->
</div>
```

## 🌙 深色主题

### 主题切换
```javascript
// 切换主题
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-theme', 'light');
```

### 主题变量
```css
/* 浅色主题 */
:root {
    --bg-primary: #FFFFFF;
    --text-primary: #333333;
}

/* 深色主题 */
[data-theme="dark"] {
    --bg-primary: #1a1a1a;
    --text-primary: #cccccc;
}
```

## 🚀 如何使用

### 1. 主页面
```html
<link rel="stylesheet" href="./assets/css/common.css">
```

### 2. 工具页面
```html
<link rel="stylesheet" href="../../../assets/css/tools-unified.css">
```

### 3. 自定义工具
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>我的工具 - AI工具集</title>
    <link rel="stylesheet" href="../../../assets/css/tools-unified.css">
</head>
<body>
    <div class="tool-container">
        <header class="tool-header">
            <a href="../../../index.html" class="back-btn">← 返回</a>
            <h1>🛠️ 我的工具</h1>
            <p>工具描述</p>
        </header>
        
        <div class="tool-content">
            <div class="input-section">
                <h3>输入</h3>
                <textarea class="input-textarea" placeholder="请输入内容..."></textarea>
                <div class="input-actions">
                    <button class="btn btn-secondary">清空</button>
                    <button class="btn btn-primary">处理</button>
                </div>
            </div>
            
            <div class="output-section">
                <h3>输出</h3>
                <div class="result-section">
                    <!-- 结果内容 -->
                </div>
            </div>
        </div>
    </div>
</body>
</html>
```

## 📊 优势

### ✅ 统一性
- 所有组件使用相同的设计变量
- 一致的视觉风格和交互体验
- 统一的响应式行为

### ✅ 可维护性
- 模块化架构，易于维护
- 集中管理设计变量
- 清晰的文件结构

### ✅ 可扩展性
- 易于添加新组件
- 支持主题定制
- 丰富的工具类系统

### ✅ 性能优化
- 消除重复代码
- 优化CSS文件大小
- 支持现代浏览器特性

## 🔧 自定义

### 修改设计变量
编辑 `assets/css/base/variables.css` 文件：

```css
:root {
    /* 自定义主色调 */
    --primary-color: #your-color;
    
    /* 自定义间距 */
    --spacing-md: 20px;
    
    /* 自定义圆角 */
    --radius-lg: 10px;
}
```

### 添加新组件
1. 在 `assets/css/components/` 目录创建新文件
2. 在 `tools-unified.css` 中引入
3. 遵循现有的命名约定

### 扩展工具类
在 `assets/css/components/utilities.css` 中添加新的工具类：

```css
/* 自定义工具类 */
.my-custom-class {
    /* 样式定义 */
}
```

## 📝 最佳实践

1. **优先使用组件类**：使用 `.btn`、`.form-control` 等组件类
2. **合理使用工具类**：用于微调和布局
3. **保持一致性**：使用设计系统中的变量
4. **响应式优先**：考虑移动端体验
5. **语义化HTML**：使用合适的HTML标签

## 🐛 常见问题

### Q: 为什么我的样式没有生效？
A: 检查CSS文件引入顺序，确保 `tools-unified.css` 在最后引入。

### Q: 如何自定义主题色？
A: 修改 `variables.css` 中的 `--primary-color` 变量。

### Q: 响应式断点如何使用？
A: 使用 `sm:`、`md:`、`lg:` 前缀的工具类。

### Q: 如何添加新的工具页面？
A: 复制现有工具的HTML结构，引入 `tools-unified.css`。

---

## 📄 更新日志

### v1.0.0 (2024-01-01)
- ✨ 初始版本发布
- 🎨 完整的设计系统
- 🧩 模块化组件库
- 📱 响应式设计
- 🌙 深色主题支持 