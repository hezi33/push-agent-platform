# 网易新闻 Push 数据分析 Agent 系统 — 技术栈文档 (TECH.md)

---

## 一、技术选型总览

```
┌──────────────────────────────────────────────────────────────────┐
│                        展示层 (Presentation)                      │
│  React 18 + TypeScript + Ant Design 5 + ECharts                  │
├──────────────────────────────────────────────────────────────────┤
│                        状态与路由 (State & Routing)               │
│  Zustand + TanStack Query + React Router v6                       │
├──────────────────────────────────────────────────────────────────┤
│                        API 网关层 (API Gateway)                   │
│  FastAPI (Python 3.11+) + WebSocket                               │
├──────────────────────────────────────────────────────────────────┤
│                        AI Agent 层 (Agent Orchestration)          │
│  LangChain + LangGraph + Claude API / 本地模型                    │
├──────────────────────────────────────────────────────────────────┤
│                        数据层 (Data Layer)                        │
│  MySQL 8.0 + Redis 7 + ClickHouse (可选，OLAP)                    │
├──────────────────────────────────────────────────────────────────┤
│                        基础设施 (Infrastructure)                   │
│  Docker + Docker Compose + Nginx                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 二、前端技术栈

### 2.1 核心框架

| 技术 | 版本 | 选型理由 |
|------|------|---------|
| **React** | 18.3+ | 生态最丰富，Ant Design 原生支持，团队招聘容易 |
| **TypeScript** | 5.5+ | 类型安全，复杂数据模型（18 种状态、多维度指标）必须有类型约束 |
| **Vite** | 5.x | 开发启动 < 1s，HMR 极快，构建产物小 |

**项目初始化：**

```bash
npm create vite@latest push-agent-platform -- --template react-ts
```

### 2.2 UI 组件库

| 技术 | 版本 | 用途 |
|------|------|------|
| **Ant Design** | 5.20+ | 主 UI 库：表格、表单、卡片、Tag、Badge、Modal、Drawer、Timeline、Progress、Skeleton |
| **@ant-design/icons** | 5.x | 图标库 |
| **@ant-design/pro-components** | 2.x | ProTable（高级表格）、ProLayout（侧边栏布局）、ProCard（统计卡片） |

**选型理由：**
- Ant Design 5.x 支持 CSS-in-JS (CSS Variables)，与 DESIGN.md 定义的 Token 体系天然对应
- ProComponents 自带企业级 Dashboard 常用模式（统计卡片、高级表格），减少 30%+ 的重复代码
- 中文文档完善、社区活跃，适合国内团队

**Token 映射（Ant Design 5 ConfigProvider）：**

```typescript
// theme.ts — 将 DESIGN.md 中的设计 Token 映射到 Ant Design
const theme = {
  token: {
    colorPrimary: '#165DFF',
    colorSuccess: '#00B42A',
    colorWarning: '#FF7D00',
    colorError: '#F53F3F',
    colorInfo: '#165DFF',
    borderRadius: 8,
    fontFamily: `-apple-system, BlinkMacSystemFont, "PingFang SC", ...`,
  },
};
```

### 2.3 图表库

| 技术 | 版本 | 用途 |
|------|------|------|
| **ECharts** | 5.5+ | 主图表库：折线图、柱状图、桑基图、漏斗图、仪表盘、散点图、热力图 |
| **echarts-for-react** | 3.x | React 封装，声明式使用 |

**选型理由：**
- ECharts 功能最全面，桑基图（漏斗转化）、仪表盘（置信度）开箱即用
- 中文文档和示例最丰富，团队学习成本最低
- 性能优秀，百万级数据点渲染无压力
- 对比 AntV/G2：ECharts 生态更成熟，遇到问题更容易搜到解决方案

**项目中用到的图表类型：**

| 图表 | 使用页面 | ECharts 类型 |
|------|---------|-------------|
| 迷你趋势图（数据卡片内） | 数据看板 | `line` (sparkline) |
| 核心指标多系列折线图 | 数据看板 | `line` (multi-series + markPoint) |
| 漏斗转化桑基图 | 数据看板 | `sankey` |
| 偏离度折线图 + 置信区间 | 异常详情 | `line` + `areastyle` 置信带 |
| 多维分组柱状图（厂商/省份） | 异常详情 | `bar` (grouped) |
| 贡献度决策树 | 归因分析 | `tree` |
| 漏斗环节对比图 | 归因分析 | `funnel` 或自定义对比条 |
| 置信度仪表盘 | 归因分析 | `gauge` |
| 效果预估对比 | 策略建议 | `bar` (compare) |
| 执行时间线 | 策略建议 | 自定义组件 + `timeline` |

### 2.4 状态管理

| 技术 | 用途 | 理由 |
|------|------|------|
| **Zustand** | 全局状态（用户信息、通知未读数、全局筛选条件） | 轻量（< 1KB）、无 Boilerplate、TS 友好 |
| **TanStack Query (React Query)** | 服务端状态（数据卡片、告警列表、归因结果、策略跟踪） | 自动缓存/轮询/重试/乐观更新，完美契合数据 Dashboard 场景 |

**职责划分原则：**
- 服务端来的数据（告警列表、指标数据、归因报告）→ TanStack Query 管理
- 纯 UI 状态（侧边栏展开/收缩、弹窗显隐、表单输入）→ React 本地 state
- 跨组件共享的 UI 状态（全局时间范围、通知计数）→ Zustand

**TanStack Query 配置示例：**

```typescript
// 数据看板 — 指标卡片，每 5 分钟自动刷新
const { data: metrics } = useQuery({
  queryKey: ['dashboard', 'metrics', dateRange],
  queryFn: () => fetchMetrics(dateRange),
  refetchInterval: 5 * 60 * 1000, // 5 分钟轮询
});

// 归因分析 — 进行中每 10 秒轮询进度
const { data: attributionProgress } = useQuery({
  queryKey: ['attribution', reportId],
  queryFn: () => fetchAttributionProgress(reportId),
  refetchInterval: (data) => data?.status === 'S07' ? 10_000 : false, // 完成后停止
});
```

### 2.5 路由

| 技术 | 版本 | 用途 |
|------|------|------|
| **React Router** | 6.x | 页面路由、参数传递、面包屑 |

**路由表：**

```typescript
const routes = [
  { path: '/',             element: <Navigate to="/dashboard" /> },
  { path: '/dashboard',    element: <Dashboard />,      breadcrumb: '数据看板' },
  { path: '/anomaly/:id',  element: <AnomalyDetail />,  breadcrumb: '异常详情' },
  { path: '/attribution/:reportId', element: <Attribution />, breadcrumb: '归因分析' },
  { path: '/attribution/new',       element: <Attribution />, breadcrumb: '新建归因' },
  { path: '/strategy/:id', element: <Strategy />,       breadcrumb: '策略建议' },
  { path: '/history',      element: <History />,         breadcrumb: '处理记录' },
];
```

### 2.6 实时通信

| 技术 | 用途 |
|------|------|
| **WebSocket** (Socket.IO) | 新告警实时推送、归因进度推送、策略检查点通知 |
| **EventSource (SSE)** | 归因分析流式输出（备选方案） |

**场景：**
- 监控 Agent 发现异常 → WebSocket 推送 → Header 通知铃铛 Badge +1
- 归因进行中 → WebSocket 推送进度更新 → 归因页进度条实时刷新
- 策略检查点触发 → WebSocket 推送 → 策略页状态更新

### 2.7 前端工程化

| 工具 | 用途 |
|------|------|
| **ESLint** + `@antfu/eslint-config` | 代码规范 |
| **Prettier** | 代码格式化 |
| **Husky** + **lint-staged** | Git 提交前检查 |
| **Vitest** + **React Testing Library** | 单元测试 |
| **Playwright** | E2E 测试（关键路径：告警→归因→策略） |
| **Storybook** (可选) | 通用组件文档 |

### 2.8 前端依赖清单

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0",
    "antd": "^5.20.0",
    "@ant-design/icons": "^5.4.0",
    "@ant-design/pro-components": "^2.12.0",
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.51.0",
    "axios": "^1.7.0",
    "dayjs": "^1.11.0",
    "socket.io-client": "^4.7.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^9.0.0",
    "prettier": "^3.3.0",
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "playwright": "^1.45.0"
  }
}
```

---

## 三、后端技术栈

### 3.1 核心框架

| 技术 | 版本 | 用途 | 选型理由 |
|------|------|------|---------|
| **Python** | 3.11+ | 后端语言 | 与现有 Python 脚本（push日报、内容运营、审核统计）同语言，降低维护成本 |
| **FastAPI** | 0.112+ | Web 框架 | 高性能异步、自动 OpenAPI 文档、类型校验（Pydantic）、WebSocket 原生支持 |
| **Uvicorn** | 0.30+ | ASGI Server | FastAPI 官方推荐，生产级性能 |

### 3.2 API 设计

**目录结构：**

```
backend/
├── api/
│   ├── __init__.py
│   ├── dashboard.py        # 数据看板 API
│   ├── anomaly.py          # 异常告警 API
│   ├── attribution.py      # 归因分析 API
│   ├── strategy.py         # 策略建议 API
│   └── history.py          # 处理记录 API
├── models/
│   ├── metric.py           # 指标数据模型
│   ├── alert.py            # 告警数据模型
│   ├── attribution.py      # 归因数据模型
│   └── strategy.py         # 策略数据模型
├── services/
│   ├── monitor_service.py  # 监控 Agent 业务逻辑
│   ├── attribution_service.py  # 归因 Agent 业务逻辑
│   ├── strategy_service.py # 策略 Agent 业务逻辑
│   └── data_service.py     # 数据查询服务
├── agents/
│   ├── base.py             # Agent 基类
│   ├── monitor_agent.py    # 监控 Agent
│   ├── attribution_agent.py # 归因 Agent
│   └── strategy_agent.py   # 策略 Agent
├── core/
│   ├── config.py           # 配置管理
│   ├── database.py         # 数据库连接
│   └── redis.py            # Redis 连接
└── main.py                 # 入口
```

**核心 API 端点：**

| 方法 | 端点 | 说明 |
|------|------|------|
| `GET` | `/api/v1/dashboard/metrics` | 数据卡片指标 |
| `GET` | `/api/v1/dashboard/trends` | 核心指标趋势 |
| `GET` | `/api/v1/alerts` | 告警列表（分页+筛选） |
| `GET` | `/api/v1/alerts/{alert_id}` | 告警详情 |
| `GET` | `/api/v1/anomaly/{id}/detail` | 异常详情数据 |
| `POST` | `/api/v1/attribution/trigger` | 手动触发归因 |
| `GET` | `/api/v1/attribution/{report_id}` | 归因报告 |
| `GET` | `/api/v1/attribution/{report_id}/progress` | 归因进度 |
| `GET` | `/api/v1/strategy/{id}` | 策略建议详情 |
| `POST` | `/api/v1/strategy/{id}/approve` | 审核通过建议 |
| `POST` | `/api/v1/strategy/{id}/reject` | 驳回建议 |
| `GET` | `/api/v1/history/records` | 处理记录列表 |
| `WS` | `/ws/v1/notifications` | 实时通知推送 |

### 3.3 数据校验

| 技术 | 用途 |
|------|------|
| **Pydantic v2** | 请求/响应 Schema、数据校验、序列化 |

**示例：告警数据 Schema**

```python
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

class AlertLevel(str, Enum):
    NOTICE = "S03"   # 关注
    WARNING = "S04"  # 告警
    CRITICAL = "S05" # 严重

class AlertResponse(BaseModel):
    alert_id: str
    level: AlertLevel
    metric_name: str          # 异常指标
    deviation_sigma: float    # 偏离度 σ
    current_value: float      # 当前值
    baseline_value: float     # 基线值
    change_pct: float         # 变化百分比
    dimension: dict           # {"vendor": "小米", "province": "广东", "send_type": "本地实时"}
    estimated_loss: int       # 预估损失首启数
    detected_at: datetime     # 发现时间
    attribution_status: str | None  # 归因状态
```

### 3.4 依赖清单

```
fastapi==0.112.0
uvicorn[standard]==0.30.0
pydantic==2.8.0
sqlalchemy==2.0.0
aiomysql==0.2.0
redis==5.0.0
celery==5.4.0          # 异步任务（归因分析、巡检）
python-socketio==5.11.0
httpx==0.27.0          # 异步 HTTP 客户端
langchain==0.2.0
langgraph==0.2.0
anthropic==0.34.0      # Claude API
python-dotenv==1.0.0
```

---

## 四、AI Agent 层

### 4.1 Agent 框架选型

| 技术 | 用途 | 选型理由 |
|------|------|---------|
| **LangChain** | Agent 编排框架 | 最成熟的 LLM 应用框架，工具调用、Chain、Memory 开箱即用 |
| **LangGraph** | 状态机+工作流编排 | 完美映射 PRD 中的 18 种业务状态和状态流转，支持条件分支和循环 |
| **Claude API** (Anthropic) | 核心 LLM | 擅长数据分析推理、长上下文（归因需要大量上下文数据）、Tool Use 能力强 |

### 4.2 Agent 架构设计

**LangGraph 状态图（对应 PRD 状态机 S01-S18）：**

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    status: str           # S01-S18 状态码
    alert_level: str      # 告警级别
    metric_snapshot: dict # 指标快照
    anomaly_result: dict  # 异常检测结果
    attribution_result: dict  # 归因结果
    strategy_result: dict # 策略结果

# 构建状态图
workflow = StateGraph(AgentState)

# 添加节点（对应三个 Agent）
workflow.add_node("monitor", monitor_agent.run)
workflow.add_node("attribute", attribution_agent.run)
workflow.add_node("strategy", strategy_agent.run)
workflow.add_node("escalate", escalation_handler.run)

# 定义流转
workflow.add_conditional_edges("monitor", route_after_monitor, {
    "normal": END,       # S02 → 结束
    "alert": "attribute", # S04/S05 → 归因
})

workflow.add_conditional_edges("attribute", route_after_attribution, {
    "done": "strategy",      # S08 → 策略
    "human_review": END,     # S09 → 等待人工
})

workflow.add_conditional_edges("strategy", route_after_strategy, {
    "closed": END,           # S15 → 结束
    "escalate": "escalate",  # S16/S17 → 升级
    "re_attribute": "attribute", # S18 → 重新归因
})
```

### 4.3 LLM 选型对比

| 模型 | 优势 | 劣势 | 适用场景 |
|------|------|------|---------|
| **Claude Sonnet 4.6** | 长上下文 200K、推理能力强、Tool Use 成熟 | API 成本较高 | 归因分析（需大量上下文数据）、根因推断 |
| **Claude Haiku 4.5** | 速度快、成本低 | 复杂推理弱于 Sonnet | 监控告警（规则为主 + AI 辅助） |
| **本地部署模型** (可选) | 数据不出域、无 API 成本 | 推理质量不如 Claude | 敏感数据的初步处理、离线场景 |

**推荐策略：**
- 监控 Agent → Haiku（巡检固定逻辑为主，AI 做异常确认）
- 归因 Agent → Sonnet（核心推理链路，需要最高质量）
- 策略 Agent → Sonnet（建议生成 + 效果预估需要强推理）

### 4.4 Agent 工具定义（Tool Definitions）

每个 Agent 通过 Function Calling 调用后端服务：

**监控 Agent Tools：**

```python
tools = [
    {
        "name": "fetch_metrics_snapshot",
        "description": "获取指定维度和时间点的指标快照",
        "parameters": {
            "dims": ["send_type", "platform", "vendor", "province"],
            "metrics": ["send_uv", "show_uv", "open_uv", "open_rate", ...],
            "timestamp": "2024-07-17T14:00:00"
        }
    },
    {
        "name": "get_baseline",
        "description": "获取7天同期基线均值和标准差",
        "parameters": {
            "dim_combo": "local_realtime_xiaomi_guangdong",
            "metric": "arrive_rate",
        }
    },
    {
        "name": "send_alert",
        "description": "生成并推送告警消息",
        "parameters": {
            "level": "critical|warning|notice",
            "metric": "arrive_rate",
            "sigma": 2.8,
            "impact_estimate": "预计损失2300首启用户"
        }
    }
]
```

**归因 Agent Tools：**

```python
tools = [
    {
        "name": "decompose_contribution",
        "description": "按维度层级分解指标变化的贡献度",
    },
    {
        "name": "check_funnel",
        "description": "检查锁定的维度组合在各漏斗环节的转化率",
    },
    {
        "name": "query_content_data",
        "description": "查询指定维度下的推送内容明细（标题、打开率等）",
    },
    {
        "name": "query_vendor_status",
        "description": "查询厂商通道近期状态和策略变更记录",
    },
    {
        "name": "compare_dimension",
        "description": "对比两个维度的同期数据以排除全局因素",
    },
]
```

---

## 五、数据层

### 5.1 数据库选型

| 数据库 | 用途 | 理由 |
|--------|------|------|
| **MySQL 8.0** | 主业务数据库：告警记录、归因报告、策略记录、用户信息 | 成熟稳定、团队熟悉、与现有系统兼容 |
| **Redis 7** | 缓存：实时指标快照、Agent 状态、Celery 任务队列、WebSocket 频道 | 高性能 KV、Pub/Sub、支持数据结构丰富 |
| **ClickHouse** (可选) | OLAP 分析：历史指标大表查询、趋势分析 | 列存分析数据库，千万级数据秒级响应 |

### 5.2 核心数据表设计

#### 告警记录表

```sql
CREATE TABLE alerts (
    id            VARCHAR(32)  PRIMARY KEY,          -- ALT-20240717-001
    level         ENUM('S03','S04','S05') NOT NULL,  -- 关注/告警/严重
    metric_name   VARCHAR(64)  NOT NULL,              -- 异常指标名
    current_val   DECIMAL(12,4) NOT NULL,
    baseline_val  DECIMAL(12,4) NOT NULL,
    deviation_sigma DECIMAL(6,2) NOT NULL,
    change_pct    DECIMAL(6,2) NOT NULL,              -- 变化百分比
    dimension_json JSON        NOT NULL,              -- {"vendor":"小米","province":"广东",...}
    estimated_loss INT         DEFAULT 0,
    status        VARCHAR(8)   NOT NULL DEFAULT 'S04', -- 当前状态
    detected_at   DATETIME     NOT NULL,
    resolved_at   DATETIME,
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_detected (detected_at),
    INDEX idx_level (level),
    INDEX idx_status (status)
);
```

#### 归因报告表

```sql
CREATE TABLE attribution_reports (
    id            VARCHAR(32)  PRIMARY KEY,          -- ATTR-20240717-001
    alert_id      VARCHAR(32)  NOT NULL,
    status        ENUM('S07','S08','S09') NOT NULL,  -- 归因状态
    locked_dims   JSON         NOT NULL,              -- 锁定维度
    funnel_issue  ENUM('arrive','show','open','first_open','composite'),
    root_cause    JSON         NOT NULL,              -- [{hypothesis, confidence, evidence[]}]
    confidence    DECIMAL(5,2) NOT NULL,              -- 最高置信度
    evidence_chain JSON        NOT NULL,              -- 证据链
    next_step     TEXT,
    duration_ms   INT,                                -- 归因耗时(ms)
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alert_id) REFERENCES alerts(id)
);
```

#### 策略记录表

```sql
CREATE TABLE strategy_suggestions (
    id            VARCHAR(32)  PRIMARY KEY,          -- SUG-20240717-001
    report_id     VARCHAR(32)  NOT NULL,
    status        ENUM('S10','S11','S12','S13','S14','S15','S16','S17','S18') NOT NULL,
    problem_desc  TEXT         NOT NULL,              -- 问题描述
    suggestion    TEXT         NOT NULL,              -- 优化建议
    reference     TEXT,                               -- 参考方向
    est_effect    JSON         NOT NULL,              -- 预估效果 {"improvement_pct": 10.2, "improvement_abs": 1200}
    editor_id     VARCHAR(32)  NOT NULL,              -- 负责编辑
    checkpoints   JSON         NOT NULL,              -- {"D+1":"2024-07-18", "D+3":"2024-07-20", "D+7":"2024-07-24"}
    actual_effect JSON,                               -- 实际效果（闭环后填充）
    strategy_rating DECIMAL(3,1),                     -- 策略效果评分 0-100
    created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (report_id) REFERENCES attribution_reports(id)
);
```

---

## 六、分阶段实施路径

### 阶段 0：原型验证（当前阶段）

**目标：** 用纯前端 + Mock 数据快速出可交互原型，验证页面设计和交互流程。

| 交付物 | 说明 |
|--------|------|
| React + Ant Design 纯前端项目 | 完整的 5 个页面 + 路由 |
| Mock 数据层 (MSW 或 JSON) | 覆盖正常/告警/严重/归因中/已闭环等核心场景 |
| 所有图表用 Mock 数据渲染 | ECharts 实际出图 |

**为什么纯前端先行：**
- 无需后端和数据库，1-2 周可出可点击原型
- 让业务方（分析师、编辑）提前体验交互流程
- 验证 DESIGN.md 中的设计假设是否合理
- 快速收集反馈后再进入正式开发

**Mock 数据策略：**

```typescript
// 使用 MSW (Mock Service Worker) 拦截 API 请求
import { http, HttpResponse } from 'msw';

export const handlers = [
  // 数据看板 — 指标卡片
  http.get('/api/v1/dashboard/metrics', () => {
    return HttpResponse.json({
      send_uv: { current: 26_000_000, yesterday: 26_540_000, change_pct: -2.1 },
      show_uv:  { current: 7_600_000,  yesterday: 7_660_000,  change_pct: -0.8 },
      open_rate:{ current: 0.0377,     yesterday: 0.0398,     change_pct: -5.3, anomaly: true },
      // ...
    });
  }),

  // 告警列表
  http.get('/api/v1/alerts', ({ request }) => {
    const url = new URL(request.url);
    const level = url.searchParams.get('level');
    // 返回 mock 告警数据，支持筛选逻辑
    return HttpResponse.json({ alerts: mockAlerts, total: 127 });
  }),

  // 模拟归因进度（逐步返回不同阶段）
  http.get('/api/v1/attribution/:id/progress', ({ params }) => {
    return HttpResponse.json({
      status: 'S07',
      step: 'root_cause_inference',
      progress: 0.75,
      estimated_remaining_sec: 65,
    });
  }),
];
```

### 阶段 1：后端 + 真实数据接入

**目标：** FastAPI 后端 + MySQL/Redis，对接真实数据源。

| 任务 | 说明 |
|------|------|
| FastAPI 项目搭建 | 按 3.2 目录结构 |
| MySQL Schema 建表 | 按 5.2 表设计 |
| 对接现有数据平台 | PUSH 平台 / 数易 / 排班系统 / 内容运营平台的 API |
| 指标计算服务 | 复用现有 Python 脚本的计算逻辑 |
| 前端切换真实 API | 移除 MSW，对接 FastAPI |

### 阶段 2：AI Agent 接入

**目标：** LangChain + Claude API 实现三个 Agent 的核心逻辑。

| 任务 | 说明 |
|------|------|
| 监控 Agent Prompt 工程 | 对齐 PRD §4.1 的 Prompt 设计要点 |
| 归因 Agent Prompt 工程 | 对齐 PRD §4.2，Tool Use 调试 |
| 策略 Agent Prompt 工程 | 对齐 PRD §4.3，状态机实现 |
| 工作流编排 | LangGraph 实现 PRD §3 全流程状态流转 |
| Agent 评估 | 按 PRD §6 的最小验证框架跑 Eval Case |

### 阶段 3：生产化

| 任务 | 说明 |
|------|------|
| Docker 容器化 | 前端 Nginx + 后端 Uvicorn + Celery Worker |
| 监控和日志 | Prometheus + Grafana / ELK |
| CI/CD | GitHub Actions，自动测试 + 部署 |
| 权限系统 | 分析师 / 编辑 / 管理层 角色权限 |
| 飞书集成 | 告警推送飞书消息、建议推送飞书卡片 |

---

## 七、开发环境搭建

### 7.1 本地开发

```bash
# 前端
cd frontend/
npm install
npm run dev          # Vite dev server → http://localhost:5173

# 后端
cd backend/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload  # → http://localhost:8000

# Redis (用于 WebSocket + 缓存)
redis-server

# Celery Worker (用于异步 Agent 任务)
celery -A core.celery worker --loglevel=info
```

### 7.2 Docker 一键启动

```yaml
# docker-compose.yml
version: '3.8'
services:
  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: [backend]

  backend:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      - DATABASE_URL=mysql://user:pass@mysql:3306/push_agent
      - REDIS_URL=redis://redis:6379
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
    depends_on: [mysql, redis]

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: push_agent

  redis:
    image: redis:7-alpine

  celery:
    build: ./backend
    command: celery -A core.celery worker
    depends_on: [backend, redis]
```

---

## 八、关键技术决策记录

| 决策点 | 选择 | 备选 | 决策理由 |
|--------|------|------|---------|
| 前端框架 | React 18 | Vue 3 | Ant Design 生态、TypeScript 支持更好 |
| UI 库 | Ant Design 5 | Arco Design | 生态更成熟、ProComponents 省代码 |
| 图表库 | ECharts | AntV/G2 | 桑基图/仪表盘开箱即用、中文资源多 |
| 状态管理 | Zustand + TanStack Query | Redux Toolkit | 更轻量、服务端状态管理更专业 |
| 后端语言 | Python (FastAPI) | Node.js (NestJS) | 与现有 Python 脚本同语言、AI 库生态 |
| Agent 编排 | LangGraph | 自研状态机 | 内置状态管理、可视化调试、与 LangChain 集成 |
| LLM | Claude API | GPT-4o | 长上下文(200K)、推理能力强(归因场景) |
| 实时通信 | WebSocket (Socket.IO) | SSE / Polling | 双向通信、断线重连、房间管理 |
| 原型策略 | 纯前端 Mock | 全栈 | 快速验证交互、低试错成本 |

---

*文档基于网易新闻 Push 日报实际业务场景和 PRD 中的四 Agent 方案设计，技术选型优先考虑与现有 Python 生态的兼容性和企业级 Dashboard 场景的开发效率。*
