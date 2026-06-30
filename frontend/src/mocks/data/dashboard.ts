import type { DashboardData, AlertItem, KPICardData } from '../../types';

// ============================================================
// Mock 数据 — 数据看板首页
// 基于 2024.07.17 真实数据量级构造，日期全部动态生成
// ============================================================

/** 今天 */
const TODAY = new Date();

/**
 * 格式化日期 YYYY-MM-DD
 */
function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

/**
 * 格式化日期时间 ISO
 */
function fmtDateTime(d: Date, hour: number, minute: number = 0): string {
  const copy = new Date(d);
  copy.setHours(hour, minute, 0, 0);
  return copy.toISOString();
}

/**
 * 生成 N 天前的日期
 */
function daysAgo(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * 生成 30 天日期列表
 */
function generateDates(days: number = 30): string[] {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    dates.push(fmtDate(daysAgo(i)));
  }
  return dates;
}

const DATES = generateDates(30);

/** 今天的日期标记（用于告警 ID） */
const TODAY_MARK = fmtDate(TODAY).replace(/-/g, '');
const YESTERDAY_MARK = fmtDate(daysAgo(1)).replace(/-/g, '');
const DAY2_MARK = fmtDate(daysAgo(2)).replace(/-/g, '');
const DAY3_MARK = fmtDate(daysAgo(3)).replace(/-/g, '');

/**
 * 带噪声的数值生成器
 * 在 base 值附近 ± noisePct 范围内波动
 */
function noisy(base: number, noisePct: number = 0.05): number {
  const noise = base * noisePct * (Math.random() * 2 - 1);
  return Math.round(base + noise);
}

// ============================================================
// KPI 数据卡片
// ============================================================

export const mockKPICards: KPICardData[] = [
  {
    metricKey: 'send_uv',
    title: '发送量',
    currentValue: 25800000,
    yesterdayValue: 26540000,
    changePct: -2.8,
    isPositiveGreen: false,
    anomaly: false,
    format: 'integer',
    trendData: DATES.slice(-7).map(() => noisy(26000000, 0.06)),
  },
  {
    metricKey: 'show_uv',
    title: '展示人数',
    currentValue: 7520000,
    yesterdayValue: 7660000,
    changePct: -1.8,
    isPositiveGreen: false,
    anomaly: false,
    format: 'integer',
    trendData: DATES.slice(-7).map(() => noisy(7600000, 0.05)),
  },
  {
    metricKey: 'uv_open_rate',
    title: 'UV 打开率',
    currentValue: 3.40,
    yesterdayValue: 3.90,
    changePct: -12.8,
    isPositiveGreen: true,
    anomaly: true, // 🔴 注入异常 — 全量 UV 打开率下降
    format: 'percentage',
    trendData: [3.92, 3.88, 3.95, 3.91, 3.89, 3.90, 3.40],
  },
  {
    metricKey: 'pv_open_rate',
    title: 'PV 打开率',
    currentValue: 0.68,
    yesterdayValue: 0.73,
    changePct: -6.8,
    isPositiveGreen: true,
    anomaly: false,
    format: 'percentage',
    trendData: [0.73, 0.71, 0.74, 0.72, 0.73, 0.73, 0.68],
  },
  {
    metricKey: 'first_open_uv',
    title: '首启用户数',
    currentValue: 147000,
    yesterdayValue: 157000,
    changePct: -6.4,
    isPositiveGreen: true,
    anomaly: false,
    format: 'wan',
    trendData: DATES.slice(-7).map(() => noisy(155000, 0.08)),
  },
  {
    metricKey: 'avg_show',
    title: '人均展示次数',
    currentValue: 9.32,
    yesterdayValue: 9.65,
    changePct: -3.4,
    isPositiveGreen: false,
    anomaly: false,
    format: 'integer',
    trendData: [9.71, 9.58, 9.63, 9.67, 9.55, 9.65, 9.32],
  },
];

// ============================================================
// 核心指标趋势数据（7 天折线图）
// ============================================================

export const mockTrendData = {
  dates: DATES.slice(-7),
  series: [
    {
      name: 'UV 打开率 (%)',
      data: [3.92, 3.88, 3.95, 3.91, 3.89, 3.90, 3.40],
      anomalyPoints: [6], // 最后一天 (7/17) 异常
    },
    {
      name: '首启 UV (万)',
      data: [15.8, 15.5, 16.1, 15.9, 15.6, 15.7, 14.7],
    },
    {
      name: '展示人数 (百万)',
      data: [7.71, 7.58, 7.82, 7.65, 7.59, 7.66, 7.52],
    },
  ],
};

// ============================================================
// 异常告警列表
// ============================================================

export const mockAlertList: AlertItem[] = [
  // 🔴 严重告警 — 本地实时到达率骤降 (PRD 主示例)
  {
    alertId: `ALT-${TODAY_MARK}-001`,
    level: 'S05',
    metricName: 'arrive_rate',
    metricLabel: '到达率',
    currentValue: 22,
    baselineValue: 35,
    deviationSigma: 2.8,
    changePct: -37.1,
    dimension: {
      sendType: '本地实时',
      vendor: '小米',
      province: '广东',
      platform: 'Android',
    },
    estimatedLoss: 2300,
    detectedAt: fmtDateTime(TODAY, 14, 0),
    attributionStatus: 'S07',
    isRead: false,
    summary: '本地实时 Push 到达率从 35% 骤降至 22%，影响 Android·小米·广东省，预计已损失首启用户约 2,300。已自动触发归因分析。',
  },
  // ⚠️ 告警 — UV 打开率下降 (归因 eval case)
  {
    alertId: `ALT-${TODAY_MARK}-002`,
    level: 'S04',
    metricName: 'uv_open_rate',
    metricLabel: 'UV 打开率',
    currentValue: 3.40,
    baselineValue: 3.90,
    deviationSigma: 2.4,
    changePct: -12.8,
    dimension: {
      sendType: '全量',
      vendor: 'all',
      province: 'all',
      platform: 'all',
    },
    estimatedLoss: 5200,
    detectedAt: fmtDateTime(TODAY, 11, 0),
    attributionStatus: 'S08',
    isRead: false,
    summary: '全量 Push UV 打开率从 3.90% 降至 3.40%（-12.8%），多维度受影响。归因已完成，置信度 65%，待人工确认。',
  },
  // 📌 关注 — iOS 全量打开率微降
  {
    alertId: `ALT-${TODAY_MARK}-003`,
    level: 'S03',
    metricName: 'uv_open_rate',
    metricLabel: 'UV 打开率',
    currentValue: 3.55,
    baselineValue: 3.72,
    deviationSigma: 1.8,
    changePct: -4.6,
    dimension: {
      sendType: '全量',
      vendor: 'all',
      province: 'all',
      platform: 'iOS',
    },
    estimatedLoss: 300,
    detectedAt: fmtDateTime(TODAY, 10, 30),
    attributionStatus: null,
    isRead: true,
    summary: 'iOS 全量 Push UV 打开率微降 4.6%，偏离 1.8σ，标记关注。未触发归因。',
  },
  // 📌 关注 — OPPO 人均展示下降
  {
    alertId: `ALT-${TODAY_MARK}-004`,
    level: 'S03',
    metricName: 'avg_show_per_user',
    metricLabel: '人均展示次数',
    currentValue: 5.8,
    baselineValue: 6.5,
    deviationSigma: 1.7,
    changePct: -10.8,
    dimension: {
      sendType: '个性化实时',
      vendor: 'OPPO',
      province: 'all',
      platform: 'Android',
    },
    estimatedLoss: 0,
    detectedAt: fmtDateTime(TODAY, 9, 45),
    attributionStatus: null,
    isRead: true,
    summary: '个性化实时·OPPO·Android 人均展示次数从 6.5 降至 5.8，关注厂商通道是否调整了展示策略。',
  },
  // ✅ 历史已闭环告警 — 昨天
  {
    alertId: `ALT-${YESTERDAY_MARK}-001`,
    level: 'S04',
    metricName: 'first_open_uv',
    metricLabel: '首启 UV',
    currentValue: 142000,
    baselineValue: 157000,
    deviationSigma: 2.2,
    changePct: -9.6,
    dimension: {
      sendType: '全量',
      vendor: '华为',
      province: '江苏',
      platform: 'Android',
    },
    estimatedLoss: 1800,
    detectedAt: fmtDateTime(daysAgo(1), 15, 0),
    attributionStatus: 'S08',
    isRead: true,
    summary: '华为·江苏首启 UV 下降 9.6%，归因完成——华为推送 SDK 版本更新导致部分机型到达率下降。',
  },
  {
    alertId: `ALT-${YESTERDAY_MARK}-002`,
    level: 'S05',
    metricName: 'send_uv',
    metricLabel: '发送量',
    currentValue: 18500000,
    baselineValue: 26000000,
    deviationSigma: 3.2,
    changePct: -28.8,
    dimension: {
      sendType: 'all',
      vendor: 'VIVO',
      province: 'all',
      platform: 'Android',
    },
    estimatedLoss: 8500,
    detectedAt: fmtDateTime(daysAgo(1), 8, 0),
    attributionStatus: 'S08',
    isRead: true,
    summary: 'VIVO 通道发送量骤降 28.8%，经排查为 VIVO 推送平台服务故障，已于当日 12:00 恢复。',
  },
  // 历史已闭环 (S15) — 前天
  {
    alertId: `ALT-${DAY2_MARK}-001`,
    level: 'S04',
    metricName: 'uv_open_rate',
    metricLabel: 'UV 打开率',
    currentValue: 3.62,
    baselineValue: 3.88,
    deviationSigma: 2.1,
    changePct: -6.7,
    dimension: {
      sendType: '个性化实时',
      vendor: '小米',
      province: '浙江',
      platform: 'Android',
    },
    estimatedLoss: 1200,
    detectedAt: fmtDateTime(daysAgo(2), 13, 30),
    attributionStatus: 'S08',
    isRead: true,
    summary: '小米·浙江个性化实时打开率下降——内容推送时段与用户活跃高峰错位。策略已闭环（S15）。',
  },
  {
    alertId: `ALT-${DAY3_MARK}-001`,
    level: 'S03',
    metricName: 'show_rate',
    metricLabel: '展示率',
    currentValue: 72.5,
    baselineValue: 78.0,
    deviationSigma: 1.6,
    changePct: -7.1,
    dimension: {
      sendType: '本地实时',
      vendor: '三星',
      province: '北京',
      platform: 'Android',
    },
    estimatedLoss: 400,
    detectedAt: fmtDateTime(daysAgo(3), 16, 20),
    attributionStatus: null,
    isRead: true,
    summary: '三星·北京本地实时展示率略降，关注。不影响整体 KPI，暂时忽略。',
  },
];

// ============================================================
// Dashboard 完整数据
// ============================================================

export const mockDashboardData: DashboardData = {
  kpiCards: mockKPICards,
  alertList: mockAlertList,
  trendData: mockTrendData,
  lastUpdated: new Date().toISOString(),
};
