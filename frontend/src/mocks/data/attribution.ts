// ============================================================
// Mock 数据 — 归因分析页
// ============================================================

const TODAY = new Date();

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function fmtDateTime(d: Date, hour: number, minute: number = 0): string {
  const copy = new Date(d);
  copy.setHours(hour, minute, 0, 0);
  return copy.toISOString();
}

export interface AttributionStep {
  key: string;
  label: string;
  status: 'done' | 'running' | 'pending';
  duration?: string;
}

export interface ContributionNode {
  name: string;
  value: number;
  contributionPct: number;
  isAbnormal: boolean;
  children?: ContributionNode[];
}

export interface FunnelStageAnalysis {
  stage: string;
  stageLabel: string;
  currentRate: number;
  baselineRate: number;
  changePct: number;
  isAbnormal: boolean;
  direction: string;
}

export interface RootCauseHypothesis {
  rank: number;
  hypothesis: string;
  confidence: number;
  evidence: string[];
}

export interface AttributionReport {
  reportId: string;
  alertId: string;
  title: string;
  status: 'S07' | 'S08' | 'S09';
  anomalyDesc: string;
  totalDuration: string;
  steps: AttributionStep[];
  contributionTree: ContributionNode;
  funnelAnalysis: FunnelStageAnalysis[];
  rootCauses: RootCauseHypothesis[];
  topConfidence: number;
  createdAt: string;
}

export function getAttributionReport(): AttributionReport {
  return {
    reportId: 'ATTR-' + fmtDate(TODAY).replace(/-/g, '') + '-002',
    alertId: 'ALT-' + fmtDate(TODAY).replace(/-/g, '') + '-002',
    title: '全量 Push UV 打开率下降 12.8% 归因分析',
    status: 'S08',
    anomalyDesc: '全量 Push UV 打开率从基线 3.90% 降至 3.40%（-12.8%，-2.4σ）',
    totalDuration: '4 分 32 秒',
    steps: [
      { key: 'scope', label: '范围锁定', status: 'done', duration: '1 分 12 秒' },
      { key: 'funnel', label: '链路定位', status: 'done', duration: '48 秒' },
      { key: 'root_cause', label: '根因推断', status: 'done', duration: '1 分 55 秒' },
      { key: 'report', label: '报告生成', status: 'done', duration: '37 秒' },
    ],
    contributionTree: {
      name: 'UV打开率 -0.5pp',
      value: 100,
      contributionPct: 100,
      isAbnormal: true,
      children: [
        {
          name: '全量', value: 10, contributionPct: 10, isAbnormal: false,
        },
        {
          name: '本地实时', value: 70, contributionPct: 70, isAbnormal: true,
          children: [
            { name: '华为(5%)', value: 5, contributionPct: 5, isAbnormal: false },
            {
              name: '小米(75%)', value: 75, contributionPct: 75, isAbnormal: true,
              children: [
                { name: '广东(60%)', value: 60, contributionPct: 60, isAbnormal: true },
                { name: '浙江(25%)', value: 25, contributionPct: 25, isAbnormal: true },
                { name: '江苏(10%)', value: 10, contributionPct: 10, isAbnormal: false },
              ],
            },
            { name: 'OPPO(12%)', value: 12, contributionPct: 12, isAbnormal: false },
            { name: 'VIVO(8%)', value: 8, contributionPct: 8, isAbnormal: false },
          ],
        },
        {
          name: '个性化实时', value: 15, contributionPct: 15, isAbnormal: false,
        },
        {
          name: '个性化非实时', value: 5, contributionPct: 5, isAbnormal: false,
        },
      ],
    },
    funnelAnalysis: [
      {
        stage: 'arrive', stageLabel: '到达率', currentRate: 67.5, baselineRate: 68.0, changePct: -0.7, isAbnormal: false, direction: '→ 持平',
      },
      {
        stage: 'show', stageLabel: '展示率', currentRate: 43.0, baselineRate: 43.5, changePct: -1.1, isAbnormal: false, direction: '→ 持平',
      },
      {
        stage: 'open', stageLabel: 'UV打开率', currentRate: 3.40, baselineRate: 3.90, changePct: -12.8, isAbnormal: true, direction: '↓ 下降',
      },
      {
        stage: 'first_open', stageLabel: '首启率', currentRate: 1.96, baselineRate: 2.22, changePct: -11.7, isAbnormal: true, direction: '↓ 联动下降',
      },
    ],
    rootCauses: [
      {
        rank: 1,
        hypothesis: '广东省小米用户对近期全量 Push 内容兴趣度显著下降，标题点击率降低导致整体打开率下滑',
        confidence: 65,
        evidence: [
          '仅小米·广东省出现显著下降（贡献 60% 降幅），OPPO 同期数据正常',
          '到达率和展示率无变化，排除厂商通道和 SDK 问题',
          '广东省昨日推送内容以娱乐八卦为主，与本地用户偏好（民生/天气）不匹配',
          '小米厂商通道近期无策略调整记录',
        ],
      },
      {
        rank: 2,
        hypothesis: '广东地区昨日暴雨导致用户户外活动减少，Push 打开意愿降低',
        confidence: 30,
        evidence: [
          '广东省气象局昨日发布暴雨橙色预警，时段与异常时段重合',
          '历史数据显示暴雨天气下 Push 打开率平均下降 8-15%',
        ],
      },
      {
        rank: 3,
        hypothesis: '个性化推荐算法在广东小米用户群上的冷启动效果不佳',
        confidence: 5,
        evidence: [
          '近一周新增小米用户中广东省占比偏高，新用户画像积累不足',
        ],
      },
    ],
    topConfidence: 65,
    createdAt: fmtDateTime(TODAY, 11, 5),
  };
}

/** 模拟归因进行中的进度数据 */
export function getAttributionProgress(): { status: 'S07'; currentStep: number; steps: AttributionStep[] } {
  return {
    status: 'S07',
    currentStep: 2,
    steps: [
      { key: 'scope', label: '范围锁定', status: 'done', duration: '1 分 12 秒' },
      { key: 'funnel', label: '链路定位', status: 'done', duration: '48 秒' },
      { key: 'root_cause', label: '根因推断', status: 'running' },
      { key: 'report', label: '报告生成', status: 'pending' },
    ],
  };
}
