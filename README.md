# 元素决斗 · 手机端 (Element Duel Mobile)

## 快速启动

### 环境要求
- Node.js >= 18
- pnpm（推荐）或 npm

### 安装与运行

```bash
# 进入项目目录
cd element-duel-mobile

# 安装依赖
pnpm install
# 或 npm install

# 启动开发服务器（默认端口 5174）
pnpm dev
# 或 npm run dev
```

浏览器访问 http://localhost:5174 即可预览（建议使用手机浏览器或开启开发者工具的移动端模拟）。

### 构建生产版本

```bash
pnpm build
# 构建产物位于 dist/ 目录
```

## 项目结构

```
element-duel-mobile/
├── client/
│   ├── public/
│   │   ├── bosses/          # Boss 晶体精灵图像（boss_1.webp ~ boss_20.webp）
│   │   └── ...              # 其他静态资源
│   └── src/
│       ├── components/game/ # 战斗、卡牌等核心组件
│       ├── contexts/        # 游戏状态管理（GameContext）
│       ├── lib/             # 战斗引擎、关卡数据、卡牌数据
│       └── pages/           # 各页面组件
├── package.json
├── pnpm-lock.yaml
└── vite.config.ts
```

## 主要功能

- 20 关化学教学卡牌战斗
- 手机竖屏深度适配，支持触控拖拽出牌
- 晶体精灵风格 Boss（空洞骑士画风）
- 回合过场动画
- 元素图鉴、成就系统、知识卡片
