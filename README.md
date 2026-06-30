# Push Agent — 网易新闻 Push 数据分析平台

基于 AI Agent 的 Push 推送业务数据分析平台原型。实现从「异常发现 → 归因定位 → 策略建议 → 执行闭环」的全链路智能化分析。

## 快速启动

```bash
# 1. 克隆项目
git clone git@github.com:hezi33/push-agent-platform.git
cd push-agent-platform

# 2. 安装依赖
cd frontend
npm install

# 3. 启动开发服务器
npm run dev
```

浏览器打开 **http://localhost:5173** 即可看到数据看板首页。

> 🚫 **无需后端！** 原型阶段使用 MSW (Mock Service Worker) 拦截 API 请求，所有数据为 Mock 数据，无网络依赖。

## 项目结构

```
push-agent-platform/
├── README.md                           # 本文件
├── CLAUDE.md                           # 项目全局指南（入口文档）
├── DESIGN.md                           # 设计规范（色彩/字体/页面设计/组件）
├── TECH.md                             # 技术栈文档
├── _agent_prd_push.md                  # Agent PRD（产品需求）
├── 网易新闻数据分析-...Agent机会点.md    # 业务流程调研报告
│
├── 2024.07.17/                         # 原始数据和 Python 脚本（参考）
│
└── frontend/                           # 前端原型
    ├── src/
    │   ├── pages/
    │   │   ├── Dashboard/              # ✅ 数据看板首页
    │   │   ├── AnomalyDetail/          # ✅ 异常详情页
    │   │   ├── Attribution/            # ⏳ 归因分析页
    │   │   ├── Strategy/               # ⏳ 策略建议页
    │   │   └── History/                # ⏳ 处理记录页
    │   ├── components/
    │   │   ├── layout/AppLayout.tsx    # 侧边栏 + Header 布局
    │   │   ├── charts/                 # 图表组件（趋势图/漏斗图/偏离度图/柱状图）
    │   │   └── common/AgentStatusBar.tsx  # Agent 状态栏
    │   ├── mocks/                      # MSW Mock 数据
    │   ├── theme/                      # 主题配置（Ant Design Token）
    │   ├── stores/                     # Zustand 全局状态
    │   └── types/                      # TypeScript 类型定义
    └── public/
        └── mockServiceWorker.js        # MSW Service Worker
```

## 页面清单

| # | 页面 | 路由 | 状态 |
|---|------|------|:--:|
| 1 | 数据看板首页 | `/dashboard` | ✅ |
| 2 | 异常详情页 | `/anomaly/:alertId` | ✅ |
| 3 | 归因分析页 | `/attribution/:reportId` | ⏳ |
| 4 | 策略建议页 | `/strategy/:suggestionId` | ⏳ |
| 5 | 处理记录页 | `/history` | ⏳ |

## 技术栈

React 18 + TypeScript + Ant Design 5 + ECharts 5 + TanStack Query + Zustand + MSW

详见 [TECH.md](TECH.md)

## 文档

| 文档 | 说明 |
|------|------|
| [CLAUDE.md](CLAUDE.md) | 🚀 项目入口指南，阅读顺序和业务背景 |
| [DESIGN.md](DESIGN.md) | 设计规范（色彩/字体/5 页面详细设计） |
| [TECH.md](TECH.md) | 技术栈（框架选型/分阶段实施路径） |
| [_agent_prd_push.md](_agent_prd_push.md) | Agent PRD（职责边界/工作流/状态机） |
