// ============================================================
// Mock 数据 — Agent 工作台（核心）
//
// 模拟 PRD §6 中三个 Agent 的完整工具调用链路：
//   监控: fetch_metrics → get_baseline → calc_deviation → send_alert
//   归因: decompose_contribution → check_funnel → query_content_data
//         → query_vendor_status → compare_dimension → generate_report
//   策略: match_strategy → estimate_effect → push_suggestion
//         → register_track_task
// ============================================================

const NOW = Date.now();

function ts(offsetSec: number): string {
  return new Date(NOW + offsetSec * 1000).toISOString();
}

function rel(offsetSec: number): string {
  const d = new Date(NOW + offsetSec * 1000);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// ============================================================
// 工具调用日志类型
// ============================================================

export type AgentName = 'monitor' | 'attribution' | 'strategy';
export type LogStatus = 'pending' | 'running' | 'success' | 'error';

export interface ToolCallLog {
  id: string;
  seq: number;
  time: string;
  timeDisplay: string;
  agent: AgentName;
  agentLabel: string;
  toolName: string;
  toolLabel: string;
  description: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: LogStatus;
  durationMs: number;
  isKey: boolean; // 关键步骤（高亮显示）
}

export interface PipelineAgent {
  key: AgentName;
  label: string;
  icon: string;
  status: 'idle' | 'running' | 'waiting' | 'done' | 'error' | 'skipped';
  progress: number; // 0-100
  currentTool: string;
  toolCount: number;
  doneCount: number;
}

// ============================================================
// 完整工具调用日志序列（模拟一次完整的告警→归因→策略流程）
// ============================================================

export const mockToolCallLogs: ToolCallLog[] = [
  // ── 阶段 1：监控 Agent 巡检 ──
  {
    id: 'call-01', seq: 1,
    time: ts(-180), timeDisplay: rel(-180),
    agent: 'monitor', agentLabel: '监控 Agent',
    toolName: 'fetch_metrics', toolLabel: '获取指标快照',
    description: '从数据源拉取 3,650 个维度组合的实时指标',
    input: { dims: ['send_type', 'platform', 'vendor', 'province'], metrics: ['send_uv', 'arrive_rate', 'show_rate', 'uv_open_rate', 'first_open_uv'], timestamp: ts(-180) },
    output: { total_combinations: 3650, data_points: 18250, latency_ms: 320 },
    status: 'success', durationMs: 320, isKey: false,
  },
  {
    id: 'call-02', seq: 2,
    time: ts(-175), timeDisplay: rel(-175),
    agent: 'monitor', agentLabel: '监控 Agent',
    toolName: 'get_baseline', toolLabel: '获取基线',
    description: '查询过去 7 天同期的均值 ± 2σ 基线',
    input: { dim_combo: 'local_realtime:android:xiaomi:guangdong', metric: 'arrive_rate', window_days: 7 },
    output: { mean: 35.0, std: 2.5, n_samples: 7, baseline_range: [30.0, 40.0] },
    status: 'success', durationMs: 180, isKey: false,
  },
  {
    id: 'call-03', seq: 3,
    time: ts(-170), timeDisplay: rel(-170),
    agent: 'monitor', agentLabel: '监控 Agent',
    toolName: 'calc_deviation', toolLabel: '计算偏离度',
    description: '计算当前值偏离基线的 σ 值',
    input: { current: 22.0, mean: 35.0, std: 2.5 },
    output: { sigma: -2.8, direction: 'down', pct_change: -37.1, level: 'critical' },
    status: 'success', durationMs: 45, isKey: true,
  },
  {
    id: 'call-04', seq: 4,
    time: ts(-168), timeDisplay: rel(-168),
    agent: 'monitor', agentLabel: '监控 Agent',
    toolName: 'send_alert', toolLabel: '发送告警',
    description: '判定为严重告警（σ=-2.8），推送告警 + 触发归因',
    input: { level: 'S05', metric: 'arrive_rate', dim_combo: '本地实时·小米·广东', sigma: -2.8, impact_estimate: '预计损失 2,300 首启用户' },
    output: { sent: true, alert_id: 'ALT-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-001', recipients: ['分析师', '管理层'], attribution_triggered: true },
    status: 'success', durationMs: 120, isKey: true,
  },

  // ── 阶段 2：归因 Agent 分析 ──
  {
    id: 'call-05', seq: 5,
    time: ts(-120), timeDisplay: rel(-120),
    agent: 'attribution', agentLabel: '归因 Agent',
    toolName: 'decompose_contribution', toolLabel: '贡献度分解',
    description: '按维度层级逐层分解：发送类型 → 平台 → 厂商 → 省份 → 时段',
    input: { anomaly_metric: 'arrive_rate', anomaly_value: 22.0, baseline_value: 35.0, dim_hierarchy: ['send_type', 'platform', 'vendor', 'province', 'hour'] },
    output: {
      locked_dim: '本地实时 × Android × 小米 × 广东省',
      top_contributors: [
        { dim: '本地实时', contribution_pct: 70 },
        { dim: '小米', contribution_pct: 75 },
        { dim: '广东', contribution_pct: 60 },
      ],
      decomposition_levels: 4,
    },
    status: 'success', durationMs: 1250, isKey: true,
  },
  {
    id: 'call-06', seq: 6,
    time: ts(-100), timeDisplay: rel(-100),
    agent: 'attribution', agentLabel: '归因 Agent',
    toolName: 'check_funnel', toolLabel: '漏斗链路检查',
    description: '检查锁定维度在四个漏斗环节的转化率变化',
    input: { dim_combo: '本地实时·Android·小米·广东', time_range: '异常时段前后 2 小时' },
    output: {
      arrive_rate: { current: 22.0, baseline: 35.0, change_pct: -37.1, abnormal: true },
      show_rate: { current: 62.0, baseline: 63.5, change_pct: -2.4, abnormal: false },
      open_rate: { current: 3.40, baseline: 3.45, change_pct: -1.4, abnormal: false },
      first_open_rate: { current: 1.96, baseline: 2.05, change_pct: -4.4, abnormal: false },
      conclusion: '到达环节异常 — 疑似厂商通道问题',
    },
    status: 'success', durationMs: 850, isKey: true,
  },
  {
    id: 'call-07', seq: 7,
    time: ts(-85), timeDisplay: rel(-85),
    agent: 'attribution', agentLabel: '归因 Agent',
    toolName: 'query_vendor_status', toolLabel: '查询厂商通道状态',
    description: '查询小米厂商通道近期是否有策略变更或故障',
    input: { vendor: 'xiaomi', time_range: '近 3 天' },
    output: { is_normal: true, recent_changes: [], known_issues: [], last_incident: null },
    status: 'success', durationMs: 620, isKey: false,
  },
  {
    id: 'call-08', seq: 8,
    time: ts(-78), timeDisplay: rel(-78),
    agent: 'attribution', agentLabel: '归因 Agent',
    toolName: 'compare_dimension', toolLabel: '同期维度对比',
    description: '对比同期 OPPO 和华为的数据，排除全局因素',
    input: { target: '小米·广东·本地实时', baseline: 'OPPO·广东·本地实时', metric: 'arrive_rate', time: '异常时段' },
    output: { target_value: 22.0, baseline_value: 34.5, diff_pct: -36.2, conclusion: '仅小米异常，排除全局因素' },
    status: 'success', durationMs: 480, isKey: false,
  },
  {
    id: 'call-09', seq: 9,
    time: ts(-72), timeDisplay: rel(-72),
    agent: 'attribution', agentLabel: '归因 Agent',
    toolName: 'query_content_data', toolLabel: '查询内容数据',
    description: '查询异常时段广东省推送的本地 Push 标题及打开率',
    input: { dim_combo: '广东·本地实时', time_range: '异常时段前后 2 小时' },
    output: {
      articles: [
        { title: '广州地铁三号线延误通知', open_rate: 2.1, send_volume: 5000 },
        { title: '深圳今日暴雨黄色预警', open_rate: 2.8, send_volume: 8000 },
        { title: '广东高考录取分数线公布', open_rate: 5.2, send_volume: 12000 },
      ],
      avg_open_rate: 3.1,
      abnormal_articles: [],
    },
    status: 'success', durationMs: 730, isKey: false,
  },
  {
    id: 'call-10', seq: 10,
    time: ts(-65), timeDisplay: rel(-65),
    agent: 'attribution', agentLabel: '归因 Agent',
    toolName: 'generate_report', toolLabel: '生成归因报告',
    description: '综合以上分析，生成结构化归因报告',
    input: { findings: '小米广东到达率骤降', evidence: ['仅小米异常', '厂商通道无变更', 'OPPO同期正常'] },
    output: {
      report_id: 'ATTR-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-001',
      root_cause_top1: '小米厂商通道广东地区出现短暂推送异常',
      confidence: 65,
      status: 'S08',
      candidate_hypotheses: [
        { hypothesis: '小米通道广东地区短暂异常', confidence: 65 },
        { hypothesis: '广东暴雨导致用户关机/断网', confidence: 30 },
        { hypothesis: '厂商推送配额调整', confidence: 5 },
      ],
    },
    status: 'success', durationMs: 980, isKey: true,
  },

  // ── 阶段 3：策略 Agent 建议 ──
  {
    id: 'call-11', seq: 11,
    time: ts(-30), timeDisplay: rel(-30),
    agent: 'strategy', agentLabel: '策略 Agent',
    toolName: 'match_strategy', toolLabel: '匹配策略模板',
    description: '基于归因结论，从策略知识库中匹配最优策略模板',
    input: { conclusion: '小米广东到达率异常', affected_metric: 'arrive_rate', knowledge_base: 'history_strategies_v2' },
    output: {
      matched_template: '联系厂商排查+备用通道切换',
      historical_avg_improvement: '+18%',
      similar_cases: 3,
      confidence: 75,
    },
    status: 'success', durationMs: 420, isKey: false,
  },
  {
    id: 'call-12', seq: 12,
    time: ts(-25), timeDisplay: rel(-25),
    agent: 'strategy', agentLabel: '策略 Agent',
    toolName: 'estimate_effect', toolLabel: '预估执行效果',
    description: '基于历史同类策略的平均改善幅度，预估执行后效果',
    input: { strategy: '联系小米排查广东通道', current_metrics: { first_open_uv: 11800 }, historical_improvement_pct: 18 },
    output: { expected_improvement_pct: 10.2, expected_improvement_abs: 1200, confidence_interval: [8.5, 14.0], assumptions: '基于 3 个相似案例' },
    status: 'success', durationMs: 350, isKey: false,
  },
  {
    id: 'call-13', seq: 13,
    time: ts(-20), timeDisplay: rel(-20),
    agent: 'strategy', agentLabel: '策略 Agent',
    toolName: 'push_suggestion', toolLabel: '推送建议',
    description: '将优化建议推送至负责编辑（飞书 + 系统通知）',
    input: { suggestion_id: 'SUG-001', editor: '张三（广东早班编辑）', channel: 'feishu', content: '建议联系小米排查广东地区到达率异常' },
    output: { sent: true, delivered: true, read_at: null, escalation_d1: ts(86400) },
    status: 'success', durationMs: 280, isKey: true,
  },
  {
    id: 'call-14', seq: 14,
    time: ts(-18), timeDisplay: rel(-18),
    agent: 'strategy', agentLabel: '策略 Agent',
    toolName: 'register_track_task', toolLabel: '注册跟踪任务',
    description: '注册 D+1 / D+3 / D+7 三个检查点的定时跟踪任务',
    input: { suggestion_id: 'SUG-001', checkpoints: ['D+1', 'D+3', 'D+7'], target_metric: 'arrive_rate' },
    output: { registered: true, task_id: 'TRACK-001', checkpoints: { 'D+1': ts(86400), 'D+3': ts(259200), 'D+7': ts(604800) } },
    status: 'success', durationMs: 150, isKey: false,
  },
];

// ============================================================
// 管道 Agent 状态
// ============================================================

export const mockPipelineAgents: PipelineAgent[] = [
  {
    key: 'monitor', label: '监控 Agent', icon: '🔍',
    status: 'done', progress: 100,
    currentTool: 'send_alert', toolCount: 4, doneCount: 4,
  },
  {
    key: 'attribution', label: '归因 Agent', icon: '🧠',
    status: 'done', progress: 100,
    currentTool: 'generate_report', toolCount: 6, doneCount: 6,
  },
  {
    key: 'strategy', label: '策略 Agent', icon: '⚡',
    status: 'done', progress: 100,
    currentTool: 'register_track_task', toolCount: 4, doneCount: 4,
  },
];

// ============================================================
// 模拟"进行中"状态的管道（用于演示动画效果）
// ============================================================

export function getSimulatingPipeline(currentAgent: AgentName, currentToolIndex: number): {
  logs: ToolCallLog[];
  pipeline: PipelineAgent[];
} {
  // 截取到当前工具调用为止的日志
  const logs = mockToolCallLogs.filter((l) => {
    if (l.agent === 'monitor' && currentAgent === 'monitor') return l.seq <= currentToolIndex;
    if (l.agent === 'monitor' && currentAgent !== 'monitor') return true;
    if (l.agent === 'attribution' && currentAgent === 'attribution') return l.seq <= currentToolIndex;
    if (l.agent === 'attribution' && (currentAgent === 'strategy')) return true;
    return false;
  });

  // 更新管道状态
  const pipeline = mockPipelineAgents.map((a) => {
    if (a.key === 'monitor') {
      if (currentAgent === 'monitor') return { ...a, status: 'running' as const, progress: Math.round((currentToolIndex / 4) * 100), currentTool: mockToolCallLogs[currentToolIndex]?.toolLabel || '', doneCount: currentToolIndex };
      return { ...a, status: 'done' as const, progress: 100, doneCount: 4 };
    }
    if (a.key === 'attribution') {
      if (currentAgent === 'attribution') return { ...a, status: 'running' as const, progress: Math.round((currentToolIndex / 10) * 100), currentTool: mockToolCallLogs[currentToolIndex]?.toolLabel || '', doneCount: currentToolIndex - 4 };
      if (currentAgent === 'monitor') return { ...a, status: 'waiting' as const, progress: 0, currentTool: '等待监控完成', doneCount: 0 };
      return { ...a, status: 'done' as const, progress: 100, doneCount: 6 };
    }
    // strategy
    if (currentAgent === 'strategy') return { ...a, status: 'running' as const, progress: Math.round(((currentToolIndex - 10) / 4) * 100), currentTool: mockToolCallLogs[currentToolIndex]?.toolLabel || '', doneCount: currentToolIndex - 10 };
    if (currentAgent === 'monitor' || currentAgent === 'attribution') return { ...a, status: 'waiting' as const, progress: 0, currentTool: '等待上游完成', doneCount: 0 };
    return { ...a, status: 'done' as const, progress: 100, doneCount: 4 };
  });

  return { logs, pipeline };
}
