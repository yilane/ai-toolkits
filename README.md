# AI工具集 - 智能工具平台

一个现代化的AI工具集合网站，提供多种实用的在线工具，帮助用户提升工作效率。

## 🌟 项目特色

- **🎨 现代化设计**：采用响应式设计，支持深色/浅色主题切换
- **📂 分类清晰**：7大工具分类，23个实用工具，便于查找和使用
- **⭐ 原创工具**：包含4个自主开发的原创工具
- **🔧 易于扩展**：模块化架构，通过JSON配置即可添加新工具
- **👥 用户友好**：直观的界面设计，支持搜索和分类筛选
- **📱 全端适配**：完美支持桌面端、平板端和移动端
- **⚡ 性能优化**：启用懒加载、压缩和缓存等优化策略

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

### 当前主题色彩方案

```css
:root {
    --primary-color: #4d90fe;    /* 主色调 - 蓝色 */
    --secondary-color: #5B6AFF;  /* 次要色调 - 紫蓝色 */
    --accent-color: #667EEA;     /* 强调色 - 渐变蓝 */
    --success-color: #10B981;    /* 成功色 - 绿色 */
    --warning-color: #F59E0B;    /* 警告色 - 橙色 */
    --danger-color: #EF4444;     /* 危险色 - 红色 */
    --info-color: #3B82F6;       /* 信息色 - 蓝色 */
}
```

### 主题功能
- ✅ **深色模式**：支持深色/浅色主题切换
- ✅ **自动适配**：根据系统主题自动切换
- ✅ **记忆功能**：保存用户主题偏好

### 自定义主题

1. 修改 `config/app.json` 中的颜色配置
2. 编辑 `assets/css/common.css` 中的CSS变量
3. 在JavaScript中扩展主题切换逻辑

## 📱 响应式设计

网站完美适配各种设备尺寸：

- **🖥️ 桌面端**：1025px及以上 - 完整功能体验
- **📱 平板端**：769px - 1024px - 优化的触控体验  
- **📱 移动端**：768px及以下 - 简洁的移动界面

### 设计参数
- 最大宽度：1200px
- 侧边栏宽度：240px
- 头部高度：60px
- 卡片最小宽度：280px
- 网格间距：24px

## 🔧 可用工具 (共23个)

### 🖼️ 图像处理工具 (7个)
- **压缩图像文件** - 压缩JPG、PNG、SVG、以及GIF，同时节省空间，保持质量
- **调整图像的大小** - 按照百分比或像素来定义尺寸，并调整图片尺寸
- **裁剪图片** - 通过设定像素来裁剪图像文件
- **照片编辑器** - 利用文字、效果、镜像或贴纸，让图片更加生动有趣
- **去除背景** 🆕 - 快速删除图像的背景，并保持高质量
- **给图片加水印** - 快速给你的图片加上图像或文字水印
- **旋转一个图片** - 同时旋转多个JPG、PNG或GIF图片

### 📝 文本处理工具 (8个)
- **Markdown编辑器** 🆕 - 支持实时预览的Markdown编辑器，可导出文档和复制HTML
- **文字加密解密** 🆕 - 支持URL编码、Base64、MD5、SHA1、SHA256等多种加密解密方式
- **Hex转字符串** 🆕 - 十六进制编码与文本字符串的相互转换，支持多种编码格式
- **摩斯电码** 🆕 - 摩斯电码与文本的相互转换，支持音频播放和可视化显示
- **中文简繁体转换** 🆕 - 中文简体字与繁体字的相互转换，支持批量处理
- **数字转大写** 🆕 - 阿拉伯数字转换为中文大写数字，支持金额格式
- **ASCII表格生成** 🆕 - 生成ASCII表格和Markdown表格，支持自定义格式
- **文本对比** 🆕 - 比较两个文本的差异，高亮显示不同之处

### 🔄 格式转换工具 (4个)
- **转换至JPG文件** - 轻松地把其他格式图片转换至JPG格式
- **JPG文件转换至** - 转换JPG图像文件至PNG文件或GIF文件
- **PDF转JPG** 🆕 - 提取PDF文档中的所有图像文件，或将每一页转换为JPG图片
- **JPG转PDF** 🆕 - 将您的图片转换为PDF文档，还可以调整方向和边距

### ⭐ 原创工具 (4个)
- **高级文字计数器** 🆕 - 专业的文本分析工具，支持词频统计、语言检测、阅读时间估算等高级功能
- **颜色选择器** 🆕 - 选择和转换颜色格式，支持HEX、RGB、HSL等多种格式，生成调色板
- **二维码生成器** 🆕 - 快速生成各种类型的二维码，支持文本、链接、WiFi、邮箱等多种格式
- **JSON格式化** 🆕 - 格式化、验证、压缩和美化JSON数据，提供详细的数据结构分析

> 🆕 表示新增工具

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

## 📊 项目统计

- **总工具数量**：23个
- **工具分类**：7大类别
- **原创工具**：4个
- **新增工具**：11个
- **支持设备**：桌面端、平板端、移动端
- **主题支持**：深色/浅色模式

## 🚀 性能优化

### 已启用的优化策略
- ✅ **懒加载**：按需加载工具内容
- ✅ **压缩**：资源文件压缩
- ✅ **缓存**：浏览器缓存策略
- ✅ **响应式图片**：自适应图片大小
- ✅ **代码分离**：HTML、CSS、JS分离

### 性能限制
- 最大图片大小：2MB
- 最大文件大小：10MB
- 支持的图片格式：JPG、PNG、GIF、SVG、WEBP、HEIC

## 🔮 未来规划

### 即将推出的功能
- [ ] 用户收藏功能
- [ ] PWA支持
- [ ] 数据分析统计
- [ ] 工具使用教程
- [ ] 工具评分系统
- [ ] 快捷键支持

### 计划新增工具
- [ ] 音频处理工具
- [ ] 视频处理工具
- [ ] 更多AI生成工具
- [ ] 代码格式化工具
- [ ] 网络工具集

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

## 📈 更新日志

### v1.0.0 (当前版本)
- ✅ 完成基础架构搭建
- ✅ 实现7大工具分类
- ✅ 添加23个实用工具
- ✅ 支持深色/浅色主题
- ✅ 实现响应式设计
- ✅ 添加搜索和筛选功能
- ✅ 优化性能和用户体验
