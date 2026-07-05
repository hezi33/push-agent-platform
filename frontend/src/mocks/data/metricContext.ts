// ============================================================
// 指标上下文 — 被 Agent 工作台、归因页、策略页共享
// 确保所有页面显示的数据一致
// ============================================================

export interface MetricContext {
  key: string;
  title: string;
  changePct: number;
  isAnomaly: boolean;
  // 归因数据
  attributionTitle: string;
  attributionDesc: string;
  lockedDim: string;
  funnelIssue: string;
  rootCause: string;
  confidence: number;
  candidateCauses: string[];
  // 策略数据
  strategyProblemDesc: string;
  strategySuggestion: string;
  strategyReference: string;
  strategyEditor: string;
  strategyEffect: string;
  strategyConfidence: number;
}

/** 所有指标的完整上下文 */
export const METRIC_CONTEXTS: Record<string, MetricContext> = {
  uv_open_rate: {
    key: 'uv_open_rate', title: 'UV 打开率', changePct: -12.8, isAnomaly: true,
    attributionTitle: '全量 Push UV 打开率下降 12.8% 归因分析',
    attributionDesc: '全量 Push UV 打开率从基线 3.90% 降至 3.40%（-12.8%，-2.4σ）',
    lockedDim: '全量 × Android × 小米 × 广东省',
    funnelIssue: '打开率 ↓12.8%（内容质量问题）',
    rootCause: '广东省小米用户对近期全量 Push 内容兴趣度显著下降，标题点击率降低',
    confidence: 65,
    candidateCauses: [
      '广东省小米用户对近期全量 Push 内容兴趣度显著下降，标题点击率降低导致整体打开率下滑',
      '广东地区昨日暴雨导致用户户外活动减少，Push 打开意愿降低',
      '个性化推荐算法在广东小米用户群上的冷启动效果不佳',
    ],
    strategyProblemDesc: '广东小米用户群的 Push 内容匹配度不足，UV 打开率较基线下降 12.8%。',
    strategySuggestion: '优化广东小米用户群的内容匹配算法；增发本地民生/天气类高打开率内容；将推送时段调整为 17:00-19:00 用户活跃高峰。',
    strategyReference: '近期广东高打开率内容：天气预警（2.1%）、交通管制（1.9%）、本地民生（1.7%）。17:00-19:00 时段历史打开率高于均值 15%。',
    strategyEditor: '张三（广东省早班编辑）',
    strategyEffect: '+1,200 首启 UV',
    strategyConfidence: 65,
  },

  arrive_rate: {
    key: 'arrive_rate', title: '到达率', changePct: -37.1, isAnomaly: true,
    attributionTitle: '本地实时 Push 到达率骤降 37% 归因分析',
    attributionDesc: '本地实时 Push 到达率从基线 35% 骤降至 22%（-37.1%，-2.8σ）',
    lockedDim: '本地实时 × Android × 小米 × 广东省',
    funnelIssue: '到达率 ↓37%（厂商通道问题）',
    rootCause: '小米厂商通道广东地区出现短暂推送异常',
    confidence: 65,
    candidateCauses: [
      '小米厂商通道广东地区出现短暂推送异常，导致到达率骤降',
      '广东暴雨导致用户关机/断网，影响 Push 到达',
      '厂商推送配额临时调整',
    ],
    strategyProblemDesc: '小米·广东本地实时 Push 到达率从 35% 骤降至 22%，预计损失首启用户约 2,300。',
    strategySuggestion: '联系小米技术支持排查广东地区通道异常，必要时切换备用通道；增发广东本地 Push 补偿首启缺口。',
    strategyReference: '同期 OPPO 广东到达率无变化（34.5%），排除全局因素。小米其他省份到达率正常。',
    strategyEditor: '张三（广东省早班编辑）',
    strategyEffect: '+2,300 首启 UV',
    strategyConfidence: 65,
  },

  first_open_uv: {
    key: 'first_open_uv', title: '首启 UV', changePct: -6.4, isAnomaly: true,
    attributionTitle: '全量 Push 首启 UV 下降 6.4% 归因分析',
    attributionDesc: '全量 Push 首启 UV 从基线 15.7 万降至 14.7 万（-6.4%，-1.9σ）',
    lockedDim: '全量 × 华为 × 江苏省',
    funnelIssue: '首启率 ↓6.4%（SDK 版本问题）',
    rootCause: '华为推送 SDK 版本更新导致部分机型到达率下降，进而影响首启 UV',
    confidence: 78,
    candidateCauses: [
      '华为推送 SDK v3.3.0 存在兼容性问题，导致部分机型到达率下降',
      '江苏省华为用户近期系统更新比例偏高',
      '竞品在江苏华为用户群的 Push 频次增加',
    ],
    strategyProblemDesc: '华为·江苏首启 UV 下降 6.4%，根因定位为华为推送 SDK 版本更新导致到达率下降。',
    strategySuggestion: '紧急联系华为技术支持，回滚推送 SDK 版本至稳定版 v3.2.1；对受影响机型启用备用通道过渡。',
    strategyReference: '华为 SDK v3.3.0 存在已知兼容性问题，v3.2.1 已稳定运行 6 个月。SDK 版本回滚历史成功率 95%。',
    strategyEditor: '王五（江苏省编辑）',
    strategyEffect: '+1,800 首启 UV',
    strategyConfidence: 78,
  },

  send_uv: {
    key: 'send_uv', title: '发送量', changePct: -2.8, isAnomaly: false,
    attributionTitle: '发送量正常波动分析',
    attributionDesc: '发送量 ↓2.8%，在正常范围内（< 1.5σ）',
    lockedDim: '全量',
    funnelIssue: '发送量 ↓2.8%（正常波动）',
    rootCause: '发送量在正常波动范围内，无异常',
    confidence: 90,
    candidateCauses: ['日常波动'],
    strategyProblemDesc: '发送量正常，无策略建议',
    strategySuggestion: '无需处理',
    strategyReference: '',
    strategyEditor: '',
    strategyEffect: '',
    strategyConfidence: 0,
  },

  pv_open_rate: {
    key: 'pv_open_rate', title: 'PV 打开率', changePct: -6.8, isAnomaly: false,
    attributionTitle: 'PV 打开率波动分析',
    attributionDesc: 'PV 打开率 ↓6.8%，可能与重复推送疲劳有关',
    lockedDim: '全量 × iOS × 广东省',
    funnelIssue: 'PV 打开率 ↓6.8%（重复推送疲劳）',
    rootCause: '部分用户被重复推送相同内容，导致 PV 打开率下降',
    confidence: 58,
    candidateCauses: ['重复推送疲劳', '推送频次过高'],
    strategyProblemDesc: '部分用户被重复推送相同内容，PV 打开率下降但 UV 影响较小。',
    strategySuggestion: '优化去重策略减少重复推送；增加内容多样性。',
    strategyReference: '',
    strategyEditor: '赵六',
    strategyEffect: '预估恢复 PV 打开率 3-5%',
    strategyConfidence: 55,
  },

  show_uv: {
    key: 'show_uv', title: '展示人数', changePct: -1.8, isAnomaly: false,
    attributionTitle: '展示人数正常波动分析',
    attributionDesc: '展示人数 ↓1.8%，在正常范围内',
    lockedDim: '全量',
    funnelIssue: '展示人数 ↓1.8%（正常波动）',
    rootCause: '展示量波动在正常范围内，与发送量降幅一致',
    confidence: 85,
    candidateCauses: ['正常波动'],
    strategyProblemDesc: '展示量正常，无需处理',
    strategySuggestion: '无需处理',
    strategyReference: '',
    strategyEditor: '',
    strategyEffect: '',
    strategyConfidence: 0,
  },

  avg_show: {
    key: 'avg_show', title: '人均展示次数', changePct: -3.4, isAnomaly: true,
    attributionTitle: '人均展示次数下降分析',
    attributionDesc: '人均展示次数从 9.65 降至 9.32（-3.4%）',
    lockedDim: '个性化实时 × OPPO × Android',
    funnelIssue: '人均展示次数 ↓3.4%（厂商策略调整）',
    rootCause: 'OPPO 厂商可能调整了展示频次策略',
    confidence: 55,
    candidateCauses: ['OPPO 厂商调整展示频次上限', '用户主动关闭通知权限'],
    strategyProblemDesc: 'OPPO 个性化实时人均展示次数下降 10.8%，可能为厂商展示策略调整。',
    strategySuggestion: '检查 OPPO 厂商展示策略配置，将展示频次上限从 3次/天 调整为 5次/天。',
    strategyReference: '竞品在同机型上展示频次为 5-8 次/天，当前配置偏保守。',
    strategyEditor: '赵六（OPPO 通道负责人）',
    strategyEffect: '+600 展示 UV',
    strategyConfidence: 55,
  },
};

/** 根据 metric key 获取上下文 */
export function getMetricContext(key?: string | null): MetricContext {
  if (key && METRIC_CONTEXTS[key]) return METRIC_CONTEXTS[key];
  // 默认返回 UV 打开率
  return METRIC_CONTEXTS.uv_open_rate;
}
