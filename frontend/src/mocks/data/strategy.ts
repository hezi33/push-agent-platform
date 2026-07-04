// ============================================================
// Mock 数据 — 策略建议页
// ============================================================

const TODAY = new Date();

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysFrom(d: Date, n: number): string {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return fmtDate(copy);
}

export interface StrategySuggestionData {
  suggestionId: string;
  status: string;
  statusLabel: string;
  priority: string;
  problemDesc: string;
  suggestion: string;
  reference: string;
  estimatedEffect: {
    currentFirstOpen: number;
    estimatedFirstOpen: number;
    improvementAbs: number;
    improvementPct: number;
    basedOn: string;
  };
  editorId: string;
  editorName: string;
  checkpoints: { label: string; date: string; status: 'done' | 'current' | 'pending' | 'warning'; note: string }[];
  timeline: { date: string; event: string; icon: string }[];
  metricComparison: { label: string; before: number; after: number; unit: string }[];
}

const DETAILS: Record<string, StrategySuggestionData> = {};

function buildDetails() {
  const dDay = fmtDate(TODAY);
  const todayMark = fmtDate(TODAY).replace(/-/g, '');

  // 001: 执行中 — 广东本地 Push 增发
  DETAILS[`SUG-${todayMark}-001`] = {
    suggestionId: `SUG-${todayMark}-001`, status: 'S13', statusLabel: '执行中', priority: 'P1',
    problemDesc: '广东省本地 Push 日均 12 条（目标 20 条），首启 UV 缺口约 1,400/天，连续 3 天不达标。',
    suggestion: '向广东省增发 5-8 条本地 Push，优先选择天气预警、交通管制、本地民生新闻三类高打开率内容。',
    reference: '近期广东省高打开率内容：天气预警（2.1%）、交通管制（1.9%）、本地民生新闻（1.7%）。',
    estimatedEffect: { currentFirstOpen: 11800, estimatedFirstOpen: 13000, improvementAbs: 1200, improvementPct: 10.2, basedOn: '基于 3 个历史相似案例' },
    editorId: 'E-001', editorName: '张三（广东省早班编辑）',
    checkpoints: [
      { label: 'D-day 下发', date: dDay, status: 'done', note: '建议已推送至飞书' },
      { label: 'D+1 执行检查', date: daysFrom(TODAY, 1), status: 'done', note: '✅ 编辑已确认执行，广东 Push 增至 18 条' },
      { label: 'D+3 效果检查', date: daysFrom(TODAY, 3), status: 'current', note: '⏳ 等待检查...' },
      { label: 'D+7 持续验证', date: daysFrom(TODAY, 7), status: 'pending', note: '待检查' },
    ],
    timeline: [
      { date: dDay, event: '策略 Agent 基于归因报告生成优化建议', icon: 'generate' },
      { date: dDay, event: '建议推送至编辑 @张三（飞书）', icon: 'push' },
      { date: daysFrom(TODAY, 1), event: '编辑确认执行，广东 Push 从 12 条增至 18 条', icon: 'execute' },
    ],
    metricComparison: [
      { label: '广东首启 UV', before: 11800, after: 12500, unit: '' },
      { label: '广东 Push 条数', before: 12, after: 18, unit: '条' },
    ],
  };

  // 002: 已闭环 — 小米浙江推送时段调整
  DETAILS[`SUG-${todayMark}-002`] = {
    suggestionId: `SUG-${todayMark}-002`, status: 'S15', statusLabel: '已闭环', priority: 'P1',
    problemDesc: '小米·浙江个性化实时 Push 打开率下降 6.7%，推送时段与用户活跃高峰错位。',
    suggestion: '将浙江小米用户的个性化 Push 时段调整为 18:00-20:00（用户活跃高峰），内容以科技、体育为主。',
    reference: '浙江小米用户历史活跃高峰为 18:00-20:00，该时段历史打开率高于全天均值 22%。',
    estimatedEffect: { currentFirstOpen: 8500, estimatedFirstOpen: 9350, improvementAbs: 850, improvementPct: 10.0, basedOn: '基于时段调整的历史案例' },
    editorId: 'E-002', editorName: '李四（浙江省编辑）',
    checkpoints: [
      { label: 'D-day 下发', date: daysFrom(TODAY, -7), status: 'done', note: '建议已推送' },
      { label: 'D+1 执行检查', date: daysFrom(TODAY, -6), status: 'done', note: '✅ 编辑确认，时段已调整' },
      { label: 'D+3 效果检查', date: daysFrom(TODAY, -4), status: 'done', note: '✅ 首启 UV +10%' },
      { label: 'D+7 持续验证', date: daysFrom(TODAY, 0), status: 'done', note: '✅ 效果持续，已闭环' },
    ],
    timeline: [
      { date: daysFrom(TODAY, -7), event: '策略 Agent 生成建议', icon: 'generate' },
      { date: daysFrom(TODAY, -7), event: '推送至编辑 @李四', icon: 'push' },
      { date: daysFrom(TODAY, -6), event: '编辑确认执行', icon: 'execute' },
      { date: daysFrom(TODAY, 0), event: 'D+7 验证通过，策略闭环', icon: 'check' },
    ],
    metricComparison: [
      { label: '浙江首启 UV', before: 8500, after: 9350, unit: '' },
      { label: 'UV 打开率', before: 3.62, after: 3.92, unit: '%' },
    ],
  };

  // 003: 超期未执行 — 华为SDK版本回滚
  DETAILS[`SUG-${todayMark}-003`] = {
    suggestionId: `SUG-${todayMark}-003`, status: 'S16', statusLabel: '超期未执行', priority: 'P0',
    problemDesc: '华为·江苏首启 UV 下降 9.6%，根因定位为华为推送 SDK 版本更新导致部分机型到达率下降。',
    suggestion: '紧急联系华为技术支持，回滚推送 SDK 版本至稳定版 v3.2.1，对受影响机型启用备用通道过渡。',
    reference: '华为 SDK v3.3.0 存在已知兼容性问题，v3.2.1 已稳定运行 6 个月。',
    estimatedEffect: { currentFirstOpen: 14200, estimatedFirstOpen: 16000, improvementAbs: 1800, improvementPct: 12.7, basedOn: 'SDK 版本回滚历史成功率 95%' },
    editorId: 'E-003', editorName: '王五（江苏省编辑）',
    checkpoints: [
      { label: 'D-day 下发', date: daysFrom(TODAY, -3), status: 'done', note: '建议已推送' },
      { label: 'D+1 执行检查', date: daysFrom(TODAY, -2), status: 'warning', note: '⚠️ 编辑未确认执行' },
      { label: 'D+3 效果检查', date: daysFrom(TODAY, 0), status: 'pending', note: 'D+5 将抄送组长' },
      { label: 'D+7 持续验证', date: daysFrom(TODAY, 4), status: 'pending', note: '待检查' },
    ],
    timeline: [
      { date: daysFrom(TODAY, -3), event: '策略 Agent 生成紧急建议', icon: 'generate' },
      { date: daysFrom(TODAY, -3), event: '推送至编辑 @王五', icon: 'push' },
      { date: daysFrom(TODAY, -2), event: '⚠️ D+1 未确认，已触发提醒', icon: 'check' },
    ],
    metricComparison: [
      { label: '江苏首启 UV', before: 14200, after: 14200, unit: '' },
      { label: '到达率', before: 28, after: 28, unit: '%' },
    ],
  };

  // 004: 待审核 — OPPO展示频次调整
  DETAILS[`SUG-${todayMark}-004`] = {
    suggestionId: `SUG-${todayMark}-004`, status: 'S11', statusLabel: '待审核', priority: 'P2',
    problemDesc: 'OPPO 个性化实时人均展示次数下降 10.8%，可能为厂商展示策略调整所致。',
    suggestion: '检查 OPPO 厂商展示策略配置，将展示频次上限从 3次/天 调整为 5次/天。',
    reference: '竞品在同机型上展示频次为 5-8 次/天，当前配置偏保守。',
    estimatedEffect: { currentFirstOpen: 5200, estimatedFirstOpen: 5800, improvementAbs: 600, improvementPct: 11.5, basedOn: '首次建议，效果待验证' },
    editorId: 'E-004', editorName: '赵六（OPPO 通道负责人）',
    checkpoints: [
      { label: 'D-day 下发', date: dDay, status: 'current', note: '⏳ 等待审核' },
      { label: 'D+1 执行检查', date: daysFrom(TODAY, 1), status: 'pending', note: '待审核通过后执行' },
      { label: 'D+3 效果检查', date: daysFrom(TODAY, 3), status: 'pending', note: '待检查' },
      { label: 'D+7 持续验证', date: daysFrom(TODAY, 7), status: 'pending', note: '待检查' },
    ],
    timeline: [
      { date: dDay, event: '策略 Agent 生成建议', icon: 'generate' },
      { date: dDay, event: '⏳ 等待分析师审核', icon: 'check' },
    ],
    metricComparison: [
      { label: '人均展示次数', before: 5.8, after: 5.8, unit: '次' },
      { label: '展示量', before: 680000, after: 680000, unit: '' },
    ],
  };
}

export function getStrategyDetail(suggestionId?: string): StrategySuggestionData {
  if (Object.keys(DETAILS).length === 0) buildDetails();
  if (suggestionId && DETAILS[suggestionId]) return DETAILS[suggestionId];
  // 默认返回第一项
  return Object.values(DETAILS)[0];
}

/** 策略建议列表 */
export function getStrategyList() {
  const today = fmtDate(TODAY);

  return [
    {
      suggestionId: 'SUG-' + fmtDate(TODAY).replace(/-/g, '') + '-001',
      status: 'S13', statusLabel: '执行中',
      priority: 'P1',
      problem: '广东本地 Push 条数不足，首启 UV 缺口 1,400/天',
      suggestion: '增发 5-8 条本地 Push，优先天气/交通/民生内容',
      editorName: '张三',
      effect: '+1,200 首启 UV',
      checkpoints: { d1: 'done', d3: 'current', d7: 'pending' },
    },
    {
      suggestionId: 'SUG-' + fmtDate(TODAY).replace(/-/g, '') + '-002',
      status: 'S15', statusLabel: '已闭环',
      priority: 'P1',
      problem: '小米·浙江个性化实时打开率下降 6.7%',
      suggestion: '调整推送时段至 18:00-20:00 用户活跃高峰',
      editorName: '李四',
      effect: '+850 首启 UV',
      checkpoints: { d1: 'done', d3: 'done', d7: 'done' },
    },
    {
      suggestionId: 'SUG-' + fmtDate(TODAY).replace(/-/g, '') + '-003',
      status: 'S16', statusLabel: '超期未执行',
      priority: 'P0',
      problem: '华为·江苏首启 UV 下降 9.6% — SDK 版本问题',
      suggestion: '联系华为技术支持，回滚推送 SDK 版本',
      editorName: '王五',
      effect: '+1,800 首启 UV',
      checkpoints: { d1: 'warning', d3: 'pending', d7: 'pending' },
    },
    {
      suggestionId: 'SUG-' + fmtDate(TODAY).replace(/-/g, '') + '-004',
      status: 'S11', statusLabel: '待审核',
      priority: 'P2',
      problem: 'OPPO 人均展示次数下降 10.8%',
      suggestion: '检查 OPPO 厂商展示策略配置，考虑调整展示频次上限',
      editorName: '赵六',
      effect: '预估恢复展示量 8-12%',
      checkpoints: { d1: 'pending', d3: 'pending', d7: 'pending' },
    },
  ];
}
