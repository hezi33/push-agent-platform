// ========== 指标数据类型 ==========

/** 漏斗环节 */
export type FunnelStage = 'send' | 'arrive' | 'show' | 'open';

/** 发送类型 */
export type SendType = 'all' | 'quanliang' | 'local_realtime' | 'personalized_realtime' | 'personalized_offline' | 'other';

/** 平台 */
export type Platform = 'ios' | 'android' | 'android_exclude_huawei';

/** 厂商 */
export type Vendor = 'huawei' | 'xiaomi' | 'oppo' | 'vivo' | 'samsung';

/** 告警级别 */
export type AlertLevel = 'S03' | 'S04' | 'S05';

/** Agent 状态码 */
export type AgentStatus =
  // 监控阶段
  | 'S01' | 'S02' | 'S03' | 'S04' | 'S05' | 'S06'
  // 归因阶段
  | 'S07' | 'S08' | 'S09'
  // 策略阶段
  | 'S10' | 'S11' | 'S12' | 'S13' | 'S14' | 'S15' | 'S16' | 'S17' | 'S18';

// ========== 指标值类型 ==========

export interface MetricSnapshot {
  /** 发送用户数 */
  send_uv: number;
  /** 展示人数 */
  show_uv: number;
  /** 打开人数 */
  open_uv: number;
  /** 发送次数 */
  send_pv: number;
  /** 展示次数 */
  show_pv: number;
  /** 打开次数 */
  open_pv: number;
  /** 到达人数 */
  arrive_uv: number;
  /** 到达次数 */
  arrive_pv: number;
  /** 首启用户数 */
  first_open_uv: number;
  /** UV 打开率 */
  uv_open_rate: number;
  /** PV 打开率 */
  pv_open_rate: number;
  /** 到达率 */
  arrive_rate: number;
  /** 展示率 */
  show_rate: number;
  /** 首启率 */
  first_open_rate: number;
  /** 人均展示次数 */
  avg_show_per_user: number;
  /** 人均打开次数 */
  avg_open_per_user: number;
}

export interface KPICardData {
  metricKey: string;
  title: string;
  currentValue: number;
  yesterdayValue: number;
  changePct: number;
  /** 正向变化是绿色还是红色（如打开率↑=好，但有些指标↑不一定好） */
  isPositiveGreen: boolean;
  /** 是否有异常 */
  anomaly: boolean;
  format: 'integer' | 'percentage' | 'wan';
  trendData: number[];
}

// ========== 告警类型 ==========

export interface AlertItem {
  alertId: string;
  level: AlertLevel;
  metricName: string;
  metricLabel: string;
  currentValue: number;
  baselineValue: number;
  deviationSigma: number;
  changePct: number;
  dimension: {
    sendType: string;
    vendor: string;
    province: string;
    platform: string;
  };
  estimatedLoss: number;
  detectedAt: string;
  attributionStatus: AgentStatus | null;
  isRead: boolean;
  summary: string;
}

// ========== 归因类型 ==========

export interface RootCauseHypothesis {
  rank: number;
  hypothesis: string;
  confidence: number; // 0-100
  evidence: string[];
  pendingChecks?: string[];
}

export interface AttributionReport {
  reportId: string;
  alertId: string;
  status: 'S07' | 'S08' | 'S09';
  anomalyMetric: string;
  anomalyDesc: string;
  lockedDimensions: {
    sendType: string;
    platform: string;
    vendor: string;
    province: string;
    funnelStage: FunnelStage;
    contributionPct: number;
  };
  contributionTree: ContributionNode;
  funnelAnalysis: {
    stage: FunnelStage;
    stageLabel: string;
    currentRate: number;
    baselineRate: number;
    changePct: number;
    isAbnormal: boolean;
    direction: string;
  }[];
  rootCauses: RootCauseHypothesis[];
  topConfidence: number;
  durationMs: number;
  createdAt: string;
}

export interface ContributionNode {
  name: string;
  value: number;
  contributionPct: number;
  isAbnormal: boolean;
  children?: ContributionNode[];
}

// ========== 策略类型 ==========

export interface StrategySuggestion {
  suggestionId: string;
  reportId: string;
  status: AgentStatus;
  problemDesc: string;
  suggestion: string;
  reference: string;
  estimatedEffect: {
    improvementPct: number;
    improvementAbs: number;
    confidenceInterval: [number, number];
    assumptions: string;
  };
  editorId: string;
  editorName: string;
  checkpoints: {
    dDay: string;
    d1: string;
    d3: string;
    d7: string;
  };
  trackingResults?: {
    d1?: { executed: boolean; note: string };
    d3?: { improved: boolean; metricBefore: number; metricAfter: number; changePct: number };
    d7?: { sustained: boolean; metricValue: number; verdict: string };
  };
  actualEffect?: {
    improvementPct: number;
    strategyRating: number; // 0-100
  };
  createdAt: string;
}

// ========== API 响应类型 ==========

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardData {
  kpiCards: KPICardData[];
  alertList: AlertItem[];
  trendData: {
    dates: string[];
    series: { name: string; data: number[]; anomalyPoints?: number[] }[];
  };
  lastUpdated: string;
}
