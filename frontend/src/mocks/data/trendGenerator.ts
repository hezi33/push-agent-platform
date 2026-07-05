// ============================================================
// 趋势数据生成器 — 卡片迷你图 + Drawer 共享
// 保证同一个指标在不同视图下趋势一致
// ============================================================

/**
 * 伪随机数生成器（基于 seed 的 mulberry32 算法）
 * 用于保证同一指标的趋势数据在迷你图和详情 Drawer 中一致
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/** 指标 key → seed 映射 */
const SEED_MAP: Record<string, number> = {
  send_uv: 42, show_uv: 137, uv_open_rate: 256, pv_open_rate: 399,
  first_open_uv: 512, avg_show: 678, arrive_rate: 789,
};

/**
 * 生成 N 天趋势数据
 * @param metricKey 指标 key
 * @param baseValue 基准值
 * @param noisePct 波动幅度
 * @param days 天数
 * @param anomalyDay 异常在哪一天（-1 表示最后一天，null 表示无异常）
 * @param anomalyValue 异常值
 */
export function generateTrend(
  metricKey: string,
  baseValue: number,
  noisePct: number,
  days: number,
  anomalyDay: number | null = null,
  anomalyValue?: number,
): number[] {
  const seed = SEED_MAP[metricKey] || 100;
  const rng = mulberry32(seed);
  const result: number[] = [];

  for (let i = 0; i < days; i++) {
    if (anomalyDay !== null && i === anomalyDay && anomalyValue !== undefined) {
      result.push(anomalyValue);
    } else {
      const noise = baseValue * noisePct * (rng() * 2 - 1);
      result.push(+(baseValue + noise).toFixed(baseValue < 10 ? 2 : 0));
    }
  }
  return result;
}

/**
 * 生成 N 天的日期标签
 */
export function generateDates(days: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

/** 全国 30+ 省份 */
export const ALL_PROVINCES = [
  '广东', '浙江', '江苏', '山东', '北京', '上海', '四川', '湖北',
  '河南', '福建', '湖南', '安徽', '河北', '辽宁', '陕西', '重庆',
  '江西', '天津', '云南', '广西', '山西', '贵州', '黑龙江', '吉林',
  '甘肃', '内蒙古', '海南', '新疆', '宁夏', '青海', '西藏',
];

/** 所有厂商 */
export const ALL_VENDORS = ['华为', '小米', 'OPPO', 'VIVO', '三星'];

/** 所有发送类型 */
export const ALL_SEND_TYPES = ['全量', '本地实时', '个性化实时', '个性化非实时', '热点追踪'];
