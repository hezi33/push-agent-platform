import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card, Tag, Space, Typography, Button, Progress, Input, Collapse, Row, Col,
} from 'antd';
import {
  RobotOutlined, UserOutlined, SearchOutlined, ThunderboltOutlined,
  CheckCircleOutlined, SyncOutlined, ArrowLeftOutlined, SendOutlined,
  CodeOutlined, ExclamationCircleOutlined, BulbOutlined, QuestionCircleOutlined,
  LoadingOutlined, CaretDownOutlined, CaretRightOutlined,
} from '@ant-design/icons';
import type { ToolCallLog, PipelineAgent } from '../../mocks/data/agentWorkbench';
import { mockToolCallLogs, mockPipelineAgents } from '../../mocks/data/agentWorkbench';
import { useWorkbenchStore } from '../../stores/workbench';

const { Text, Title } = Typography;

// ============================================================
// 对话消息类型
// ============================================================
interface ChatMessage {
  id: string; role: 'agent' | 'user' | 'system'; content: string; time: string;
  type?: 'text' | 'alert_card' | 'result_card';
  alertInfo?: { level: string; metric: string; dim: string; loss: number };
  resultSummary?: { lockedDim: string; funnelIssue: string; rootCause: string; confidence: number; suggestion: string };
  isStreaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  '为什么今天 UV 打开率减少了 12.8%？',
  '帮我分析最近一条严重告警',
  '广东省小米用户的到达率为什么下降了？',
];

// ============================================================
// 根据用户问题推断要分析的指标上下文
// ============================================================
function parseQuestionContext(question: string) {
  const q = question.toLowerCase();
  if (q.includes('uv打开率') || q.includes('打开率') || q.includes('uv 打开')) {
    return {
      metricName: 'UV 打开率', metricKey: 'uv_open_rate', currentValue: 3.40, baselineValue: 3.90,
      changePct: -12.8, sigma: 2.4,
      lockedDim: '全量 × Android × 小米 × 广东省',
      funnelIssue: '打开率 ↓12.8%（内容质量/用户兴趣问题）',
      rootCause: '广东省小米用户对近期全量 Push 内容兴趣度显著下降，标题点击率降低',
      confidence: 65,
      suggestion: '优化广东小米用户群的内容匹配算法；增发本地民生/天气类高打开率内容；调整推送时段至 17:00-19:00 用户活跃高峰',
    };
  }
  if (q.includes('首启') || q.includes('first_open')) {
    return {
      metricName: '首启 UV', metricKey: 'first_open_uv', currentValue: 147000, baselineValue: 157000,
      changePct: -6.4, sigma: 1.9,
      lockedDim: '全量 × 华为 × 江苏省',
      funnelIssue: '首启率 ↓6.4%（SDK 版本问题导致部分机型到达率下降）',
      rootCause: '华为推送 SDK 版本更新导致部分机型到达率下降，进而影响首启 UV',
      confidence: 78,
      suggestion: '联系华为技术支持回滚 SDK 版本；对受影响机型启用备用推送通道',
    };
  }
  // 默认：到达率
  return {
    metricName: '到达率', metricKey: 'arrive_rate', currentValue: 22.0, baselineValue: 35.0,
    changePct: -37.1, sigma: 2.8,
    lockedDim: '本地实时 × Android × 小米 × 广东省',
    funnelIssue: '到达率 ↓37%（厂商通道问题）',
    rootCause: '小米厂商通道广东地区出现短暂推送异常',
    confidence: 65,
    suggestion: '联系小米技术支持排查广东地区通道异常，必要时切换备用通道；增发广东本地 Push 补偿首启缺口',
  };
}

// ============================================================
// Agent 工作台 — 对话式（修复版）
// ============================================================
export default function AgentWorkbench() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const incomingAlertId = searchParams.get('alertId');

  // 持久化 Store
  const store = useWorkbenchStore();

  // 本地状态
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // 恢复历史或初始化
    if (store.messages.length > 0) return store.messages;
    if (!incomingAlertId) return [];
    return [{
      id: 'sys-1', role: 'system',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      content: '监控 Agent 检测到异常告警，已自动启动分析管道',
    }, {
      id: 'agent-0', role: 'agent',
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      content: '我发现了一条**严重告警**，需要我帮你分析吗？',
      type: 'alert_card',
      alertInfo: { level: 'S05', metric: '本地实时 Push 到达率', dim: 'Android · 小米 · 广东省', loss: 2300 },
    }];
  });

  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [thinkExpanded, setThinkExpanded] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<ToolCallLog[]>(() => {
    if (store.visibleLogs.length > 0) return store.visibleLogs as ToolCallLog[];
    return incomingAlertId ? mockToolCallLogs : [];
  });

  const [pipeline, setPipeline] = useState<PipelineAgent[]>(() => {
    const hasLogs = incomingAlertId || store.visibleLogs.length > 0;
    return hasLogs
      ? mockPipelineAgents.map((a) => ({ ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount }))
      : mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 }));
  });

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 持久化到 Store
  useEffect(() => {
    store.setMessages(messages);
    store.setPipeline(pipeline);
    store.setVisibleLogs(visibleLogs);
    if (incomingAlertId) store.setAlertId(incomingAlertId);
  }, [messages, pipeline, visibleLogs]);

  // 自动滚动
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── 核心：执行分析 ──
  const runAnalysis = useCallback((question: string) => {
    const ctx = parseQuestionContext(question);
    const now = () => new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    // 用户消息
    const userMsg: ChatMessage = { id: 'user-' + Date.now(), role: 'user', time: now(), content: question };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAnalyzing(true);
    setThinkExpanded(true); // ✅ 修复4: 开始分析时自动展开思考
    setVisibleLogs([]);
    setPipeline(mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 })));

    // 流式播放工具日志
    let logIdx = 0;
    const tickLog = () => {
      if (logIdx >= mockToolCallLogs.length) {
        setPipeline(mockPipelineAgents.map((a) => ({ ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount })));
        setTimeout(() => {
          setAnalyzing(false);
          setThinkExpanded(false); // ✅ 修复4: 思考完成后自动折叠

          const resultMsg: ChatMessage = {
            id: 'agent-result-' + Date.now(), role: 'agent', time: now(),
            content: `分析完成。根因锁定为**${ctx.rootCause}**（置信度 ${ctx.confidence}%）。以下是我的分析摘要：`,
            type: 'result_card',
            resultSummary: {
              lockedDim: ctx.lockedDim,
              funnelIssue: ctx.funnelIssue,
              rootCause: ctx.rootCause,
              confidence: ctx.confidence,
              suggestion: ctx.suggestion,
            },
          };
          setMessages((prev) => [...prev, resultMsg]);
        }, 500);
        return;
      }

      const log = mockToolCallLogs[logIdx];
      setVisibleLogs((prev) => [...prev, log]);

      setPipeline((prev) =>
        prev.map((a) => {
          if (a.key === log.agent) {
            const doneCount = mockToolCallLogs.filter((l) => l.agent === a.key && l.seq <= log.seq).length;
            return { ...a, status: 'running' as const, progress: Math.round((doneCount / a.toolCount) * 100), currentTool: log.toolLabel, doneCount };
          }
          if (a.key === 'attribution' && log.agent === 'strategy') return { ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount };
          if (a.key === 'strategy' && (log.agent === 'monitor' || log.agent === 'attribution')) return { ...a, status: 'waiting' as const, currentTool: '等待上游完成' };
          return a;
        })
      );

      logIdx++;
      setTimeout(tickLog, log.isKey ? 900 : 300 + Math.random() * 300);
    };

    setTimeout(() => tickLog(), 600);
  }, []);

  // 发送
  const handleSend = () => {
    if (!input.trim() || analyzing) return;
    runAnalysis(input.trim());
  };

  const pipelineDone = pipeline.every((a) => a.status === 'done');
  const hasContent = messages.length > 0 || visibleLogs.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 48px)' }}>
      {/* ── 顶部 ── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>返回看板</Button>
            <RobotOutlined style={{ color: '#165DFF', fontSize: 18 }} />
            <Title level={4} style={{ margin: 0 }}>Agent 工作台</Title>
            {analyzing && <Tag icon={<SyncOutlined spin />} color="processing">分析中</Tag>}
            {!analyzing && pipelineDone && hasContent && <Tag icon={<CheckCircleOutlined />} color="success">就绪</Tag>}
          </Space>
        </Col>
        <Col>
          <Button
            size="small"
            icon={thinkExpanded ? <CaretDownOutlined /> : <CodeOutlined />}
            onClick={() => setThinkExpanded(!thinkExpanded)}
            type={thinkExpanded ? 'primary' : 'default'}
          >
            {thinkExpanded ? '收起思考' : `思考过程 (${visibleLogs.length})`}
          </Button>
        </Col>
      </Row>

      {/* ── 管道条 ── */}
      {(analyzing || pipelineDone) && (
        <div style={{
          padding: '8px 16px', borderRadius: 8, marginBottom: 12,
          background: analyzing ? '#FFF7E6' : '#F6FFED',
          border: `1px solid ${analyzing ? '#FFD591' : '#B7EB8F'}`,
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          {pipeline.map((a, i) => {
            const cfg: Record<string, { emoji: string; color: string }> = {
              idle: { emoji: '⏳', color: '#C9CDD4' },
              running: { emoji: '🔄', color: '#165DFF' },
              waiting: { emoji: '⏸️', color: '#FF7D00' },
              done: { emoji: '✅', color: '#00B42A' },
              error: { emoji: '❌', color: '#F53F3F' },
            };
            const c = cfg[a.status] || cfg.idle;
            return (
              <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1, minWidth: 0 }}>
                <span>{a.icon}</span>
                <Text strong style={{ fontSize: 12, color: c.color, whiteSpace: 'nowrap' }}>{a.label}</Text>
                <span>{c.emoji}</span>
                {a.status === 'running' && (
                  <Progress percent={a.progress} size="small" style={{ flex: 1, minWidth: 40, margin: 0 }} showInfo={false} />
                )}
                {i < pipeline.length - 1 && <Text type="secondary">→</Text>}
              </div>
            );
          })}
          {pipelineDone && <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto', flexShrink: 0 }}>耗时 57.9s</Text>}
        </div>
      )}

      {/* ── 对话区 ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 4px', minHeight: 0 }}>
        {!hasContent && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <RobotOutlined style={{ fontSize: 48, color: '#C9CDD4', marginBottom: 16 }} />
            <Title level={4} type="secondary">Push Agent 分析工作台</Title>
            <Text type="secondary">输入分析问题，或从下方快捷提问开始</Text>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} navigate={navigate} onAnalyze={(q) => runAnalysis(q)} />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* ── 快捷提问 ── */}
      {!analyzing && messages.length === 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, marginBottom: 6, display: 'block' }}>💡 快捷提问：</Text>
          <Space size={8} wrap>
            {SUGGESTED_QUESTIONS.map((q) => (
              <Tag key={q} style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }} color="blue"
                onClick={() => runAnalysis(q)}>
                {q}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {analyzing && (
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <Text type="secondary"><LoadingOutlined /> Agent 正在分析... 思考面板已自动展开 ↓</Text>
        </div>
      )}

      {/* ── 思考面板 ── */}
      {visibleLogs.length > 0 && (
        <Collapse
          activeKey={thinkExpanded ? ['think'] : []}
          onChange={(keys) => setThinkExpanded(keys.includes('think'))}
          style={{ marginBottom: 12, background: '#FAFBFC' }}
          size="small"
          items={[{
            key: 'think',
            label: (
              <Space size={4}>
                <CodeOutlined style={{ fontSize: 12, color: '#86909C' }} />
                <Text style={{ fontSize: 12, color: '#86909C' }}>
                  Agent 思考过程
                  {analyzing && <SyncOutlined spin style={{ marginLeft: 6, color: '#165DFF' }} />}
                </Text>
                <Text style={{ fontSize: 11, color: '#C9CDD4' }}>
                  （{visibleLogs.length}/{mockToolCallLogs.length} 步 · 14 个工具调用）
                </Text>
              </Space>
            ),
            children: <ThinkLogCompact logs={visibleLogs} isStreaming={analyzing} />,
          }]}
        />
      )}

      {/* ── 输入栏 ── */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 0 0', borderTop: '1px solid #E5E6EB' }}>
        <Input
          placeholder={analyzing ? 'Agent 分析中，请稍候...' : '输入分析问题，如"为什么今天UV打开率减少了12.8%？"...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          disabled={analyzing}
          style={{ flex: 1 }}
          prefix={<QuestionCircleOutlined style={{ color: '#C9CDD4' }} />}
          suffix={
            <Button type="primary" size="small" icon={<SendOutlined />} onClick={handleSend}
              disabled={!input.trim() || analyzing}>发送</Button>
          }
        />
      </div>
    </div>
  );
}

// ============================================================
// 对话气泡
// ============================================================

function ChatBubble({ msg, navigate, onAnalyze }: {
  msg: ChatMessage;
  navigate: ReturnType<typeof useNavigate>;
  onAnalyze: (q: string) => void;
}) {
  const isAgent = msg.role === 'agent';

  if (msg.role === 'system') {
    return <div style={{ textAlign: 'center', margin: '12px 0' }}><Tag color="blue" style={{ fontSize: 11 }}>{msg.content}</Tag></div>;
  }

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexDirection: isAgent ? 'row' : 'row-reverse' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
        background: isAgent ? '#E8F2FF' : '#F0F5FF',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {isAgent ? <RobotOutlined style={{ color: '#165DFF', fontSize: 16 }} /> : <UserOutlined style={{ color: '#4E5969', fontSize: 16 }} />}
      </div>

      <div style={{ maxWidth: '78%' }}>
        <div style={{ marginBottom: 2 }}>
          <Text strong style={{ fontSize: 12 }}>{isAgent ? 'Agent' : '我'}</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{msg.time}</Text>
          {msg.isStreaming && <LoadingOutlined style={{ marginLeft: 8, color: '#165DFF' }} />}
        </div>

        {/* 告警卡片 */}
        {msg.type === 'alert_card' && msg.alertInfo && (
          <Card size="small" style={{ borderLeft: '3px solid #F53F3F', borderRadius: 8, marginTop: 6, background: '#FFF7F5' }}>
            <Space direction="vertical" size={4} style={{ width: '100%' }}>
              <Space><Tag color="error">严重告警 S05</Tag><Text strong style={{ fontSize: 13 }}>{msg.alertInfo.metric}</Text></Space>
              <Text style={{ fontSize: 12, color: '#4E5969' }}>影响：{msg.alertInfo.dim} · 预计损失 ~{msg.alertInfo.loss.toLocaleString()} 首启</Text>
              <Space size={8}>
                <Button type="primary" size="small" icon={<SearchOutlined />}
                  onClick={() => navigate(`/anomaly/ALT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001?from=workbench`)}>
                  查看异常详情
                </Button>
                {/* ✅ 修复3: 直接触发分析，而非跳转 */}
                <Button size="small" type="primary" ghost icon={<SearchOutlined />}
                  onClick={() => onAnalyze('帮我分析这条告警：' + msg.alertInfo!.metric)}>
                  分析此异常
                </Button>
              </Space>
            </Space>
          </Card>
        )}

        {/* 结果卡片 */}
        {msg.type === 'result_card' && msg.resultSummary && (
          <Card size="small" style={{ borderLeft: '3px solid #165DFF', borderRadius: 8, marginTop: 6 }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space>
                <Tag color="success" icon={<CheckCircleOutlined />}>分析完成</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>总耗时 57.9s</Text>
              </Space>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                <div><Text type="secondary">🎯 锁定:</Text> <Text strong>{msg.resultSummary.lockedDim}</Text></div>
                <div><Text type="secondary">🔗 环节:</Text> <Tag color="error">{msg.resultSummary.funnelIssue}</Tag></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Text type="secondary">🧠 根因:</Text> <Text>{msg.resultSummary.rootCause}</Text>
                  <Progress percent={msg.resultSummary.confidence} strokeColor="#F7BA1E" size="small"
                    style={{ width: 100, display: 'inline-block', marginLeft: 8 }} />
                  <Text style={{ fontSize: 11, color: '#F7BA1E' }}> {msg.resultSummary.confidence}%</Text>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Text type="secondary">💡 建议:</Text> <Text>{msg.resultSummary.suggestion}</Text>
                </div>
              </div>
              <Space size={8}>
                <Button type="primary" size="small" icon={<SearchOutlined />}
                  onClick={() => navigate(`/attribution/ATTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001?from=workbench`)}>
                  查看完整归因报告
                </Button>
                <Button size="small" icon={<ThunderboltOutlined />}
                  onClick={() => navigate(`/strategy/SUG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001?from=workbench`)}>
                  查看策略建议
                </Button>
              </Space>
            </Space>
          </Card>
        )}

        {/* 普通文本 */}
        {msg.type !== 'alert_card' && msg.type !== 'result_card' && (
          <div style={{
            padding: '10px 14px', borderRadius: 8, marginTop: 4, fontSize: 13, lineHeight: '22px', color: '#1D2129',
            background: isAgent ? '#F7F8FA' : '#E8F2FF',
          }}>
            {msg.content.split('**').map((part, i) => i % 2 === 1 ? <strong key={i}>{part}</strong> : part)}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 紧凑思考日志
// ============================================================

function ThinkLogCompact({ logs, isStreaming }: { logs: ToolCallLog[]; isStreaming: boolean }) {
  const agentColors: Record<string, string> = { monitor: '#165DFF', attribution: '#FF7D00', strategy: '#722ED1' };
  const agentIcons: Record<string, string> = { monitor: '🔍', attribution: '🧠', strategy: '⚡' };

  return (
    <div style={{ maxHeight: 240, overflow: 'auto', fontSize: 11, fontFamily: '"SF Mono", "Menlo", monospace', color: '#4E5969' }}>
      {logs.map((log) => (
        <div key={log.id} style={{
          padding: '3px 0', borderLeft: log.isKey ? `2px solid ${agentColors[log.agent]}` : '2px solid transparent',
          paddingLeft: log.isKey ? 8 : 2, marginBottom: log.isKey ? 4 : 1, opacity: log.isKey ? 1 : 0.75,
        }}>
          <span style={{ color: '#C9CDD4', marginRight: 8 }}>{log.timeDisplay}</span>
          <span style={{ marginRight: 4 }}>{agentIcons[log.agent]}</span>
          <span style={{ color: agentColors[log.agent], fontWeight: log.isKey ? 600 : 400 }}>{log.toolName}()</span>
          <span style={{ color: '#86909C' }}> → {log.description}</span>
          {log.isKey && log.output && (
            <span style={{ color: '#00B42A', marginLeft: 6 }}>✓ {JSON.stringify(log.output).slice(0, 60)}...</span>
          )}
          <span style={{ color: '#C9CDD4', marginLeft: 6 }}>{log.durationMs}ms</span>
        </div>
      ))}
      {isStreaming && <div style={{ color: '#165DFF' }}><LoadingOutlined /> Agent 思考中...</div>}
    </div>
  );
}
