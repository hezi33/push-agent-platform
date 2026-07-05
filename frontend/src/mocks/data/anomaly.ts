// ============================================================
// Mock 数据 — 异常详情页
// ✅ 数据来源统一为 metricContext（与 KPI卡片、告警列表、工作台一致）
// ============================================================
import { getMetricContext } from './metricContext';
import { generateTrend } from './trendGenerator';

const TODAY = new Date();
function fmtDate(d: Date) { return d.toISOString().split('T')[0]; }
function daysAgo(n: number) { const d = new Date(TODAY); d.setDate(d.getDate() - n); return d; }
function fmtDateTime(d: Date, h: number, m = 0) { const c = new Date(d); c.setHours(h, m, 0, 0); return c.toISOString(); }
function dateRange(days: number) { const a: string[] = []; for (let i = days - 1; i >= 0; i--) a.push(fmtDate(daysAgo(i))); return a; }

const DATES_30 = dateRange(30);

export interface AnomalyDetailData {
  alertId: string; level: string; title: string; summary: string;
  metricName: string; metricLabel: string; metricKey: string;
  currentValue: number; baselineValue: number; changePct: number; deviationSigma: number;
  dimension: { sendType: string; vendor: string; province: string; platform: string };
  estimatedLoss: number; detectedAt: string; attributionStatus: string | null;
  trendData: { dates: string[]; actual: number[]; baseline: number[]; upperBound: number[]; lowerBound: number[] };
  dimensionComparison: {
    vendors: { name: string; current: number; baseline: number }[];
    provinces: { name: string; current: number; baseline: number; changePct: number }[];
    sendTypes: { name: string; current: number; baseline: number }[];
    platforms: { name: string; current: number; baseline: number }[];
  };
  timeline: { time: string; event: string; icon: 'detect' | 'alert' | 'attribution' | 'strategy' | 'action' }[];
}

const ALERT_CONFIGS: Record<string, { metricKey: string; level: string; dim: { sendType: string; vendor: string; province: string; platform: string }; loss: number; sigma: number; time: [number, number] }> = {
  '001': { metricKey: 'arrive_rate', level: 'S05', dim: { sendType: '本地实时', vendor: '小米', province: '广东', platform: 'Android' }, loss: 2300, sigma: 2.8, time: [14, 0] },
  '002': { metricKey: 'uv_open_rate', level: 'S04', dim: { sendType: '全量', vendor: '小米', province: '广东', platform: 'Android' }, loss: 5200, sigma: 2.4, time: [11, 0] },
  '003': { metricKey: 'first_open_uv', level: 'S04', dim: { sendType: '全量', vendor: '华为', province: '江苏', platform: 'Android' }, loss: 1800, sigma: 2.2, time: [10, 0] },
  '004': { metricKey: 'avg_show', level: 'S03', dim: { sendType: '个性化实时', vendor: 'OPPO', province: 'all', platform: 'Android' }, loss: 0, sigma: 1.7, time: [9, 45] },
};

export function getAnomalyDetail(alertId: string): AnomalyDetailData | null {
  const suffix = alertId.split('-').pop() || '001';
  const cfg = ALERT_CONFIGS[suffix] || ALERT_CONFIGS['001'];
  const ctx = getMetricContext(cfg.metricKey);
  const isPct = ctx.key.includes('rate') || ctx.key === 'uv_open_rate' || ctx.key === 'pv_open_rate';

  const baselineMean = isPct ? (cfg.metricKey === 'arrive_rate' ? 35 : cfg.metricKey === 'uv_open_rate' ? 3.90 : cfg.metricKey === 'avg_show' ? 9.65 : 3) : 157000;
  const actualVal = isPct ? (cfg.metricKey === 'arrive_rate' ? 22 : cfg.metricKey === 'uv_open_rate' ? 3.40 : cfg.metricKey === 'avg_show' ? 8.52 : 3) : 142000;
  const noisePct = isPct ? 0.05 : 0.08;
  const actual = DATES_30.map((_, i) => i === DATES_30.length - 1 ? actualVal : +(baselineMean + baselineMean * noisePct * (Math.random() * 2 - 1)).toFixed(2));
  const baseline = DATES_30.map(() => baselineMean);
  const upper = DATES_30.map(() => +(baselineMean + 2 * cfg.sigma).toFixed(2));
  const lower = DATES_30.map(() => +(baselineMean - 2 * cfg.sigma).toFixed(2));

  return {
    alertId, level: cfg.level,
    title: `${ctx.title} ${ctx.changePct > 0 ? '上升' : '下降'} ${Math.abs(ctx.changePct).toFixed(1)}%`,
    summary: `${ctx.title}从基线 ${baselineMean}${isPct ? '%' : ''} 降至 ${actualVal}${isPct ? '%' : ''}（${ctx.changePct > 0 ? '+' : ''}${ctx.changePct}%，-${cfg.sigma}σ）。锁定维度：${cfg.dim.vendor}·${cfg.dim.province}。`,
    metricName: ctx.key, metricLabel: ctx.title, metricKey: cfg.metricKey,
    currentValue: actualVal, baselineValue: baselineMean, changePct: ctx.changePct, deviationSigma: cfg.sigma,
    dimension: cfg.dim, estimatedLoss: cfg.loss, detectedAt: fmtDateTime(TODAY, cfg.time[0], cfg.time[1]),
    attributionStatus: cfg.level === 'S05' || cfg.level === 'S04' ? 'S08' : null,
    trendData: { dates: DATES_30, actual, baseline, upperBound: upper, lowerBound: lower },
    dimensionComparison: {
      vendors: [
        { name: '小米', current: isPct ? actualVal * 0.85 : actualVal * 0.8, baseline: baselineMean },
        { name: '华为', current: isPct ? baselineMean * 0.95 : baselineMean * 0.92, baseline: baselineMean },
        { name: 'OPPO', current: isPct ? baselineMean * 0.98 : baselineMean * 0.96, baseline: baselineMean },
        { name: 'VIVO', current: isPct ? baselineMean * 0.96 : baselineMean * 0.94, baseline: baselineMean },
        { name: '三星', current: baselineMean * 0.9, baseline: baselineMean },
      ],
      provinces: [
        { name: '广东', current: actualVal, baseline: baselineMean, changePct: ctx.changePct },
        { name: '浙江', current: baselineMean * 0.88, baseline: baselineMean, changePct: -12 },
        { name: '江苏', current: baselineMean * 0.92, baseline: baselineMean, changePct: -8 },
        { name: '北京', current: baselineMean * 0.97, baseline: baselineMean, changePct: -3 },
        { name: '上海', current: baselineMean * 0.96, baseline: baselineMean, changePct: -4 },
        { name: '山东', current: baselineMean * 0.98, baseline: baselineMean, changePct: -2 },
        { name: '四川', current: baselineMean * 0.99, baseline: baselineMean, changePct: -1 },
        { name: '湖北', current: baselineMean * 0.98, baseline: baselineMean, changePct: -2 },
      ],
      sendTypes: [
        { name: '全量', current: actualVal, baseline: baselineMean },
        { name: '本地实时', current: baselineMean * 0.92, baseline: baselineMean },
        { name: '个性化实时', current: baselineMean * 0.97, baseline: baselineMean },
        { name: '个性化非实时', current: baselineMean * 0.98, baseline: baselineMean },
      ],
      platforms: [
        { name: 'Android', current: actualVal, baseline: baselineMean },
        { name: 'Android去华为', current: baselineMean * 0.95, baseline: baselineMean },
        { name: 'iOS', current: baselineMean * 0.98, baseline: baselineMean },
      ],
    },
    timeline: [
      { time: fmtDateTime(TODAY, cfg.time[0], cfg.time[1]), event: '监控 Agent 巡检发现异常', icon: 'detect' },
      { time: fmtDateTime(TODAY, cfg.time[0] + 0, cfg.time[1] + 5), event: `${cfg.level === 'S05' ? '严重' : ''}告警推送至分析师`, icon: 'alert' },
      { time: fmtDateTime(TODAY, cfg.time[0] + 0, cfg.time[1] + 10), event: '归因 Agent 自动触发分析', icon: 'attribution' },
      { time: fmtDateTime(TODAY, cfg.time[0] + 0, cfg.time[1] + 30), event: `归因完成 — 根因：${ctx.rootCause.slice(0, 30)}...`, icon: 'attribution' },
    ],
  };
}
