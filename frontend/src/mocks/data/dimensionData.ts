// ============================================================
// 各维度的指标数据 — 用于筛选下钻
// 选「小米」→ 数据显示小米维度的值，不是全量的值
// ============================================================

export interface DimensionValue {
  name: string;
  current: number;
  baseline: number;
  changePct: number;
}

/** 各厂商在各指标下的数据 */
export const VENDOR_DATA: Record<string, Record<string, DimensionValue>> = {
  send_uv: {
    '华为': { name: '华为', current: 5800000, baseline: 5950000, changePct: -2.5 },
    '小米': { name: '小米', current: 7200000, baseline: 7400000, changePct: -2.7 },
    'OPPO': { name: 'OPPO', current: 5100000, baseline: 5050000, changePct: +1.0 },
    'VIVO': { name: 'VIVO', current: 4900000, baseline: 5000000, changePct: -2.0 },
    '三星': { name: '三星', current: 800000, baseline: 820000, changePct: -2.4 },
  },
  show_uv: {
    '华为': { name: '华为', current: 1680000, baseline: 1720000, changePct: -2.3 },
    '小米': { name: '小米', current: 2100000, baseline: 2180000, changePct: -3.7 },
    'OPPO': { name: 'OPPO', current: 1480000, baseline: 1460000, changePct: +1.4 },
    'VIVO': { name: 'VIVO', current: 1420000, baseline: 1450000, changePct: -2.1 },
    '三星': { name: '三星', current: 240000, baseline: 248000, changePct: -3.2 },
  },
  uv_open_rate: {
    '华为': { name: '华为', current: 3.85, baseline: 3.92, changePct: -1.8 },
    '小米': { name: '小米', current: 3.15, baseline: 3.88, changePct: -18.8 },
    'OPPO': { name: 'OPPO', current: 3.78, baseline: 3.82, changePct: -1.0 },
    'VIVO': { name: 'VIVO', current: 3.62, baseline: 3.75, changePct: -3.5 },
    '三星': { name: '三星', current: 3.55, baseline: 3.60, changePct: -1.4 },
  },
  pv_open_rate: {
    '华为': { name: '华为', current: 0.72, baseline: 0.74, changePct: -2.7 },
    '小米': { name: '小米', current: 0.58, baseline: 0.72, changePct: -19.4 },
    'OPPO': { name: 'OPPO', current: 0.70, baseline: 0.71, changePct: -1.4 },
    'VIVO': { name: 'VIVO', current: 0.68, baseline: 0.70, changePct: -2.9 },
    '三星': { name: '三星', current: 0.65, baseline: 0.67, changePct: -3.0 },
  },
  first_open_uv: {
    '华为': { name: '华为', current: 38000, baseline: 41000, changePct: -7.3 },
    '小米': { name: '小米', current: 42000, baseline: 45000, changePct: -6.7 },
    'OPPO': { name: 'OPPO', current: 31000, baseline: 31000, changePct: 0 },
    'VIVO': { name: 'VIVO', current: 28000, baseline: 29500, changePct: -5.1 },
    '三星': { name: '三星', current: 8000, baseline: 8500, changePct: -5.9 },
  },
  avg_show: {
    '华为': { name: '华为', current: 10.5, baseline: 10.8, changePct: -2.8 },
    '小米': { name: '小米', current: 8.2, baseline: 9.5, changePct: -13.7 },
    'OPPO': { name: 'OPPO', current: 9.8, baseline: 9.6, changePct: +2.1 },
    'VIVO': { name: 'VIVO', current: 9.1, baseline: 9.3, changePct: -2.2 },
    '三星': { name: '三星', current: 7.5, baseline: 7.8, changePct: -3.8 },
  },
};

/** 各省份在各指标下的数据（采样部分省份） */
export const PROVINCE_DATA: Record<string, Record<string, DimensionValue>> = {
  uv_open_rate: {
    '广东': { name: '广东', current: 3.05, baseline: 3.88, changePct: -21.4 },
    '浙江': { name: '浙江', current: 3.52, baseline: 3.82, changePct: -7.9 },
    '江苏': { name: '江苏', current: 3.65, baseline: 3.85, changePct: -5.2 },
    '北京': { name: '北京', current: 3.78, baseline: 3.86, changePct: -2.1 },
    '上海': { name: '上海', current: 3.75, baseline: 3.84, changePct: -2.3 },
    '山东': { name: '山东', current: 3.82, baseline: 3.87, changePct: -1.3 },
    '四川': { name: '四川', current: 3.88, baseline: 3.88, changePct: 0 },
  },
  send_uv: {
    '广东': { name: '广东', current: 3200000, baseline: 3300000, changePct: -3.0 },
    '浙江': { name: '浙江', current: 2400000, baseline: 2450000, changePct: -2.0 },
    '江苏': { name: '江苏', current: 2100000, baseline: 2150000, changePct: -2.3 },
  },
};

/** 各发送类型在各指标下的数据 */
export const SEND_TYPE_DATA: Record<string, Record<string, DimensionValue>> = {
  uv_open_rate: {
    '全量': { name: '全量', current: 3.40, baseline: 3.90, changePct: -12.8 },
    '本地实时': { name: '本地实时', current: 3.55, baseline: 3.70, changePct: -4.1 },
    '个性化实时': { name: '个性化实时', current: 4.12, baseline: 4.05, changePct: +1.7 },
    '个性化非实时': { name: '个性化非实时', current: 3.28, baseline: 3.35, changePct: -2.1 },
    '热点追踪': { name: '热点追踪', current: 4.50, baseline: 4.20, changePct: +7.1 },
  },
};

import { ALL_VENDORS, ALL_PROVINCES, ALL_SEND_TYPES } from './trendGenerator';

/** 获取筛选后的当前值 */
export function getFilteredValue(
  metricKey: string,
  card: { currentValue: number; yesterdayValue: number; changePct: number },
  vendor: string,
  province: string,
  sendType: string,
): { currentValue: number; yesterdayValue: number; changePct: number } {
  // 优先级：厂商 > 省份 > 发送类型
  const vd = vendor !== 'all' ? VENDOR_DATA[metricKey]?.[vendor] : null;
  const pd = province !== 'all' ? PROVINCE_DATA[metricKey]?.[province] : null;
  const sd = sendType !== 'all' ? SEND_TYPE_DATA[metricKey]?.[sendType] : null;

  const match = vd || pd || sd;
  if (match) {
    return { currentValue: match.current, yesterdayValue: match.baseline, changePct: match.changePct };
  }
  return { currentValue: card.currentValue, yesterdayValue: card.yesterdayValue, changePct: card.changePct };
}
