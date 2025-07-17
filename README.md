# AI工具集 - 智能工具平台

一个现代化的AI工具集合网站，提供多种实用的在线工具，帮助用户提升工作效率。

## 🌟 项目特色

- **现代化设计**：采用响应式设计，支持深色/浅色主题切换
- **分类清晰**：工具按功能分类，便于查找和使用
- **原创工具**：包含自主开发的原创工具
- **易于扩展**：模块化架构，便于添加新工具
- **用户友好**：直观的界面设计，良好的用户体验

## 📁 项目结构

```
AiToolkit/
├── index.html                 # 主页面
├── assets/                    # 静态资源
│   ├── css/
│   │   └── common.css        # 通用样式
│   ├── js/
│   │   ├── main.js          # 主应用逻辑
│   │   └── utils.js         # 工具函数
│   └── images/              # 图片资源
├── data/
│   └── tools.json           # 工具数据配置
├── tools/                   # 工具目录
│   ├── custom/              # 原创工具
│   │   ├── word-counter/    # 文字计数器
│   │   │   ├── index.html   # 页面结构
│   │   │   ├── style.css    # 样式文件
│   │   │   └── script.js    # 逻辑文件
│   │   ├── color-picker/    # 颜色选择器
│   │   ├── qr-generator/    # 二维码生成器
│   │   └── json-formatter/  # JSON格式化工具
│   ├── image/               # 图片处理工具
│   │   ├── compressor/      # 图片压缩
│   │   ├── resizer/         # 图片大小调整
│   │   ├── cropper/         # 图片裁剪
│   │   ├── enhancer/        # 图片质量提升
│   │   ├── bg-remover/      # 背景去除
│   │   ├── watermark/       # 水印添加
│   │   └── rotator/         # 图片旋转
│   └── converter/           # 格式转换工具
│       ├── to-jpg/          # 转换至JPG
│       ├── from-jpg/        # JPG转换
│       └── html-to-image/   # HTML转图片
├── config/
│   └── app.json            # 应用配置
├── docs/                   # 文档
└── README.md              # 项目说明
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/ai-toolkit.git
cd ai-toolkit
```

### 2. 启动项目

由于项目使用原生HTML/CSS/JavaScript，可以直接在浏览器中打开：

```bash
# 方式1：直接打开
open index.html

# 方式2：使用本地服务器（推荐）
python -m http.server 8000
# 或者
npx serve .
```

### 3. 访问网站

在浏览器中打开 `http://localhost:8000` 即可访问网站。

## 🛠️ 添加新工具

### 1. 在tools.json中添加配置

编辑 `data/tools.json` 文件，在 `tools` 数组中添加新工具：

```json
{
  "id": 17,
  "name": "您的工具名称",
  "description": "工具描述",
  "icon": "🛠️",
  "iconColor": "#FF6B6B",
  "category": "custom",
  "isNew": true,
  "url": "./tools/custom/your-tool/",
  "author": "您的名字",
  "version": "1.0.0"
}
```

### 2. 创建工具目录

```bash
mkdir -p tools/custom/your-tool
```

### 3. 创建工具文件

在 `tools/custom/your-tool/` 目录下创建：

- `index.html` - 主页面
- `style.css` - 样式文件
- `script.js` - JavaScript逻辑文件

### 4. 工具模板

#### index.html
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>您的工具名称 - AI工具集</title>
    <link rel="stylesheet" href="../../../assets/css/common.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="tool-container">
        <div class="tool-header">
            <a href="../../../index.html" class="back-button">←</a>
            <h1 class="tool-title">您的工具名称</h1>
            <p class="tool-description">工具描述</p>
        </div>
        
        <!-- 工具内容 -->
        <div class="tool-content">
            <!-- 在此添加您的工具界面 -->
        </div>
    </div>
    
    <script src="../../../assets/js/utils.js"></script>
    <script src="script.js"></script>
</body>
</html>
```

#### style.css
```css
/* 工具特定样式 */
.tool-content {
    /* 您的样式 */
}
```

#### script.js
```javascript
// 您的工具逻辑
document.addEventListener('DOMContentLoaded', function() {
    // 初始化代码
});
```

## 🎨 主题定制

### 修改主题色彩

编辑 `assets/css/common.css` 文件中的CSS变量：

```css
:root {
    --primary-color: #4d90fe;    /* 主色调 */
    --secondary-color: #5B6AFF;  /* 次要色调 */
    --accent-color: #667EEA;     /* 强调色 */
    /* ... 其他颜色变量 */
}
```

### 添加新主题

1. 在CSS文件中添加新的主题变量
2. 在JavaScript中扩展主题切换逻辑

## 📱 响应式设计

网站支持以下设备：

- **桌面端**：1025px及以上
- **平板端**：769px - 1024px
- **移动端**：768px及以下

## 🔧 可用工具

### 图像处理工具
- 压缩图像文件
- 调整图像大小
- 裁剪图片
- 提升图片质量
- 去除背景
- 添加水印
- 旋转图片

### 文本处理工具
- 文字计数器（原创）
- 高级文本分析

### 格式转换工具
- 转换至JPG文件
- JPG文件转换
- HTML转图片

### 实用工具
- 颜色选择器（原创）
- 二维码生成器（原创）
- JSON格式化工具（原创）

### AI生成工具
- 搞笑创意图片生成器

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 开发规范

### 代码规范
- 使用ES6+语法
- 遵循JSDoc注释规范
- 保持代码简洁清晰
- HTML、CSS、JavaScript代码分离

### 工具开发规范
- 每个工具独立目录
- 代码分离：HTML、CSS、JS分别存放
- 使用统一的样式规范
- 提供完整的功能描述
- 包含适当的错误处理
- 统一的返回按钮和标题布局

### 文件命名规范
- 使用kebab-case命名文件和目录
- JavaScript文件使用camelCase命名变量和函数
- CSS类名使用kebab-case

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢所有贡献者的努力
- 感谢开源社区的支持
- 特别感谢用户的反馈和建议

## 📞 联系我们

- 项目主页：https://ai-toolkit.example.com
- 问题反馈：https://github.com/ai-toolkit/ai-toolkit/issues
- 邮箱：support@ai-toolkit.example.com

---

⭐ 如果这个项目对您有帮助，请给我们一个Star！