/**
 * 语义色映射（DESIGN.md §二）
 *
 * 告警级别 → Tag 颜色
 * 置信度 → 仪表盘分段颜色
 * 状态码 → UI 颜色
 */

/** 告警级别 → 颜色映射 */
export const ALERT_LEVEL_COLORS: Record<string, string> = {
  S05: '#F53F3F', // 严重 — 红色
  S04: '#FF7D00', // 告警 — 橙色
  S03: '#F7BA1E', // 关注 — 黄色
};

export const ALERT_LEVEL_LABELS: Record<string, string> = {
  S05: '严重告警',
  S04: '告警',
  S03: '关注',
};

/** Agent 状态码 → 颜色映射 */
export const STATUS_COLORS: Record<string, string> = {
  // 正常/完成/闭环 — 绿色
  S02: '#00B42A',
  S08: '#00B42A',
  S15: '#00B42A',
  // 进行中 — 蓝色
  S01: '#165DFF',
  S07: '#165DFF',
  S10: '#165DFF',
  S13: '#165DFF',
  S14: '#165DFF',
  // 告警/关注 — 橙色
  S03: '#F7BA1E',
  S04: '#FF7D00',
  // 严重/超期/未达标 — 红色
  S05: '#F53F3F',
  S16: '#F53F3F',
  S17: '#F53F3F',
  // 待处理/待审核 — 灰色
  S09: '#86909C',
  S11: '#86909C',
  S12: '#86909C',
  S06: '#86909C',
  S18: '#F53F3F',
};

export const STATUS_LABELS: Record<string, string> = {
  S01: '巡检中',
  S02: '正常',
  S03: '关注',
  S04: '告警',
  S05: '严重告警',
  S06: '数据延迟',
  S07: '归因中',
  S08: '归因完成',
  S09: '待人工复核',
  S10: '建议生成中',
  S11: '待审核',
  S12: '已推送待执行',
  S13: '执行中',
  S14: '持续跟踪中',
  S15: '已闭环',
  S16: '超期未执行',
  S17: '效果未达标',
  S18: '升级处理中',
};

/** 置信度 → 颜色分段 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 80) return '#00B42A';
  if (confidence >= 60) return '#F7BA1E';
  return '#F53F3F';
}

/** ECharts 数据可视化色板 */
export const CHART_COLORS = [
  '#165DFF',
  '#00B42A',
  '#FF7D00',
  '#F53F3F',
  '#722ED1',
  '#14C9C9',
];

/** 趋势方向颜色 */
export function getTrendColor(changePct: number, isPositiveGreen: boolean = true): string {
  if (Math.abs(changePct) < 1) return '#86909C'; // 平
  const isUp = changePct > 0;
  const isGood = isPositiveGreen ? isUp : !isUp;
  return isGood ? '#00B42A' : '#F53F3F';
}

/** 趋势箭头符号 */
export function getTrendArrow(changePct: number): string {
  if (Math.abs(changePct) < 1) return '→';
  return changePct > 0 ? '↑' : '↓';
}
