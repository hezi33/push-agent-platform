import type { DashboardData, AlertItem, KPICardData } from '../../types';
import { generateTrend, generateDates } from './trendGenerator';

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

const DATES = generateDates(30);

/** 今天的日期标记（用于告警 ID） */
const TODAY_MARK = fmtDate(TODAY).replace(/-/g, '');
const YESTERDAY_MARK = fmtDate(daysAgo(1)).replace(/-/g, '');
const DAY2_MARK = fmtDate(daysAgo(2)).replace(/-/g, '');
const DAY3_MARK = fmtDate(daysAgo(3)).replace(/-/g, '');

// ============================================================
// KPI 数据卡片（使用统一生成器——保证迷你图和 Drawer 趋势一致）
// ============================================================

export const mockKPICards: KPICardData[] = [
  {
    metricKey: 'send_uv', title: '发送量',
    currentValue: 25200000, yesterdayValue: 26540000, changePct: -5.0,
    isPositiveGreen: false, anomaly: true, format: 'integer',
    trendData: generateTrend('send_uv', 26000000, 0.06, 7, 6, 25200000),
  },
  {
    metricKey: 'show_uv', title: '展示人数',
    currentValue: 7520000, yesterdayValue: 7660000, changePct: -1.8,
    isPositiveGreen: false, anomaly: false, format: 'integer',
    trendData: generateTrend('show_uv', 7600000, 0.05, 7),
  },
  {
    metricKey: 'uv_open_rate', title: 'UV 打开率',
    currentValue: 3.40, yesterdayValue: 3.90, changePct: -12.8,
    isPositiveGreen: true, anomaly: true, format: 'percentage',
    trendData: generateTrend('uv_open_rate', 3.90, 0.03, 7, 6, 3.40),
  },
  {
    metricKey: 'pv_open_rate', title: 'PV 打开率',
    currentValue: 0.68, yesterdayValue: 0.73, changePct: -6.8,
    isPositiveGreen: true, anomaly: false, format: 'percentage',
    trendData: generateTrend('pv_open_rate', 0.73, 0.04, 7, 6, 0.68),
  },
  {
    metricKey: 'first_open_uv', title: '首启用户数',
    currentValue: 142000, yesterdayValue: 157000, changePct: -9.6,
    isPositiveGreen: true, anomaly: true, format: 'wan',
    trendData: generateTrend('first_open_uv', 155000, 0.08, 7, 6, 142000),
  },
  {
    metricKey: 'avg_show', title: '人均展示次数',
    currentValue: 8.52, yesterdayValue: 9.65, changePct: -11.7,
    isPositiveGreen: false, anomaly: true, format: 'integer',
    trendData: generateTrend('avg_show', 9.55, 0.04, 7, 6, 8.52),
  },
  {
    metricKey: 'arrive_rate', title: '到达率',
    currentValue: 22.0, yesterdayValue: 35.0, changePct: -37.1,
    isPositiveGreen: true, anomaly: true, format: 'percentage',
    trendData: generateTrend('arrive_rate', 35.0, 0.05, 7, 6, 22.0),
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
  {
    alertId: `ALT-${TODAY_MARK}-001`,
    level: 'S05', metricName: 'arrive_rate', metricLabel: '到达率',
    currentValue: 22, baselineValue: 35, deviationSigma: 2.8, changePct: -37.1,
    dimension: { sendType: '本地实时', vendor: '小米', province: '广东', platform: 'Android' },
    estimatedLoss: 2300, detectedAt: fmtDateTime(TODAY, 14, 0), attributionStatus: 'S07', isRead: false,
    summary: '到达率从 35% 骤降至 22%（-37.1%，-2.8σ）。锁定：小米·广东。已自动触发归因。',
  },
  {
    alertId: `ALT-${TODAY_MARK}-002`,
    level: 'S04', metricName: 'uv_open_rate', metricLabel: 'UV 打开率',
    currentValue: 3.40, baselineValue: 3.90, deviationSigma: 2.4, changePct: -12.8,
    dimension: { sendType: '全量', vendor: '小米', province: '广东', platform: 'Android' },
    estimatedLoss: 5200, detectedAt: fmtDateTime(TODAY, 11, 0), attributionStatus: 'S08', isRead: false,
    summary: 'UV 打开率从 3.90% 降至 3.40%（-12.8%，-2.4σ）。锁定：小米·广东。归因已完成，置信度 65%。',
  },
  {
    alertId: `ALT-${TODAY_MARK}-003`,
    level: 'S04', metricName: 'first_open_uv', metricLabel: '首启用户数',
    currentValue: 142000, baselineValue: 157000, deviationSigma: 2.2, changePct: -9.6,
    dimension: { sendType: '全量', vendor: '华为', province: '江苏', platform: 'Android' },
    estimatedLoss: 1800, detectedAt: fmtDateTime(TODAY, 10, 0), attributionStatus: null, isRead: false,
    summary: '首启 UV 从 15.7 万降至 14.2 万（-9.6%）。锁定：华为·江苏。需触发归因。',
  },
  {
    alertId: `ALT-${TODAY_MARK}-004`,
    level: 'S03', metricName: 'avg_show', metricLabel: '人均展示次数',
    currentValue: 8.52, baselineValue: 9.65, deviationSigma: 1.7, changePct: -11.7,
    dimension: { sendType: '个性化实时', vendor: 'OPPO', province: 'all', platform: 'Android' },
    estimatedLoss: 0, detectedAt: fmtDateTime(TODAY, 9, 45), attributionStatus: null, isRead: true,
    summary: '人均展示次数从 9.65 降至 8.52（-11.7%）。OPPO 厂商可能调整了展示频次。',
  },
  {
    alertId: `ALT-${YESTERDAY_MARK}-001`,
    level: 'S03', metricName: 'send_uv', metricLabel: '发送量',
    currentValue: 25200000, baselineValue: 26540000, deviationSigma: 1.8, changePct: -5.0,
    dimension: { sendType: 'all', vendor: 'VIVO', province: 'all', platform: 'Android' },
    estimatedLoss: 5000, detectedAt: fmtDateTime(daysAgo(1), 8, 0), attributionStatus: 'S08', isRead: true,
    summary: '发送量下降 5.0%，主要为 VIVO 通道服务故障，已恢复。归因完成。',
  },
  {
    alertId: `ALT-${DAY2_MARK}-001`,
    level: 'S04', metricName: 'uv_open_rate', metricLabel: 'UV 打开率',
    currentValue: 3.62, baselineValue: 3.88, deviationSigma: 2.1, changePct: -6.7,
    dimension: { sendType: '个性化实时', vendor: '小米', province: '浙江', platform: 'Android' },
    estimatedLoss: 1200, detectedAt: fmtDateTime(daysAgo(2), 13, 30), attributionStatus: 'S08', isRead: true,
    summary: '小米·浙江个性化实时打开率下降——推送时段错位。策略已闭环（S15）。',
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
