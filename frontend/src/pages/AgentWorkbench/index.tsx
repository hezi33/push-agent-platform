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

const { Text, Title } = Typography;

// ── 类型 ──
interface ChatMessage {
  id: string; role: 'agent' | 'user' | 'system'; content: string; time: string;
  type?: 'text' | 'alert_card' | 'result_card' | 'streaming_card' | 'correction_card';
  alertInfo?: { level: string; metric: string; dim: string; loss: number };
  resultSummary?: { lockedDim: string; funnelIssue: string; rootCause: string; confidence: number; suggestion: string };
  thinkLogs?: ToolCallLog[];
  pipeline?: PipelineAgent[];
  isStreaming?: boolean;
  /** 纠错卡片上的快捷提问 */
  correctionActions?: { label: string; question: string }[];
}

const SUGGESTED_QUESTIONS = [
  '为什么今天 UV 打开率减少了 12.8%？',
  '帮我分析最近一条严重告警',
  '广东省小米用户的到达率为什么下降了？',
];

// Push 业务关键词
const PUSH_KEYWORDS = ['推送', 'push', '打开率', '到达率', '首启', '展示', '发送', '告警', '异常', '指标', '分析', '归因', '策略', '厂商', '省份', '小米', '华为', 'oppo', 'vivo', '三星', 'uv', 'pv', '漏斗', '转化', '优化', '广东', '浙江', '江苏', '北京', '下降', '减少', '降低', '减少', '为什么', '怎么', '帮我', '实时', '量'];
const UP_KEYWORDS = ['上升', '上涨', '增加', '提高', '提升', '增长', '高了', '变好', '改善'];
const DOWN_KEYWORDS = ['下降', '下跌', '减少', '降低', '下滑', '低了', '变差', '恶化'];

type QuestionResult =
  | { type: 'irrelevant' }
  | { type: 'correction'; metricName: string; actualDirection: string; actualChangePct: number; correctionQuestion: string }
  | { type: 'analysis'; metricName: string; currentValue: number; baselineValue: number; changePct: number; sigma: number; lockedDim: string; funnelIssue: string; rootCause: string; confidence: number; suggestion: string };

function parseQuestion(q: string): QuestionResult {
  if (!PUSH_KEYWORDS.some((kw) => q.toLowerCase().includes(kw))) return { type: 'irrelevant' };

  const l = q.toLowerCase();

  // 判断用户说的方向 vs 实际的下降方向
  const userSaysUp = UP_KEYWORDS.some((kw) => l.includes(kw));
  const userSaysDown = DOWN_KEYWORDS.some((kw) => l.includes(kw));

  // 确认指标
  const isOpenRate = l.includes('uv打开率') || l.includes('打开率') || l.includes('uv 打开');
  const isFirstOpen = l.includes('首启');
  const isArriveRate = l.includes('到达率');

  // 实际数据方向（都是下降的）
  if (isOpenRate) {
    if (userSaysUp) {
      return { type: 'correction', metricName: 'UV 打开率', actualDirection: '下降了 12.8%', actualChangePct: -12.8, correctionQuestion: '帮我分析 UV 打开率为什么下降了 12.8%' };
    }
    return { type: 'analysis', metricName: 'UV 打开率', currentValue: 3.40, baselineValue: 3.90, changePct: -12.8, sigma: 2.4, lockedDim: '全量 × Android × 小米 × 广东省', funnelIssue: '打开率 ↓12.8%（内容质量问题）', rootCause: '广东省小米用户对近期全量 Push 内容兴趣度显著下降', confidence: 65, suggestion: '优化广东小米用户群的内容匹配算法；增发本地民生/天气类高打开率内容' };
  }
  if (isFirstOpen) {
    if (userSaysUp) {
      return { type: 'correction', metricName: '首启 UV', actualDirection: '下降了 6.4%', actualChangePct: -6.4, correctionQuestion: '帮我分析首启 UV 为什么下降了 6.4%' };
    }
    return { type: 'analysis', metricName: '首启 UV', currentValue: 147000, baselineValue: 157000, changePct: -6.4, sigma: 1.9, lockedDim: '全量 × 华为 × 江苏省', funnelIssue: '首启率 ↓6.4%（SDK 问题）', rootCause: '华为推送 SDK 版本更新导致部分机型到达率下降', confidence: 78, suggestion: '联系华为回滚 SDK 版本；对受影响机型启用备用通道' };
  }
  if (isArriveRate) {
    if (userSaysUp) {
      return { type: 'correction', metricName: '到达率', actualDirection: '下降了 37.1%', actualChangePct: -37.1, correctionQuestion: '帮我分析到达率为什么骤降了 37%' };
    }
    return { type: 'analysis', metricName: '到达率', currentValue: 22.0, baselineValue: 35.0, changePct: -37.1, sigma: 2.8, lockedDim: '本地实时 × Android × 小米 × 广东省', funnelIssue: '到达率 ↓37%（厂商通道问题）', rootCause: '小米厂商通道广东地区出现短暂推送异常', confidence: 65, suggestion: '联系小米排查广东通道异常；增发广东本地 Push 补偿首启缺口' };
  }

  // 用户提到了方向但没有明确指标 → 追问
  if (userSaysUp || userSaysDown) {
    return { type: 'irrelevant' }; // 会在下文处理为追问
  }

  // 通用分析请求 → 默认到达率
  return { type: 'analysis', metricName: '到达率', currentValue: 22.0, baselineValue: 35.0, changePct: -37.1, sigma: 2.8, lockedDim: '本地实时 × Android × 小米 × 广东省', funnelIssue: '到达率 ↓37%（厂商通道问题）', rootCause: '小米厂商通道广东地区出现短暂推送异常', confidence: 65, suggestion: '联系小米排查广东通道异常；增发广东本地 Push 补偿首启缺口' };
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
        content: '抱歉，我是 Push 推送业务分析专用 Agent。我能帮你分析推送到达率、UV 打开率、首启 UV 等指标异常的原因。请尝试问我与 Push 数据相关的问题，例如：「UV 打开率为什么下降了？」「帮我分析最近一条告警」。',
        type: 'text',
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
            content: `分析完成。根因锁定为**${ctx.rootCause}**（置信度 ${ctx.confidence}%）。`,
            type: 'result_card',
            resultSummary: { lockedDim: ctx.lockedDim, funnelIssue: ctx.funnelIssue, rootCause: ctx.rootCause, confidence: ctx.confidence, suggestion: ctx.suggestion },
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

              <Space size={8} style={{ marginTop: 4 }}>
                <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => navigate(`/attribution/ATTR-${todayMark}-002?from=workbench`)}>查看完整归因报告</Button>
                <Button size="small" icon={<ThunderboltOutlined />} onClick={() => navigate(`/strategy/SUG-${todayMark}-001?from=workbench`)}>查看策略建议</Button>
              </Space>
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
        {msg.type !== 'alert_card' && msg.type !== 'result_card' && msg.type !== 'streaming_card' && msg.type !== 'correction_card' && (
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
