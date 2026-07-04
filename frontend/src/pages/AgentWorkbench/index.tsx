import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Card, Tag, Space, Typography, Button, Progress, Tooltip, Input, Divider, Collapse, Row, Col,
} from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ArrowLeftOutlined,
  SendOutlined,
  CodeOutlined,
  CaretRightOutlined,
  ExclamationCircleOutlined,
  BulbOutlined,
  QuestionCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { ToolCallLog, PipelineAgent } from '../../mocks/data/agentWorkbench';
import { mockToolCallLogs, mockPipelineAgents } from '../../mocks/data/agentWorkbench';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ============================================================
// 对话消息类型
// ============================================================

interface ChatMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  time: string;
  type?: 'text' | 'alert_card' | 'result_card';
  alertInfo?: { level: string; metric: string; dim: string; loss: number };
  resultSummary?: { lockedDim: string; funnelIssue: string; rootCause: string; confidence: number; suggestion: string };
  isStreaming?: boolean;
}

// 预设的快捷提问
const SUGGESTED_QUESTIONS = [
  '为什么今天 UV 打开率减少了 12.8%？',
  '帮我分析最近一条严重告警',
  '广东省小米用户的到达率为什么下降了？',
];

// 工具日志摘要（默认折叠 — 就是 Claude Code 的 thinking）
const THINK_SUMMARY = {
  monitor: { tools: 4, time: '3.2s' },
  attribution: { tools: 6, time: '48.5s' },
  strategy: { tools: 4, time: '6.2s' },
};

// ============================================================
// Agent 工作台 — 对话式
// ============================================================

export default function AgentWorkbench() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const alertId = searchParams.get('alertId');

  // 对话消息
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initial: ChatMessage[] = [];
    if (alertId) {
      initial.push({
        id: 'sys-1', role: 'system', time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        content: '监控 Agent 检测到异常告警，已自动启动分析管道',
      });
      initial.push({
        id: 'agent-0', role: 'agent', time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        content: '我发现了一条**严重告警**，需要我帮你分析吗？',
        type: 'alert_card',
        alertInfo: { level: 'S05', metric: '本地实时 Push 到达率', dim: 'Android · 小米 · 广东省', loss: 2300 },
      });
    }
    return initial;
  });

  // 输入
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [pipeline, setPipeline] = useState<PipelineAgent[]>(() =>
    alertId
      ? mockPipelineAgents.map((a) => ({ ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount }))
      : mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 }))
  );

  // 思考面板
  const [thinkExpanded, setThinkExpanded] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<ToolCallLog[]>(() => (alertId ? mockToolCallLogs : []));

  const chatEndRef = useRef<HTMLDivElement>(null);

  // 自动滚到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 模拟分析流程
  const runAnalysis = (question: string) => {
    // 添加用户消息
    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(), role: 'user', time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      content: question,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAnalyzing(true);

    // 重置并开始流式日志
    setVisibleLogs([]);
    setPipeline(mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 })));

    // 逐条播放工具日志
    let logIdx = 0;
    const tickLog = () => {
      if (logIdx >= mockToolCallLogs.length) {
        // 全部完成
        setPipeline(mockPipelineAgents.map((a) => ({ ...a, status: 'done' as const, progress: 100, doneCount: a.toolCount })));
        // 添加结果消息
        setTimeout(() => {
          setAnalyzing(false);
          const resultMsg: ChatMessage = {
            id: 'agent-result-' + Date.now(), role: 'agent', time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            content: '分析完成。根因锁定为**小米厂商通道广东地区出现短暂推送异常**（置信度 65%）。以下是我的分析摘要：',
            type: 'result_card',
            resultSummary: {
              lockedDim: '本地实时 × Android × 小米 × 广东省',
              funnelIssue: '到达率 ↓37%（非内容问题）',
              rootCause: '小米通道广东地区短暂异常',
              confidence: 65,
              suggestion: '联系小米技术支持排查，必要时切换备用通道；增发广东本地 Push 补偿首启缺口',
            },
          };
          setMessages((prev) => [...prev, resultMsg]);
        }, 500);
        return;
      }

      const log = mockToolCallLogs[logIdx];
      setVisibleLogs((prev) => [...prev, log]);

      // 更新管道
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

    // 添加"分析中..."消息
    const thinkingMsg: ChatMessage = {
      id: 'agent-thinking-' + Date.now(), role: 'agent', time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      content: '收到，正在启动分析管道...',
      isStreaming: true,
    };
    setMessages((prev) => [...prev, thinkingMsg]);

    setTimeout(() => {
      // 移除 thinking 消息
      setMessages((prev) => prev.filter((m) => m.id !== thinkingMsg.id));
      tickLog();
    }, 800);
  };

  // 快捷提问
  const handleQuickQuestion = (q: string) => {
    runAnalysis(q);
  };

  // 发送消息
  const handleSend = () => {
    if (!input.trim() || analyzing) return;
    runAnalysis(input.trim());
  };

  const pipelineDone = pipeline.every((a) => a.status === 'done');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px - 48px)' }}>
      {/* ── 顶部栏 ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>返回看板</Button>
          <RobotOutlined style={{ color: '#165DFF', fontSize: 18 }} />
          <Title level={4} style={{ margin: 0 }}>Agent 工作台</Title>
          {analyzing && <Tag icon={<SyncOutlined spin />} color="processing">分析中</Tag>}
          {pipelineDone && messages.length > 0 && <Tag icon={<CheckCircleOutlined />} color="success">就绪</Tag>}
        </Space>
        <Space>
          <Button size="small" icon={<CodeOutlined />} onClick={() => setThinkExpanded(!thinkExpanded)} type={thinkExpanded ? 'primary' : 'default'}>
            {thinkExpanded ? '隐藏思考' : '思考过程'}
          </Button>
        </Space>
      </div>

      {/* ── 管道缩略条 ── */}
      {(analyzing || pipelineDone) && (
        <div
          style={{
            padding: '8px 16px', borderRadius: 8, marginBottom: 12,
            background: analyzing ? '#FFF7E6' : '#F6FFED',
            border: `1px solid ${analyzing ? '#FFD591' : '#B7EB8F'}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}
        >
          {pipeline.map((a, i) => {
            const cfg = { idle: '⏳', running: '🔄', waiting: '⏸️', done: '✅', error: '❌' };
            const color = a.status === 'running' ? '#165DFF' : a.status === 'done' ? '#00B42A' : '#86909C';
            return (
              <div key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <span>{a.icon}</span>
                <Text strong style={{ fontSize: 12, color }}>{a.label}</Text>
                <Text style={{ fontSize: 11, color }}>{cfg[a.status]}</Text>
                {a.status === 'running' && <Progress percent={a.progress} size="small" style={{ flex: 1, minWidth: 60, margin: 0 }} showInfo={false} />}
                {i < pipeline.length - 1 && <Text type="secondary" style={{ fontSize: 18 }}>→</Text>}
              </div>
            );
          })}
          {pipelineDone && <Text type="secondary" style={{ fontSize: 11, marginLeft: 'auto', flexShrink: 0 }}>耗时 57.9s</Text>}
        </div>
      )}

      {/* ── 对话区 ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 4px', minHeight: 0 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <RobotOutlined style={{ fontSize: 48, color: '#C9CDD4', marginBottom: 16 }} />
            <Title level={4} type="secondary">Push Agent 分析工作台</Title>
            <Text type="secondary">
              输入分析问题，如「为什么今天 UV 打开率下降了？」
            </Text>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} navigate={navigate} />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* ── 快捷提问 ── */}
      {!analyzing && messages.length === 0 && (
        <div style={{ marginBottom: 12 }}>
          <Text type="secondary" style={{ fontSize: 11, marginBottom: 6, display: 'block' }}>💡 快捷提问：</Text>
          <Space size={8} wrap>
            {SUGGESTED_QUESTIONS.map((q) => (
              <Tag
                key={q}
                style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 12 }}
                color="blue"
                onClick={() => handleQuickQuestion(q)}
              >
                {q}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {analyzing && (
        <div style={{ marginBottom: 12, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <LoadingOutlined /> Agent 正在分析...
          </Text>
        </div>
      )}

      {/* ── 思考面板（可折叠） ── */}
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
                  （{visibleLogs.length}/{mockToolCallLogs.length} 步 · {
                    THINK_SUMMARY.monitor.tools + THINK_SUMMARY.attribution.tools + THINK_SUMMARY.strategy.tools
                  } 个工具）
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
          placeholder={analyzing ? 'Agent 分析中，请稍候...' : '输入你的分析问题，如"为什么今天UV打开率减少了12.8%？"...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onPressEnter={handleSend}
          disabled={analyzing}
          style={{ flex: 1 }}
          prefix={<QuestionCircleOutlined style={{ color: '#C9CDD4' }} />}
          suffix={
            <Button type="primary" size="small" icon={<SendOutlined />} onClick={handleSend} disabled={!input.trim() || analyzing}>
              发送
            </Button>
          }
        />
      </div>
    </div>
  );
}

// ============================================================
// 对话气泡
// ============================================================

function ChatBubble({ msg, navigate }: { msg: ChatMessage; navigate: ReturnType<typeof useNavigate> }) {
  const isAgent = msg.role === 'agent';
  const isSystem = msg.role === 'system';

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        <Tag color="blue" style={{ fontSize: 11 }}>{msg.content}</Tag>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex', gap: 10, marginBottom: 16,
        flexDirection: isAgent ? 'row' : 'row-reverse',
      }}
    >
      {/* 头像 */}
      <div
        style={{
          width: 34, height: 34, borderRadius: '50%',
          background: isAgent ? '#E8F2FF' : '#F0F5FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {isAgent ? <RobotOutlined style={{ color: '#165DFF', fontSize: 16 }} /> : <UserOutlined style={{ color: '#4E5969', fontSize: 16 }} />}
      </div>

      {/* 气泡内容 */}
      <div style={{ maxWidth: '75%' }}>
        <div style={{ marginBottom: 2 }}>
          <Text strong style={{ fontSize: 12 }}>{isAgent ? 'Agent' : '我'}</Text>
          <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{msg.time}</Text>
          {msg.isStreaming && <LoadingOutlined style={{ marginLeft: 8, color: '#165DFF' }} />}
        </div>

        {/* 告警卡片 */}
        {msg.type === 'alert_card' && msg.alertInfo && (
          <Card
            size="small"
            style={{
              borderLeft: '3px solid #F53F3F', borderRadius: 8, marginTop: 6,
              background: '#FFF7F5',
            }}
          >
            <Space direction="vertical" size={4}>
              <Space>
                <Tag color="error">严重告警 S05</Tag>
                <Text strong style={{ fontSize: 13 }}>{msg.alertInfo.metric}</Text>
              </Space>
              <Text style={{ fontSize: 12, color: '#4E5969' }}>
                影响：{msg.alertInfo.dim} · 预计损失 ~{msg.alertInfo.loss.toLocaleString()} 首启
              </Text>
              <Space size={8}>
                <Button type="primary" size="small" icon={<SearchOutlined />} onClick={() => navigate(`/anomaly/ALT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`)}>
                  查看异常详情
                </Button>
                <Button size="small" onClick={() => navigate('/workbench')}>
                  分析此异常
                </Button>
              </Space>
            </Space>
          </Card>
        )}

        {/* 分析结果卡片 */}
        {msg.type === 'result_card' && msg.resultSummary && (
          <Card
            size="small"
            style={{ borderLeft: '3px solid #165DFF', borderRadius: 8, marginTop: 6 }}
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {/* 管道完成 */}
              <Space>
                <Tag color="success" icon={<CheckCircleOutlined />}>分析完成</Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>总耗时 57.9s</Text>
              </Space>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 12 }}>
                <div><Text type="secondary">🎯 锁定维度:</Text> <Text strong>{msg.resultSummary.lockedDim}</Text></div>
                <div><Text type="secondary">🔗 故障环节:</Text> <Tag color="error">{msg.resultSummary.funnelIssue}</Tag></div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Text type="secondary">🧠 根因:</Text> <Text>{msg.resultSummary.rootCause}</Text>
                  <Progress percent={msg.resultSummary.confidence} strokeColor="#F7BA1E" size="small" style={{ width: 120, display: 'inline-block', marginLeft: 8 }} />
                  <Text style={{ fontSize: 11, color: '#F7BA1E' }}> {msg.resultSummary.confidence}%</Text>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <Text type="secondary">💡 建议:</Text> <Text>{msg.resultSummary.suggestion}</Text>
                </div>
              </div>

              <Space size={8}>
                <Button type="primary" size="small" icon={<SearchOutlined />}
                  onClick={() => navigate(`/attribution/ATTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`)}>
                  查看完整归因报告
                </Button>
                <Button size="small" icon={<ThunderboltOutlined />}
                  onClick={() => navigate(`/strategy/SUG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`)}>
                  查看策略建议
                </Button>
                <Button size="small" icon={<BulbOutlined />}
                  onClick={() => navigate('/workbench')}>
                  继续提问
                </Button>
              </Space>
            </Space>
          </Card>
        )}

        {/* 普通文本 */}
        {msg.type !== 'alert_card' && msg.type !== 'result_card' && (
          <div
            style={{
              padding: '10px 14px', borderRadius: 8, marginTop: 4,
              background: isAgent ? '#F7F8FA' : '#E8F2FF',
              fontSize: 13, lineHeight: '22px', color: '#1D2129',
            }}
          >
            {/* 简单的 markdown 加粗支持 */}
            {msg.content.split('**').map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 紧凑思考日志（折叠面板内）
// ============================================================

function ThinkLogCompact({ logs, isStreaming }: { logs: ToolCallLog[]; isStreaming: boolean }) {
  const agentColors: Record<string, string> = { monitor: '#165DFF', attribution: '#FF7D00', strategy: '#722ED1' };
  const agentIcons: Record<string, string> = { monitor: '🔍', attribution: '🧠', strategy: '⚡' };

  return (
    <div style={{ maxHeight: 240, overflow: 'auto', fontSize: 11, fontFamily: '"SF Mono", "Menlo", monospace', color: '#4E5969' }}>
      {logs.map((log) => (
        <div
          key={log.id}
          style={{
            padding: '3px 0',
            borderLeft: log.isKey ? `2px solid ${agentColors[log.agent]}` : '2px solid transparent',
            paddingLeft: log.isKey ? 8 : 2,
            marginBottom: log.isKey ? 4 : 1,
            opacity: log.isKey ? 1 : 0.75,
          }}
        >
          <span style={{ color: '#C9CDD4', marginRight: 8 }}>{log.timeDisplay}</span>
          <span style={{ marginRight: 4 }}>{agentIcons[log.agent]}</span>
          <span style={{ color: agentColors[log.agent], fontWeight: log.isKey ? 600 : 400 }}>
            {log.toolName}()
          </span>
          <span style={{ color: '#86909C' }}> → {log.description}</span>
          {log.isKey && log.output && (
            <span style={{ color: '#00B42A', marginLeft: 6 }}>
              ✓ {JSON.stringify(log.output).slice(0, 60)}...
            </span>
          )}
          <span style={{ color: '#C9CDD4', marginLeft: 6 }}>{log.durationMs}ms</span>
        </div>
      ))}
      {isStreaming && (
        <div style={{ color: '#165DFF' }}>
          <LoadingOutlined /> Agent 思考中...
        </div>
      )}
    </div>
  );
}
