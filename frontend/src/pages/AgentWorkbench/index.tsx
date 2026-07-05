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
  type?: 'text' | 'alert_card' | 'result_card';
  alertInfo?: { level: string; metric: string; dim: string; loss: number };
  resultSummary?: { lockedDim: string; funnelIssue: string; rootCause: string; confidence: number; suggestion: string };
  /** 属于这条消息的思考日志 */
  thinkLogs?: ToolCallLog[];
  isStreaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  '为什么今天 UV 打开率减少了 12.8%？',
  '帮我分析最近一条严重告警',
  '广东省小米用户的到达率为什么下降了？',
];

function parseQuestionContext(q: string) {
  const l = q.toLowerCase();
  if (l.includes('uv打开率') || l.includes('打开率') || l.includes('uv 打开')) {
    return { metricName: 'UV 打开率', currentValue: 3.40, baselineValue: 3.90, changePct: -12.8, sigma: 2.4, lockedDim: '全量 × Android × 小米 × 广东省', funnelIssue: '打开率 ↓12.8%（内容质量问题）', rootCause: '广东省小米用户对近期全量 Push 内容兴趣度显著下降', confidence: 65, suggestion: '优化广东小米用户群的内容匹配算法；增发本地民生/天气类高打开率内容' };
  }
  if (l.includes('首启')) {
    return { metricName: '首启 UV', currentValue: 147000, baselineValue: 157000, changePct: -6.4, sigma: 1.9, lockedDim: '全量 × 华为 × 江苏省', funnelIssue: '首启率 ↓6.4%（SDK 问题）', rootCause: '华为推送 SDK 版本更新导致部分机型到达率下降', confidence: 78, suggestion: '联系华为回滚 SDK 版本；对受影响机型启用备用通道' };
  }
  return { metricName: '到达率', currentValue: 22.0, baselineValue: 35.0, changePct: -37.1, sigma: 2.8, lockedDim: '本地实时 × Android × 小米 × 广东省', funnelIssue: '到达率 ↓37%（厂商通道问题）', rootCause: '小米厂商通道广东地区出现短暂推送异常', confidence: 65, suggestion: '联系小米排查广东通道异常；增发广东本地 Push 补偿首启缺口' };
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
    const ctx = parseQuestionContext(question);
    const msgId = 'result-' + Date.now();

    setMessages((prev) => [...prev, { id: 'user-' + Date.now(), role: 'user', time: now(), content: question }]);
    setInput('');
    setAnalyzing(true);
    setLiveLogs([]);
    setPipeline(mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 })));

    // 先插入一个 thinking 消息（稍后被替换为 result）
    const thinkingId = 'thinking-' + Date.now();
    setMessages((prev) => [...prev, { id: thinkingId, role: 'agent', time: now(), content: '正在启动分析管道...', isStreaming: true }]);

    const runLogs: ToolCallLog[] = [];
    let logIdx = 0;
    const tickLog = () => {
      if (logIdx >= mockToolCallLogs.length) {
        setPipeline(mockPipelineAgents.map((a) => ({ ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount })));
        setTimeout(() => {
          setAnalyzing(false);
          // 替换 thinking 消息为结果卡片
          setMessages((prev) => prev.map((m) => m.id === thinkingId ? {
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
      setPipeline((prev) => prev.map((a) => {
        if (a.key === log.agent) {
          const dc = runLogs.filter((l) => l.agent === a.key).length;
          return { ...a, status: 'running' as const, progress: Math.round((dc / a.toolCount) * 100), currentTool: log.toolLabel, doneCount: dc };
        }
        if (a.key === 'attribution' && log.agent === 'strategy') return { ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount };
        if (a.key === 'strategy' && log.agent !== 'strategy') return { ...a, status: 'waiting' as const, currentTool: '等待上游完成' };
        return a;
      }));
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
  const [thinkOpen, setThinkOpen] = useState(false);
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

        {/* 普通文本 */}
        {msg.type !== 'alert_card' && msg.type !== 'result_card' && (
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
