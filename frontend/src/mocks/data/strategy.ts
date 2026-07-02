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

export function getStrategyDetail(): StrategySuggestionData {
  const dDay = fmtDate(TODAY);

  return {
    suggestionId: 'SUG-' + fmtDate(TODAY).replace(/-/g, '') + '-001',
    status: 'S13',
    statusLabel: '执行中',
    priority: 'P1',
    problemDesc: '广东省本地 Push 日均 12 条（目标 20 条），首启 UV 缺口约 1,400/天，连续 3 天不达标，主要原因为广东省小米用户群的内容匹配度下降。',
    suggestion: '向广东省增发 5-8 条本地 Push，优先选择天气预警、交通管制、本地民生新闻三类高打开率内容。调整推送时段至 17:00-19:00（用户下班通勤高峰）。',
    reference: '近期广东省高打开率内容：天气预警（2.1%）、交通管制（1.9%）、本地民生新闻（1.7%）。17:00-19:00 时段历史打开率高于均值 15%。',
    estimatedEffect: {
      currentFirstOpen: 11800,
      estimatedFirstOpen: 13000,
      improvementAbs: 1200,
      improvementPct: 10.2,
      basedOn: '基于 3 个历史相似案例，省份增发 Push 后首启 UV 平均提升 18%',
    },
    editorId: 'E-001',
    editorName: '张三（广东省早班编辑）',
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
      { date: daysFrom(TODAY, 3), event: '策略 Agent 自动检查效果（待触发）', icon: 'check' },
    ],
    metricComparison: [
      { label: '广东首启 UV', before: 11800, after: 12500, unit: '' },
      { label: '广东 Push 条数', before: 12, after: 18, unit: '条' },
      { label: '首启 UV 达成率', before: 82, after: 94, unit: '%' },
    ],
  };
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
