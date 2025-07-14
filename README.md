# AI工具集 (AI Toolkit)

一个现代化的模块化AI工具平台，提供图像处理、文本转换、格式转换等多种实用工具。

## ✨ 特性

- 🧩 **模块化架构** - 易于扩展和维护的插件式工具系统
- 🎨 **现代化UI** - 响应式设计，支持深色/浅色主题
- 🔍 **智能搜索** - 实时搜索工具，支持模糊匹配
- 📱 **移动友好** - 完美适配各种设备尺寸
- ⚡ **高性能** - 基于ES6模块的轻量级架构
- 🛡️ **类型安全** - 完善的输入验证和错误处理
- 🌐 **无障碍** - 符合Web无障碍标准

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- npm >= 8.0.0
- 现代浏览器（支持ES6模块）

### 安装

```bash
# 克隆项目
git clone https://github.com/ai-toolkit/ai-toolkit.git
cd ai-toolkit

# 安装依赖
npm install

# 启动开发服务器
npm start
```

访问 `http://localhost:8080` 查看应用。

### 构建

```bash
# 构建生产版本
npm run build

# 运行测试
npm test

# 代码检查
npm run lint
```

## 🛠️ 已集成的工具

### 图像处理
- **图像压缩** - 压缩 JPG、PNG、GIF、SVG 图像
- **尺寸调整** - 按像素或百分比调整图像大小
- **图像裁剪** - 自定义裁剪区域
- **背景移除** - AI驱动的背景自动移除
- **添加水印** - 文字或图像水印
- **图像旋转** - 任意角度旋转
- **质量提升** - AI图像超分辨率

### 格式转换
- **JPG转换器** - 其他格式转JPG
- **格式转换** - JPG转其他格式
- **HTML转图片** - 网页截图生成

### AI生成
- **表情包生成器** - 自定义表情包制作

## 🏗️ 架构设计

### 核心模块

```
src/
├── core/                    # 核心系统
│   ├── app.js              # 主应用入口
│   ├── config-manager.js   # 配置管理
│   ├── theme.js            # 主题管理
│   └── search.js           # 搜索功能
├── tools/                  # 工具模块
│   ├── base/               # 基础接口
│   ├── image/              # 图像处理工具
│   ├── text/               # 文本处理工具
│   └── converter/          # 格式转换工具
└── assets/                 # 静态资源
    ├── css/                # 样式文件
    └── icons/              # 图标资源
```

### 设计模式

- **模块化** - ES6模块系统
- **插件架构** - 可扩展的工具注册机制  
- **观察者模式** - 事件驱动的组件通信
- **策略模式** - 可配置的工具行为
- **工厂模式** - 动态工具实例创建

## 📖 开发指南

### 添加新工具

1. 创建工具类继承 `ToolInterface`：

```javascript
import ToolInterface from '../base/tool-interface.js';

export default class MyTool extends ToolInterface {
  constructor() {
    super({
      id: 'my-tool',
      name: '我的工具',
      description: '工具描述',
      category: 'image',
      icon: '🔧',
      version: '1.0.0'
    });
  }

  async execute(input, options = {}) {
    // 实现工具逻辑
  }

  getUI() {
    // 返回工具的HTML界面
  }
}
```

2. 在 `src/config/tools.json` 中注册工具：

```json
{
  "id": "my-tool",
  "name": "我的工具",
  "description": "工具描述",
  "category": "image",
  "module": "image/my-tool.js",
  "enabled": true
}
```

### 自定义主题

```javascript
// 注册新主题
themeManager.registerTheme('my-theme', {
  name: '我的主题',
  variables: {
    '--primary-color': '#ff6b6b',
    '--bg-primary': '#ffffff'
    // ... 更多变量
  }
});
```

### 插件开发

```javascript
import PluginInterface from '../core/plugin-interface.js';

export default class MyPlugin extends PluginInterface {
  async onLoad(app) {
    // 插件加载逻辑
  }

  registerHooks(hookManager) {
    // 注册钩子函数
  }
}
```

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

测试文件位于 `tests/` 目录，使用 Jest 测试框架。

## 📋 API 参考

### ToolInterface

工具基类，所有工具必须继承此类。

#### 方法

- `execute(input, options)` - 执行工具功能
- `validate(input)` - 验证输入数据
- `getUI()` - 获取工具界面HTML
- `cleanup()` - 清理资源

### ConfigManager

配置管理器，负责加载和管理应用配置。

#### 方法

- `loadConfigs()` - 加载配置文件
- `get(key, defaultValue)` - 获取配置值
- `set(key, value)` - 设置配置值
- `watch(key, callback)` - 监听配置变化

### ThemeManager

主题管理器，负责主题切换和样式管理。

#### 方法

- `setTheme(themeId)` - 设置当前主题
- `getAvailableThemes()` - 获取可用主题
- `registerTheme(id, theme)` - 注册新主题

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 提交规范

使用 [Conventional Commits](https://conventionalcommits.org/) 规范：

- `feat:` 新功能
- `fix:` 修复
- `docs:` 文档
- `style:` 格式
- `refactor:` 重构
- `test:` 测试
- `chore:` 构建过程或辅助工具

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- 感谢所有贡献者的付出
- 特别感谢开源社区的支持
- 感谢用户的反馈和建议

## 📞 联系我们

- 项目主页: https://ai-toolkit.example.com
- 问题反馈: https://github.com/ai-toolkit/ai-toolkit/issues
- 邮箱: contact@ai-toolkit.example.com

## 🔗 相关链接

- [在线演示](https://demo.ai-toolkit.example.com)
- [开发文档](https://docs.ai-toolkit.example.com)
- [更新日志](CHANGELOG.md)
- [贡献指南](CONTRIBUTING.md)

---

⭐ 如果这个项目对你有帮助，请给我们一个 star！