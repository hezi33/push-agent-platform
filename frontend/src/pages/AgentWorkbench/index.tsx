import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card, Tag, Space, Typography, Button, Progress, Input, Collapse, Row, Col, message,
} from 'antd';
import {
  RobotOutlined, UserOutlined, SearchOutlined, ThunderboltOutlined,
  CheckCircleOutlined, SyncOutlined, ArrowLeftOutlined, SendOutlined,
  CodeOutlined, ExclamationCircleOutlined, QuestionCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { ToolCallLog, PipelineAgent } from '../../mocks/data/agentWorkbench';
import { mockToolCallLogs, mockPipelineAgents } from '../../mocks/data/agentWorkbench';
import { useWorkbenchStore } from '../../stores/workbench';
import { mockKPICards, mockAlertList } from '../../mocks/data/dashboard';

const { Text, Title } = Typography;

// ── 类型 ──
interface ChatMessage {
  id: string; role: 'agent' | 'user' | 'system'; content: string; time: string;
  type?: 'text' | 'alert_card' | 'result_card' | 'streaming_card' | 'correction_card' | 'clarify_card';
  alertInfo?: { level: string; metric: string; dim: string; loss: number };
  resultSummary?: { lockedDim: string; funnelIssue: string; rootCause: string; confidence: number; suggestion: string; metricKey: string; isAnomaly: boolean };
  thinkLogs?: ToolCallLog[];
  pipeline?: PipelineAgent[];
  isStreaming?: boolean;
  correctionActions?: { label: string; question: string }[];
  /** 反问选项 */
  clarifyOptions?: { label: string; question: string }[];
}

const SUGGESTED_QUESTIONS = [
  '为什么今天 UV 打开率减少了 12.8%？',
  '帮我分析最近一条严重告警',
  '广东省小米用户的到达率为什么下降了？',
];

// ── 指标注册表（对接 Mock 数据）─
// 这样做的好处：不死数据，如果 Mock 数据变了，Agent 的回答自动跟着变
interface MetricInfo {
  key: string;          // 数据 key（对应 mockKPICard.metricKey）
  labels: string[];     // 用户可能的叫法
  isAnomaly: boolean;   // 是否有实际异常（正常波动=false）
  analysisTemplate: { lockedDim: string; funnelIssue: string; rootCause: string; confidence: number; suggestion: string };
}

const METRIC_REGISTRY: MetricInfo[] = [
  { key: 'uv_open_rate', labels: ['uv打开率', 'uv 打开率', 'uv 打开', '打开率'], isAnomaly: true, analysisTemplate: { lockedDim: '全量 × Android × 小米 × 广东省', funnelIssue: '打开率 ↓12.8%（内容质量问题）', rootCause: '广东省小米用户对近期全量 Push 内容兴趣度显著下降', confidence: 65, suggestion: '优化广东小米用户群的内容匹配算法；增发本地民生/天气类高打开率内容' } },
  { key: 'pv_open_rate', labels: ['pv打开率', 'pv 打开率', 'pv 打开'], isAnomaly: false, analysisTemplate: { lockedDim: '全量 × iOS × 广东省', funnelIssue: 'PV 打开率 ↓6.8%（重复推送疲劳）', rootCause: '部分用户被重复推送相同内容，导致 PV 打开率下降但 UV 打开率影响较小', confidence: 58, suggestion: '优化去重策略减少重复推送；增加内容多样性提高单用户多次打开意愿' } },
  { key: 'arrive_rate', labels: ['到达率'], isAnomaly: true, analysisTemplate: { lockedDim: '本地实时 × Android × 小米 × 广东省', funnelIssue: '到达率 ↓37%（厂商通道问题）', rootCause: '小米厂商通道广东地区出现短暂推送异常', confidence: 65, suggestion: '联系小米排查广东通道异常；增发广东本地 Push 补偿首启缺口' } },
  { key: 'first_open_uv', labels: ['首启uv', '首启 uv', '首启'], isAnomaly: true, analysisTemplate: { lockedDim: '全量 × 华为 × 江苏省', funnelIssue: '首启率 ↓6.4%（SDK 问题）', rootCause: '华为推送 SDK 版本更新导致部分机型到达率下降', confidence: 78, suggestion: '联系华为回滚 SDK 版本；对受影响机型启用备用通道' } },
  { key: 'send_uv', labels: ['发送量', '发送uv', '发送 uv'], isAnomaly: false, analysisTemplate: { lockedDim: '全量', funnelIssue: '发送量 ↓2.8%（正常波动）', rootCause: '发送量在正常波动范围内（< 1.5σ），无异常', confidence: 90, suggestion: '发送量正常，无需特殊处理。如需深入了解特定维度的发送变化，请指定厂商或省份。' } },
  { key: 'show_uv', labels: ['展示人数', '展示uv', '展示 uv', '展示量'], isAnomaly: false, analysisTemplate: { lockedDim: '全量', funnelIssue: '展示人数 ↓1.8%（正常波动）', rootCause: '展示量波动在正常范围内，与发送量降幅一致', confidence: 85, suggestion: '展示量正常。关注到达率变化对展示的影响。' } },
  { key: 'avg_show', labels: ['人均展示', '人均展示次数', '展示次数'], isAnomaly: true, analysisTemplate: { lockedDim: '个性化实时 × OPPO × Android', funnelIssue: '人均展示次数 ↓3.4%（厂商策略调整）', rootCause: 'OPPO 厂商可能调整了展示频次策略', confidence: 55, suggestion: '建议检查 OPPO 厂商展示策略配置，关注展示频次上限设置。置信度较低，建议人工确认。' } },
];

const UP_KEYWORDS = ['上升', '上涨', '增加', '提高', '提升', '增长', '高了', '变好', '改善', '升了'];
const DOWN_KEYWORDS = ['下降', '下跌', '减少', '降低', '下滑', '低了', '变差', '恶化', '降了'];
const PUSH_SCOPE = ['推送', 'push', '打开率', '到达率', '首启', '展示', '发送', '告警', '异常', '指标', '分析', '归因', '策略', '厂商', '省份', '小米', '华为', 'oppo', 'vivo', '三星', 'uv', 'pv', '漏斗', '转化', '优化', '广东', '浙江', '江苏', '北京', '下降', '减少', '降低', '为什么', '怎么', '帮我', '实时', '量'];

type QuestionResult =
  | { type: 'irrelevant' }
  | { type: 'clarify'; content: string; options: { label: string; question: string }[] }
  | { type: 'correction'; metricName: string; actualDirection: string; correctionQuestion: string }
  | { type: 'analysis'; metricKey: string; metricName: string; currentValue: number; baselineValue: number; changePct: number; sigma: number; lockedDim: string; funnelIssue: string; rootCause: string; confidence: number; suggestion: string; isAnomaly: boolean };

/** 从 Mock 数据中查找指标的当前值和变化 */
function findMetricData(key: string): { current: number; baseline: number; changePct: number; title: string } | null {
  const card = mockKPICards.find((c) => c.metricKey === key);
  if (!card) return null;
  return {
    current: card.currentValue,
    baseline: card.yesterdayValue,
    changePct: card.changePct,
    title: card.title,
  };
}

function parseQuestion(q: string): QuestionResult {
  const l = q.toLowerCase().trim();

  // 完全不相关的 → 拒绝
  if (!PUSH_SCOPE.some((kw) => l.includes(kw)) && l.length > 0) return { type: 'irrelevant' };

  const userSaysUp = UP_KEYWORDS.some((kw) => l.includes(kw));
  const userSaysDown = DOWN_KEYWORDS.some((kw) => l.includes(kw));

  // 找到用户提到的指标
  let matchedMetric: MetricInfo | null = null;
  for (const m of METRIC_REGISTRY) {
    if (m.labels.some((lb) => l.includes(lb))) {
      matchedMetric = m;
      break;
    }
  }

  // ── 情况 1：用户只说了模糊关键词（如 "uv", "pv"）但没有完整指标名 ──
  if (!matchedMetric) {
    // 检测是否只有模糊缩写
    const isUV = l === 'uv' || l === 'uv？' || l === 'uv?' || l === 'uv呢' || l === 'uv怎么样' || l.startsWith('uv') && l.length <= 4;
    const isPV = l === 'pv' || l === 'pv？' || l === 'pv?' || l === 'pv呢' || l.startsWith('pv') && l.length <= 4;

    if (isUV || isPV) {
      const prefix = isUV ? 'UV' : 'PV';
      const metrics = METRIC_REGISTRY.filter((m) => m.key.includes(prefix.toLowerCase()));
      const options = metrics.map((m) => {
        const data = findMetricData(m.key);
        const dir = data && data.changePct < 0 ? `↓${Math.abs(data.changePct).toFixed(1)}%` : '';
        return {
          label: `${data?.title || m.labels[0]} ${dir}`,
          question: `帮我分析${m.labels[0]}为什么${data && data.changePct < 0 ? '下降' : '变化'}了`,
        };
      });
      return {
        type: 'clarify',
        content: `你提到了「${prefix}」，平台有以下 ${prefix} 相关指标，你想分析哪一个？`,
        options,
      };
    }

    // 其他模糊提问（包含方向但没有指标）
    if (userSaysUp || userSaysDown) {
      const dir = userSaysUp ? '上升' : '下降';
      // 找出所有有异常的指标
      const anomalyMetrics = mockKPICards.filter((c) => c.anomaly || Math.abs(c.changePct) > 3);
      const options = anomalyMetrics.map((c) => ({
        label: `${c.title} ${c.changePct < 0 ? '↓' : '↑'}${Math.abs(c.changePct).toFixed(1)}%`,
        question: `帮我分析${c.title}为什么${dir}了`,
      }));
      if (options.length > 0) {
        return {
          type: 'clarify',
          content: `目前平台有 ${options.length} 个指标出现波动，你想分析哪一个？`,
          options: options.slice(0, 4),
        };
      }
    }

    // 完全没有可匹配的
    return { type: 'irrelevant' };
  }

  // ── 情况 2：匹配到指标 ──
  const data = findMetricData(matchedMetric.key);
  if (!data) return { type: 'irrelevant' };

  const actualDown = data.changePct < -1;
  const actualUp = data.changePct > 1;
  const actualFlat = !actualDown && !actualUp;

  // 方向说反了 → 纠错
  if (userSaysUp && actualDown) {
    return {
      type: 'correction',
      metricName: data.title,
      actualDirection: `下降了 ${Math.abs(data.changePct).toFixed(1)}%`,
      correctionQuestion: `帮我分析${data.title}为什么下降了 ${Math.abs(data.changePct).toFixed(1)}%`,
    };
  }
  if (userSaysDown && actualUp) {
    return {
      type: 'correction',
      metricName: data.title,
      actualDirection: `上升了 ${data.changePct.toFixed(1)}%`,
      correctionQuestion: `帮我分析${data.title}为什么上升了 ${data.changePct.toFixed(1)}%`,
    };
  }

  // 说平了但实际上有波动
  if (!userSaysUp && !userSaysDown && actualDown) {
    // 用户只是问了指标名，没有说方向 → 主动告知趋势
    return {
      type: 'correction',
      metricName: data.title,
      actualDirection: `目前是下降了 ${Math.abs(data.changePct).toFixed(1)}%`,
      correctionQuestion: `帮我分析${data.title}为什么下降了 ${Math.abs(data.changePct).toFixed(1)}%`,
    };
  }

  // ── 情况 3：方向正确 → 启动分析 ──
  const tpl = matchedMetric.analysisTemplate;
  return {
    type: 'analysis',
    metricKey: matchedMetric.key,
    metricName: data.title,
    currentValue: data.current,
    baselineValue: data.baseline,
    changePct: data.changePct,
    sigma: Math.abs(data.changePct) > 10 ? 2.4 : Math.abs(data.changePct) > 5 ? 1.8 : 1.2,
    lockedDim: tpl.lockedDim,
    funnelIssue: tpl.funnelIssue,
    rootCause: tpl.rootCause,
    confidence: tpl.confidence,
    suggestion: tpl.suggestion,
    isAnomaly: matchedMetric.isAnomaly,
  };
}

// ============================================================
export default function AgentWorkbench() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const incomingAlertId = searchParams.get('alertId');
  const store = useWorkbenchStore();

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (store.messages.length > 0) return store.messages;
    if (!incomingAlertId) return [];
    return [{
      id: 'sys-1', role: 'system', time: now(), content: '监控 Agent 检测到异常告警，已自动启动分析管道',
    }, {
      id: 'agent-0', role: 'agent', time: now(),
      content: '我发现了一条**严重告警**，需要我帮你分析吗？',
      type: 'alert_card',
      alertInfo: { level: 'S05', metric: '本地实时 Push 到达率', dim: 'Android · 小米 · 广东省', loss: 2300 },
    }];
  });
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  // 当前正在运行的日志（用于实时显示）
  const [liveLogs, setLiveLogs] = useState<ToolCallLog[]>([]);
  const [pipeline, setPipeline] = useState<PipelineAgent[]>(() => {
    const hasLogs = incomingAlertId || store.visibleLogs.length > 0;
    return hasLogs
      ? mockPipelineAgents.map((a) => ({ ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount }))
      : mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 }));
  });
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 持久化
  useEffect(() => { store.setMessages(messages); store.setPipeline(pipeline); }, [messages, pipeline]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, liveLogs]);

  const runAnalysis = useCallback((question: string) => {
    const result = parseQuestion(question);
    const userMsg: ChatMessage = { id: 'user-' + Date.now(), role: 'user', time: now(), content: question };
    setInput('');

    // 不相关 → 友好拒绝
    if (result.type === 'irrelevant') {
      setMessages((prev) => [...prev, userMsg, {
        id: 'agent-' + Date.now(), role: 'agent', time: now(),
        content: '抱歉，我是 Push 推送业务分析专用 Agent。我能帮你分析推送到达率、UV 打开率、首启 UV 等指标异常的原因。例如：「UV 打开率为什么下降了？」「帮我分析最近一条告警」。',
        type: 'text',
      }]);
      return;
    }

    // ✅ 模糊提问 → 反问具体要什么
    if (result.type === 'clarify') {
      setMessages((prev) => [...prev, userMsg, {
        id: 'agent-' + Date.now(), role: 'agent', time: now(),
        content: result.content,
        type: 'clarify_card',
        clarifyOptions: result.options,
      }]);
      return;
    }

    // ✅ 方向说反了 → 纠错，让用户确认后再分析
    if (result.type === 'correction') {
      setMessages((prev) => [...prev, userMsg, {
        id: 'agent-' + Date.now(), role: 'agent', time: now(),
        content: `根据最新数据，**${result.metricName}** 实际上是 **${result.actualDirection}**，与你描述的方向相反。需要我帮你分析**下降**的原因吗？`,
        type: 'correction_card',
        correctionActions: [
          { label: `✅ 分析${result.metricName}下降原因`, question: result.correctionQuestion },
          { label: '🔍 先看看具体数据', question: `帮我看看${result.metricName}的详细数据` },
        ],
      }]);
      return;
    }

    // ✅ 方向正确 → 启动分析管道
    const ctx = result;
    const msgId = 'result-' + Date.now();
    const streamingId = 'streaming-' + Date.now();

    setMessages((prev) => [...prev, userMsg]);
    setAnalyzing(true);
    setLiveLogs([]);
    setPipeline(mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 })));

    setMessages((prev) => [...prev, {
      id: streamingId, role: 'agent', time: now(),
      content: '正在分析...', type: 'streaming_card',
      thinkLogs: [], pipeline: mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 })),
    }]);

    const runLogs: ToolCallLog[] = [];
    let logIdx = 0;
    const tickLog = () => {
      if (logIdx >= mockToolCallLogs.length) {
        const finalPipeline = mockPipelineAgents.map((a) => ({ ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount }));
        setPipeline(finalPipeline);
        setTimeout(() => {
          setAnalyzing(false);
          // ✅ 替换 streaming_card 为 result_card（思考折叠态）
          setMessages((prev) => prev.map((m) => m.id === streamingId ? {
            id: msgId, role: 'agent', time: now(),
            content: ctx.isAnomaly
              ? `分析完成。根因锁定为**${ctx.rootCause}**（置信度 ${ctx.confidence}%）。`
              : `分析完成。**${ctx.metricName}**当前波动在正常范围内（置信度 ${ctx.confidence}%），无需特殊处理。`,
            type: 'result_card',
            resultSummary: { lockedDim: ctx.lockedDim, funnelIssue: ctx.funnelIssue, rootCause: ctx.rootCause, confidence: ctx.confidence, suggestion: ctx.suggestion, metricKey: ctx.metricKey, isAnomaly: ctx.isAnomaly },
            thinkLogs: [...runLogs],
          } : m));
        }, 400);
        return;
      }
      const log = { ...mockToolCallLogs[logIdx] };
      runLogs.push(log);
      setLiveLogs([...runLogs]);

      const curPipeline = mockPipelineAgents.map((a) => {
        if (a.key === log.agent) {
          const dc = runLogs.filter((l) => l.agent === a.key).length;
          return { ...a, status: 'running' as const, progress: Math.round((dc / a.toolCount) * 100), currentTool: log.toolLabel, doneCount: dc };
        }
        if (a.key === 'attribution' && log.agent === 'strategy') return { ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount };
        if (a.key === 'strategy' && log.agent !== 'strategy') return { ...a, status: 'waiting' as const, currentTool: '等待上游完成' };
        return a;
      });
      setPipeline(curPipeline);

      // ✅ 实时更新 streaming_card 的日志和管道
      setMessages((prev) => prev.map((m) => m.id === streamingId ? { ...m, thinkLogs: [...runLogs], pipeline: curPipeline } : m));

      logIdx++;
      setTimeout(tickLog, log.isKey ? 800 : 250 + Math.random() * 250);
    };
    setTimeout(() => tickLog(), 500);
  }, []);

  const handleSend = () => { if (input.trim() && !analyzing) runAnalysis(input.trim()); };
  const pipelineDone = pipeline.every((a) => a.status === 'done');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 48px)' }}>
      {/* 顶部 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>返回看板</Button>
            <RobotOutlined style={{ color: '#165DFF', fontSize: 18 }} />
            <Title level={4} style={{ margin: 0 }}>Agent 工作台</Title>
            {analyzing && <Tag icon={<SyncOutlined spin />} color="processing">分析中</Tag>}
            {!analyzing && pipelineDone && messages.length > 0 && <Tag icon={<CheckCircleOutlined />} color="success">就绪</Tag>}
          </Space>
        </Col>
      </Row>

      {/* 管道条 */}
      {(analyzing || pipelineDone) && (
        <div style={{ padding: '6px 16px', borderRadius: 8, marginBottom: 12, background: analyzing ? '#FFF7E6' : '#F6FFED', border: `1px solid ${analyzing ? '#FFD591' : '#B7EB8F'}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {pipeline.map((a, i) => {
            const cfg: Record<string, { e: string; c: string }> = { idle: { e: '⏳', c: '#C9CDD4' }, running: { e: '🔄', c: '#165DFF' }, waiting: { e: '⏸️', c: '#FF7D00' }, done: { e: '✅', c: '#00B42A' }, error: { e: '❌', c: '#F53F3F' } };
            const c = cfg[a.status] || cfg.idle;
            return (
              <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                <span>{a.icon}</span>
                <Text strong style={{ fontSize: 11, color: c.c, whiteSpace: 'nowrap' }}>{a.label}</Text><span>{c.e}</span>
                {a.status === 'running' && <Progress percent={a.progress} size="small" style={{ flex: 1, minWidth: 30, margin: 0 }} showInfo={false} />}
                {i < pipeline.length - 1 && <Text type="secondary">→</Text>}
              </div>
            );
          })}
          {pipelineDone && <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto' }}>耗时 57.9s</Text>}
        </div>
      )}

      {/* 对话区 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 4px', minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <RobotOutlined style={{ fontSize: 48, color: '#C9CDD4', marginBottom: 16 }} />
            <Title level={4} type="secondary">Push Agent 分析工作台</Title>
            <Text type="secondary">输入分析问题，或从下方快捷提问开始</Text>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} navigate={navigate} onAnalyze={runAnalysis} isAnalyzing={analyzing} />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* 快捷提问 */}
      {!analyzing && messages.length === 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, marginBottom: 6, display: 'block' }}>💡 快捷提问：</Text>
          <Space size={8} wrap>
            {SUGGESTED_QUESTIONS.map((q) => (
              <Tag key={q} style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }} color="blue" onClick={() => runAnalysis(q)}>{q}</Tag>
            ))}
          </Space>
        </div>
      )}

      {analyzing && <div style={{ textAlign: 'center', marginBottom: 8 }}><Text type="secondary"><LoadingOutlined /> Agent 正在分析...</Text></div>}

      {/* 输入栏 */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 0 0', borderTop: '1px solid #E5E6EB' }}>
        <Input
          placeholder={analyzing ? 'Agent 分析中，请稍候...' : '输入分析问题...'}
          value={input} onChange={(e) => setInput(e.target.value)} onPressEnter={handleSend}
          disabled={analyzing} style={{ flex: 1 }}
          prefix={<QuestionCircleOutlined style={{ color: '#C9CDD4' }} />}
          suffix={<Button type="primary" size="small" icon={<SendOutlined />} onClick={handleSend} disabled={!input.trim() || analyzing}>发送</Button>}
        />
      </div>
    </div>
  );
}

// ── 时间工具 ──
function now() { return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }); }

// ============================================================
// 对话气泡
// ============================================================
function ChatBubble({ msg, navigate, onAnalyze, isAnalyzing }: {
  msg: ChatMessage; navigate: ReturnType<typeof useNavigate>; onAnalyze: (q: string) => void; isAnalyzing: boolean;
}) {
  // streaming_card 默认展开，result_card 默认折叠
  const isStreaming = msg.type === 'streaming_card';
  const [thinkOpen, setThinkOpen] = useState(isStreaming);
  // 当 streaming_card 更新时保持展开
  useEffect(() => { if (isStreaming) setThinkOpen(true); }, [isStreaming, (msg.thinkLogs || []).length]);

  const isAgent = msg.role === 'agent';
  const todayMark = new Date().toISOString().slice(0, 10).replace(/-/g, '');

  if (msg.role === 'system') return <div style={{ textAlign: 'center', margin: '10px 0' }}><Tag color="blue" style={{ fontSize: 11 }}>{msg.content}</Tag></div>;

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexDirection: isAgent ? 'row' : 'row-reverse' }}>
      <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: isAgent ? '#E8F2FF' : '#F0F5FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isAgent ? <RobotOutlined style={{ color: '#165DFF', fontSize: 15 }} /> : <UserOutlined style={{ color: '#4E5969', fontSize: 15 }} />}
      </div>
      <div style={{ maxWidth: '80%', minWidth: 200 }}>
        <div style={{ marginBottom: 2 }}>
          <Text strong style={{ fontSize: 12 }}>{isAgent ? 'Agent' : '我'}</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{msg.time}</Text>
          {msg.isStreaming && <LoadingOutlined style={{ marginLeft: 8, color: '#165DFF' }} />}
        </div>

        {/* 告警卡片 */}
        {msg.type === 'alert_card' && msg.alertInfo && (
          <Card size="small" style={{ borderLeft: '3px solid #F53F3F', borderRadius: 8, marginTop: 4, background: '#FFF7F5' }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space><Tag color="error">严重告警</Tag><Text strong style={{ fontSize: 13 }}>{msg.alertInfo.metric}</Text></Space>
              <Text style={{ fontSize: 12, color: '#4E5969' }}>影响：{msg.alertInfo.dim} · 预计损失 ~{msg.alertInfo.loss.toLocaleString()} 首启</Text>
              <Space size={8}>
                <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => navigate(`/anomaly/ALT-${todayMark}-001?from=workbench`)}>查看异常详情</Button>
                <Button size="small" type="primary" ghost onClick={() => onAnalyze('帮我分析这条告警：' + msg.alertInfo!.metric)}>分析此异常</Button>
              </Space>
            </Space>
          </Card>
        )}

        {/* 结果卡片 — 含内嵌思考过程 */}
        {msg.type === 'result_card' && msg.resultSummary && (
          <Card size="small" style={{ borderLeft: '3px solid #165DFF', borderRadius: 8, marginTop: 4 }}>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              <Space><Tag color="success" icon={<CheckCircleOutlined />}>分析完成</Tag><Text type="secondary" style={{ fontSize: 11 }}>总耗时 57.9s</Text></Space>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
                <div><Text type="secondary">🎯 锁定:</Text> <Text strong>{msg.resultSummary.lockedDim}</Text></div>
                <div><Text type="secondary">🔗 环节:</Text> <Tag color="error" style={{ fontSize: 11 }}>{msg.resultSummary.funnelIssue}</Tag></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Text type="secondary">🧠 根因:</Text> <Text>{msg.resultSummary.rootCause}</Text>
                  <Progress percent={msg.resultSummary.confidence} strokeColor="#F7BA1E" size="small" style={{ width: 90, display: 'inline-block', marginLeft: 8 }} />
                  <Text style={{ fontSize: 11, color: '#F7BA1E' }}> {msg.resultSummary.confidence}%</Text>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Text type="secondary">💡 建议:</Text> <Text style={{ fontSize: 12 }}>{msg.resultSummary.suggestion}</Text>
                </div>
              </div>

              {/* 👈 思考过程内嵌在结果卡片里 */}
              {msg.thinkLogs && msg.thinkLogs.length > 0 && (
                <Collapse
                  activeKey={thinkOpen ? ['think'] : []}
                  onChange={(keys) => setThinkOpen(keys.includes('think'))}
                  size="small"
                  ghost
                  style={{ marginTop: 4, background: '#FAFBFC', borderRadius: 6 }}
                  items={[{
                    key: 'think',
                    label: (
                      <Space size={4}>
                        <CodeOutlined style={{ fontSize: 11, color: '#86909C' }} />
                        <Text style={{ fontSize: 11, color: '#86909C' }}>Agent 思考过程（{msg.thinkLogs.length} 步 · {msg.thinkLogs.filter((l) => l.isKey).length} 个关键步骤）</Text>
                      </Space>
                    ),
                    children: <ThinkLogInline logs={msg.thinkLogs} />,
                  }]}
                />
              )}

              {/* 只有真正异常的指标才显示详情按钮 */}
              {msg.resultSummary.isAnomaly && (
                <Space size={8} style={{ marginTop: 4 }}>
                  <Button type="primary" size="small" icon={<SearchOutlined />}
                    onClick={() => navigate(`/attribution/ATTR-${todayMark}-002?from=workbench&metric=${msg.resultSummary?.metricKey || ''}`)}>
                    查看完整归因报告
                  </Button>
                  <Button size="small" icon={<ThunderboltOutlined />}
                    onClick={() => navigate(`/strategy/SUG-${todayMark}-001?from=workbench&metric=${msg.resultSummary?.metricKey || ''}`)}>
                    查看策略建议
                  </Button>
                </Space>
              )}
              {!msg.resultSummary.isAnomaly && (
                <Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  ✅ 该指标在正常波动范围内，无需归因和策略建议
                </Text>
              )}
            </Space>
          </Card>
        )}

        {/* 分析中卡片（streaming_card）— 思考自动展开 */}
        {msg.type === 'streaming_card' && (
          <Card size="small" style={{ borderLeft: '3px solid #165DFF', borderRadius: 8, marginTop: 4, background: '#FAFBFC' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space>
                <Tag icon={<SyncOutlined spin />} color="processing">分析中</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>Agent 正在调用工具分析数据...</Text>
              </Space>

              {/* 管道 */}
              {msg.pipeline && (
                <div style={{ display: 'flex', gap: 6, fontSize: 11, flexWrap: 'wrap' }}>
                  {msg.pipeline.map((a, i) => {
                    const s: Record<string, string> = { idle: '⏳', running: '🔄', waiting: '⏸️', done: '✅' };
                    return (
                      <span key={a.key}>
                        {a.icon} {a.label} {s[a.status] || '⏳'}
                        {a.status === 'running' && <Progress percent={a.progress} size="small" style={{ width: 40, margin: '0 4px', display: 'inline-block' }} showInfo={false} />}
                        {i < msg.pipeline!.length - 1 && ' → '}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* 思考日志 — streaming 时强制展开 */}
              {msg.thinkLogs && msg.thinkLogs.length > 0 && (
                <Collapse
                  activeKey={thinkOpen ? ['think'] : []}
                  onChange={(keys) => setThinkOpen(keys.includes('think'))}
                  size="small" ghost
                  style={{ background: '#FAFBFC', borderRadius: 6 }}
                  items={[{
                    key: 'think',
                    label: (
                      <Space size={4}>
                        <CodeOutlined style={{ fontSize: 11, color: '#165DFF' }} />
                        <Text style={{ fontSize: 11, color: '#165DFF' }}>
                          <SyncOutlined spin style={{ marginRight: 4 }} />
                          Agent 思考中...（{msg.thinkLogs.length} 步）
                        </Text>
                      </Space>
                    ),
                    children: <ThinkLogInline logs={msg.thinkLogs} />,
                  }]}
                />
              )}
            </Space>
          </Card>
        )}

        {/* 反问卡片 — 模糊提问时追问具体要什么 */}
        {msg.type === 'clarify_card' && (
          <Card size="small" style={{ borderLeft: '3px solid #165DFF', borderRadius: 8, marginTop: 4, background: '#F0F5FF' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space>
                <Tag color="blue">🤔 追问确认</Tag>
              </Space>
              <Text style={{ fontSize: 13 }}>{msg.content}</Text>
              {msg.clarifyOptions && (
                <Space size={8} wrap>
                  {msg.clarifyOptions.map((opt, i) => (
                    <Button key={i} size="small" type={i === 0 ? 'primary' : 'default'} onClick={() => onAnalyze(opt.question)}>
                      {opt.label}
                    </Button>
                  ))}
                </Space>
              )}
            </Space>
          </Card>
        )}

        {/* 纠错卡片 — 用户说反了方向 */}
        {msg.type === 'correction_card' && (
          <Card size="small" style={{ borderLeft: '3px solid #F7BA1E', borderRadius: 8, marginTop: 4, background: '#FFFBE6' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Tag color="warning">⚠️ 数据纠错</Tag>
              <Text style={{ fontSize: 13 }}>{msg.content}</Text>
              {msg.correctionActions && (
                <Space size={8} wrap>
                  {msg.correctionActions.map((act, i) => (
                    <Button key={i} size="small" type={i === 0 ? 'primary' : 'default'} onClick={() => onAnalyze(act.question)}>
                      {act.label}
                    </Button>
                  ))}
                </Space>
              )}
            </Space>
          </Card>
        )}

        {/* 普通文本 */}
        {msg.type !== 'alert_card' && msg.type !== 'result_card' && msg.type !== 'streaming_card' && msg.type !== 'correction_card' && msg.type !== 'clarify_card' && (
          <div style={{ padding: '10px 14px', borderRadius: 8, marginTop: 4, fontSize: 13, lineHeight: '22px', color: '#1D2129', background: isAgent ? '#F7F8FA' : '#E8F2FF' }}>
            {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 紧凑思考日志（内嵌到结果卡片）
// ============================================================
function ThinkLogInline({ logs }: { logs: ToolCallLog[] }) {
  const ac: Record<string, string> = { monitor: '#165DFF', attribution: '#FF7D00', strategy: '#722ED1' };
  const ai: Record<string, string> = { monitor: '🔍', attribution: '🧠', strategy: '⚡' };
  return (
    <div style={{ maxHeight: 200, overflow: 'auto', fontSize: 10, fontFamily: '"SF Mono", "Menlo", monospace', color: '#4E5969', lineHeight: '18px' }}>
      {logs.map((l) => (
        <div key={l.id} style={{ padding: '2px 0', borderLeft: l.isKey ? `2px solid ${ac[l.agent]}` : '2px solid transparent', paddingLeft: l.isKey ? 6 : 2, marginBottom: l.isKey ? 3 : 1, opacity: l.isKey ? 1 : 0.7 }}>
          <span style={{ color: '#C9CDD4', marginRight: 6 }}>{l.timeDisplay}</span>
          <span style={{ marginRight: 3 }}>{ai[l.agent]}</span>
          <span style={{ color: ac[l.agent], fontWeight: l.isKey ? 600 : 400 }}>{l.toolName}()</span>
          <span style={{ color: '#86909C' }}> → {l.description}</span>
          {l.isKey && <span style={{ color: '#00B42A' }}> ✓</span>}
          <span style={{ color: '#C9CDD4', marginLeft: 4 }}>{l.durationMs}ms</span>
        </div>
      ))}
    </div>
  );
}
