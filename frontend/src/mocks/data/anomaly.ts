// ============================================================
// Mock 数据 — 异常详情页
// 所有日期动态生成
// ============================================================

const TODAY = new Date();

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysAgo(n: number): Date {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d;
}

function fmtDateTime(d: Date, hour: number, minute: number = 0): string {
  const copy = new Date(d);
  copy.setHours(hour, minute, 0, 0);
  return copy.toISOString();
}

/** 生成 30 天日期 */
function dateRange(days: number): string[] {
  const arr: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    arr.push(fmtDate(daysAgo(i)));
  }
  return arr;
}

const DATES_30 = dateRange(30);

// ============================================================
// 告警详情（根据 alertId 返回不同数据）
// ============================================================

export interface AnomalyDetailData {
  alertId: string;
  level: string;
  title: string;
  summary: string;
  metricName: string;
  metricLabel: string;
  currentValue: number;
  baselineValue: number;
  changePct: number;
  deviationSigma: number;
  dimension: { sendType: string; vendor: string; province: string; platform: string };
  estimatedLoss: number;
  detectedAt: string;
  attributionStatus: string | null;
  // 30天趋势 + 基线
  trendData: {
    dates: string[];
    actual: number[];
    baseline: number[];
    upperBound: number[]; // +2σ
    lowerBound: number[]; // -2σ
  };
  // 多维度对比
  dimensionComparison: {
    vendors: { name: string; current: number; baseline: number }[];
    provinces: { name: string; current: number; baseline: number; changePct: number }[];
    sendTypes: { name: string; current: number; baseline: number }[];
    platforms: { name: string; current: number; baseline: number }[];
  };
  // 事件时间线
  timeline: { time: string; event: string; icon: 'detect' | 'alert' | 'attribution' | 'strategy' | 'action' }[];
}

/**
 * 获取异常详情数据
 */
export function getAnomalyDetail(alertId: string): AnomalyDetailData {
  // 根据 alertId 返回对应的异常详情
  // 默认返回「本地实时到达率骤降」的数据（PRD 主示例）

  const isArriveAnomaly = alertId.includes('-001');
  const metricLabel = isArriveAnomaly ? '到达率' : 'UV 打开率';
  const metricName = isArriveAnomaly ? 'arrive_rate' : 'uv_open_rate';
  const unit = isArriveAnomaly ? '%' : '%';

  // 30 天趋势 — 前 29 天正常波动，最后一天骤降
  const baselineMean = isArriveAnomaly ? 35 : 3.90;
  const noisePct = isArriveAnomaly ? 0.06 : 0.03;
  const dropValue = isArriveAnomaly ? 22 : 3.40;
  const sigma = isArriveAnomaly ? 2.5 : 0.22;

  const actual = DATES_30.map((_, i) => {
    if (i === DATES_30.length - 1) return dropValue; // 最后一天异常
    return +(baselineMean + baselineMean * noisePct * (Math.random() * 2 - 1)).toFixed(2);
  });

  const baseline = DATES_30.map(() => baselineMean);
  const upperBound = DATES_30.map(() => +(baselineMean + 2 * sigma).toFixed(2));
  const lowerBound = DATES_30.map(() => +(baselineMean - 2 * sigma).toFixed(2));

  return {
    alertId,
    level: isArriveAnomaly ? 'S05' : 'S04',
    title: isArriveAnomaly
      ? '本地实时 Push 到达率骤降至 22%'
      : '全量 Push UV 打开率下降 12.8%',
    summary: isArriveAnomaly
      ? `本地实时 Push 到达率从基线 ${baselineMean}% 骤降至 ${dropValue}%，下降 ${((1 - dropValue / baselineMean) * 100).toFixed(1)}%（-${isArriveAnomaly ? '2.8' : '2.4'}σ）。影响 Android·小米·广东省，预计已损失首启用户约 2,300。`
      : `全量 Push UV 打开率从基线 ${baselineMean}% 降至 ${dropValue}%（-12.8%，-2.4σ）。多维度受影响，归因已完成，置信度 65%。`,
    metricName,
    metricLabel,
    currentValue: dropValue,
    baselineValue: baselineMean,
    changePct: +(-((1 - dropValue / baselineMean) * 100)).toFixed(1),
    deviationSigma: isArriveAnomaly ? 2.8 : 2.4,
    dimension: isArriveAnomaly
      ? { sendType: '本地实时', vendor: '小米', province: '广东', platform: 'Android' }
      : { sendType: '全量', vendor: 'all', province: 'all', platform: 'all' },
    estimatedLoss: isArriveAnomaly ? 2300 : 5200,
    detectedAt: fmtDateTime(TODAY, 14, 0),
    attributionStatus: isArriveAnomaly ? 'S07' : 'S08',

    trendData: { dates: DATES_30, actual, baseline, upperBound, lowerBound },

    dimensionComparison: {
      vendors: [
        { name: '小米', current: isArriveAnomaly ? 22 : 3.2, baseline: isArriveAnomaly ? 35 : 3.9 },
        { name: '华为', current: isArriveAnomaly ? 34 : 3.85, baseline: isArriveAnomaly ? 35 : 3.88 },
        { name: 'OPPO', current: isArriveAnomaly ? 33 : 3.78, baseline: isArriveAnomaly ? 34 : 3.82 },
        { name: 'VIVO', current: isArriveAnomaly ? 35 : 3.9, baseline: isArriveAnomaly ? 35 : 3.91 },
        { name: '三星', current: isArriveAnomaly ? 32 : 3.75, baseline: isArriveAnomaly ? 33 : 3.77 },
      ],
      provinces: [
        { name: '广东', current: isArriveAnomaly ? 22 : 3.1, baseline: isArriveAnomaly ? 35 : 3.88, changePct: -37 },
        { name: '浙江', current: isArriveAnomaly ? 30 : 3.5, baseline: isArriveAnomaly ? 34 : 3.82, changePct: -12 },
        { name: '江苏', current: isArriveAnomaly ? 32 : 3.6, baseline: isArriveAnomaly ? 35 : 3.85, changePct: -8 },
        { name: '北京', current: isArriveAnomaly ? 34 : 3.75, baseline: isArriveAnomaly ? 35 : 3.86, changePct: -3 },
        { name: '上海', current: isArriveAnomaly ? 33 : 3.72, baseline: isArriveAnomaly ? 34 : 3.84, changePct: -3 },
        { name: '山东', current: isArriveAnomaly ? 34 : 3.8, baseline: isArriveAnomaly ? 35 : 3.87, changePct: -2 },
        { name: '四川', current: isArriveAnomaly ? 35 : 3.85, baseline: isArriveAnomaly ? 35 : 3.88, changePct: -1 },
        { name: '湖北', current: isArriveAnomaly ? 34 : 3.82, baseline: isArriveAnomaly ? 35 : 3.87, changePct: -1 },
      ],
      sendTypes: [
        { name: '本地实时', current: isArriveAnomaly ? 22 : 3.4, baseline: isArriveAnomaly ? 35 : 3.9 },
        { name: '全量', current: 33, baseline: 34 },
        { name: '个性化实时', current: 36, baseline: 36 },
        { name: '个性化非实时', current: 35, baseline: 35 },
      ],
      platforms: [
        { name: 'Android', current: isArriveAnomaly ? 24 : 3.3, baseline: isArriveAnomaly ? 35 : 3.88 },
        { name: 'Android去华为', current: isArriveAnomaly ? 22 : 3.15, baseline: isArriveAnomaly ? 34 : 3.85 },
        { name: 'iOS', current: isArriveAnomaly ? 35 : 3.78, baseline: isArriveAnomaly ? 35 : 3.82 },
      ],
    },

    timeline: [
      { time: fmtDateTime(TODAY, 14, 0), event: '监控 Agent 巡检发现异常，偏离度 2.8σ', icon: 'detect' },
      { time: fmtDateTime(TODAY, 14, 0, 30), event: '严重告警推送至分析师 + 抄送管理层', icon: 'alert' },
      { time: fmtDateTime(TODAY, 14, 1), event: '归因 Agent 自动触发，开始范围锁定', icon: 'attribution' },
      ...(isArriveAnomaly
        ? [{ time: fmtDateTime(TODAY, 14, 5), event: '归因进行中 — 已完成贡献度分解，正在漏斗定位...', icon: 'attribution' as const }]
        : [
            { time: fmtDateTime(TODAY, 11, 3), event: '归因完成 — 根因锁定为内容质量问题（置信度 65%）', icon: 'attribution' as const },
            { time: fmtDateTime(TODAY, 11, 5), event: '策略 Agent 已生成优化建议，待分析师审核', icon: 'strategy' as const },
          ]),
    ],
  };
}
