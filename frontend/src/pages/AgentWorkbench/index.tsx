import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Layout, Card, Tag, Space, Typography, Button, Progress, Badge, Tooltip, Segmented, Collapse, Descriptions, Divider,
} from 'antd';
import {
  RobotOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ArrowLeftOutlined,
  CodeOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  CaretRightOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  BugOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import type { ToolCallLog, PipelineAgent, AgentName } from '../../mocks/data/agentWorkbench';
import { mockToolCallLogs, mockPipelineAgents } from '../../mocks/data/agentWorkbench';
import { STATUS_COLORS, STATUS_LABELS } from '../../theme/colors';

const { Text, Title, Paragraph } = Typography;
const { Sider, Content } = Layout;

// ============================================================
// Agent 工作台 — 主页面
//
// 三面板布局：
//   左侧：管道可视化（三个 Agent 状态 + 进度）
//   右侧：思考日志（流式工具调用输出）
//   底部：结果面板（可折叠的归因报告 + 策略建议）
// ============================================================

export default function AgentWorkbench() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const alertId = searchParams.get('alertId') || 'ALT-001';

  // 控制日志的逐条展示（模拟流式输出）
  const [visibleLogs, setVisibleLogs] = useState<ToolCallLog[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [pipeline, setPipeline] = useState<PipelineAgent[]>(() =>
    mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 }))
  );
  const [activeTab, setActiveTab] = useState<string>('log');
  const logContainerRef = useRef<HTMLDivElement>(null);

  // 流式播放动画：每 600-1200ms 展示一条新的工具调用日志
  const streamLogs = useCallback(() => {
    let idx = 0;
    setIsStreaming(true);

    const tick = () => {
      if (idx >= mockToolCallLogs.length) {
        setIsStreaming(false);
        setPipeline(mockPipelineAgents);
        return;
      }

      const log = mockToolCallLogs[idx];

      // 标记当前正在执行的日志
      const logWithStatus = idx === mockToolCallLogs.length - 1
        ? log
        : { ...log, status: 'success' as const };

      setVisibleLogs((prev) => [...prev, logWithStatus]);

      // 更新管道状态
      setPipeline((prev) =>
        prev.map((a) => {
          if (a.key === log.agent) {
            const doneCount = mockToolCallLogs.filter((l) => l.agent === a.key && l.seq <= log.seq && l.status === 'success').length;
            return {
              ...a,
              status: 'running' as const,
              progress: Math.round((doneCount / (a.toolCount || 4)) * 100),
              currentTool: log.toolLabel,
              doneCount,
            };
          }
          if (a.key === 'attribution' && log.agent === 'strategy') {
            return { ...a, status: 'done' as const, progress: 100 };
          }
          if (a.key === 'strategy' && log.agent === 'attribution') {
            return { ...a, status: 'waiting' as const, currentTool: '等待归因完成' };
          }
          return a;
        })
      );

      idx++;
      const delay = log.isKey ? 1000 : 500 + Math.random() * 400;
      setTimeout(tick, delay);
    };

    // 初始延迟
    setTimeout(tick, 600);
  }, []);

  // 启动流式播放
  useEffect(() => {
    streamLogs();
  }, [streamLogs]);

  // 自动滚动到底部
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [visibleLogs]);

  return (
    <div style={{ height: 'calc(100vh - 56px - 48px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* ── 顶部标题栏 ── */}
      <Row justify="space-between" align="middle">
        <Col>
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>返回看板</Button>
            <Divider type="vertical" />
            <RobotOutlined style={{ fontSize: 18, color: '#165DFF' }} />
            <Title level={4} style={{ margin: 0 }}>Agent 工作台</Title>
            {isStreaming ? (
              <Tag icon={<SyncOutlined spin />} color="processing">分析进行中</Tag>
            ) : (
              <Tag icon={<CheckCircleOutlined />} color="success">分析完成</Tag>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              告警 {alertId}
            </Text>
          </Space>
        </Col>
        <Col>
          <Space>
            <Segmented
              size="small"
              value={activeTab}
              onChange={(v) => setActiveTab(v as string)}
              options={[
                { label: '思考日志', value: 'log', icon: <CodeOutlined /> },
                { label: '归因报告', value: 'report', icon: <SearchOutlined /> },
                { label: '策略建议', value: 'strategy', icon: <ThunderboltOutlined /> },
              ]}
            />
            <Button icon={<ReloadOutlined />} onClick={() => { setVisibleLogs([]); setPipeline(mockPipelineAgents.map((a) => ({ ...a, status: 'idle' as const, progress: 0, doneCount: 0 }))); streamLogs(); }} size="small">
              重播
            </Button>
          </Space>
        </Col>
      </Row>

      {/* ── 主内容区 ── */}
      <div style={{ flex: 1, display: 'flex', gap: 12, minHeight: 0 }}>
        {/* 左侧面板：管道 + 上下文 */}
        <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PipelinePanel pipeline={pipeline} isStreaming={isStreaming} />

          <Card size="small" bordered={false} title="📋 异常上下文">
            <Descriptions size="small" column={1} labelStyle={{ fontSize: 11, color: '#86909C' }} contentStyle={{ fontSize: 12 }}>
              <Descriptions.Item label="指标">本地实时 Push 到达率</Descriptions.Item>
              <Descriptions.Item label="当前值">
                <Text style={{ color: '#F53F3F', fontWeight: 600 }}>22.0%</Text>
              </Descriptions.Item>
              <Descriptions.Item label="基线值">35.0%</Descriptions.Item>
              <Descriptions.Item label="偏离度">
                <Text style={{ color: '#F53F3F' }}>-2.8σ</Text>
              </Descriptions.Item>
              <Descriptions.Item label="维度">
                <Space size={2} wrap>
                  <Tag style={{ fontSize: 10 }}>本地实时</Tag>
                  <Tag color="blue" style={{ fontSize: 10 }}>小米</Tag>
                  <Tag color="purple" style={{ fontSize: 10 }}>广东</Tag>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="预估损失">
                <Text style={{ color: '#F53F3F' }}>~2,300 首启</Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 快捷操作 */}
          <Card size="small" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="primary"
                block
                icon={<SearchOutlined />}
                onClick={() => navigate(`/attribution/ATTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`)}
                size="small"
              >
                查看完整归因报告
              </Button>
              <Button
                block
                icon={<ThunderboltOutlined />}
                onClick={() => navigate(`/strategy/SUG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`)}
                size="small"
              >
                查看策略建议
              </Button>
            </Space>
          </Card>
        </div>

        {/* 右侧：日志 / 结果面板 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {activeTab === 'log' && (
            <ThinkLogPanel logs={visibleLogs} isStreaming={isStreaming} logContainerRef={logContainerRef} />
          )}
          {activeTab === 'report' && <ReportResultPanel />}
          {activeTab === 'strategy' && <StrategyResultPanel />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 管道面板（左侧）
// ============================================================

function PipelinePanel({ pipeline, isStreaming }: { pipeline: PipelineAgent[]; isStreaming: boolean }) {
  return (
    <Card
      size="small"
      bordered={false}
      title={<Space><PlayCircleOutlined style={{ color: '#165DFF' }} />Agent 管道</Space>}
      bodyStyle={{ padding: '12px 16px' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pipeline.map((agent, idx) => {
          const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
            idle: { color: '#C9CDD4', icon: <ClockCircleOutlined />, label: '等待中' },
            running: { color: '#165DFF', icon: <SyncOutlined spin />, label: '运行中' },
            waiting: { color: '#FF7D00', icon: <ClockCircleOutlined />, label: '等待上游' },
            done: { color: '#00B42A', icon: <CheckCircleOutlined />, label: '已完成' },
            error: { color: '#F53F3F', icon: <ExclamationCircleOutlined />, label: '异常' },
          };
          const cfg = statusConfig[agent.status] || statusConfig.idle;
          const isActive = agent.status === 'running';

          return (
            <div key={agent.key}>
              {/* Agent 卡片 */}
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: 8,
                  background: isActive ? '#E8F2FF' : agent.status === 'done' ? '#F6FFED' : '#FAFAFA',
                  border: `1.5px solid ${isActive ? '#165DFF' : agent.status === 'done' ? '#B7EB8F' : '#E5E6EB'}`,
                  transition: 'all 0.3s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Space size={6}>
                    <Text style={{ fontSize: 16 }}>{agent.icon}</Text>
                    <Text strong style={{ fontSize: 13 }}>{agent.label}</Text>
                  </Space>
                  <Tag color={cfg.color} style={{ fontSize: 10, margin: 0 }}>
                    <Space size={4}>
                      {cfg.icon}
                      {cfg.label}
                    </Space>
                  </Tag>
                </div>

                {agent.status === 'running' && (
                  <>
                    <Progress
                      percent={agent.progress}
                      strokeColor="#165DFF"
                      size="small"
                      showInfo={false}
                      style={{ marginBottom: 4 }}
                    />
                    <Text type="secondary" style={{ fontSize: 10 }}>
                      🛠 {agent.currentTool}
                    </Text>
                  </>
                )}

                {agent.status === 'done' && (
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    ✅ {agent.doneCount}/{agent.toolCount} 个工具调用完成
                  </Text>
                )}

                {agent.status === 'waiting' && (
                  <Text type="secondary" style={{ fontSize: 10 }}>
                    ⏳ {agent.currentTool}
                  </Text>
                )}
              </div>

              {/* Agent 之间的连接箭头 */}
              {idx < pipeline.length - 1 && (
                <div style={{ textAlign: 'center', padding: '4px 0' }}>
                  <Text type="secondary" style={{ fontSize: 18 }}>↓</Text>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ============================================================
// 思考日志面板（右侧）
// ============================================================

function ThinkLogPanel({
  logs, isStreaming, logContainerRef,
}: {
  logs: ToolCallLog[];
  isStreaming: boolean;
  logContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const agentIcons: Record<AgentName, string> = {
    monitor: '🔍',
    attribution: '🧠',
    strategy: '⚡',
  };

  const agentColors: Record<AgentName, string> = {
    monitor: '#165DFF',
    attribution: '#FF7D00',
    strategy: '#722ED1',
  };

  return (
    <Card
      bordered={false}
      title={
        <Space>
          <CodeOutlined />
          <span>Agent 思考日志</span>
          {isStreaming && <Tag icon={<SyncOutlined spin />} color="processing" style={{ fontSize: 10 }}>实时输出中</Tag>}
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 'normal' }}>
            {logs.length} / {mockToolCallLogs.length} 条
          </Text>
        </Space>
      }
      bodyStyle={{ padding: 0, height: 'calc(100% - 46px)' }}
      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div
        ref={logContainerRef}
        style={{
          flex: 1, overflow: 'auto', padding: '12px 16px',
          fontFamily: '"SF Mono", "Menlo", "Monaco", "Courier New", monospace',
          fontSize: 12, lineHeight: '20px', background: '#1E1E2E', color: '#CDD6F4',
          borderRadius: '0 0 8px 8px',
        }}
      >
        {/* 终端头部 */}
        <div style={{ color: '#A6ADC8', marginBottom: 12, fontSize: 11 }}>
          <div>══════════════════════════════════════════════</div>
          <div>  Push Agent System · 多 Agent 协作分析终端</div>
          <div>  {new Date().toLocaleString('zh-CN')}</div>
          <div>══════════════════════════════════════════════</div>
        </div>

        {logs.length === 0 && (
          <div style={{ color: '#6C7086' }}>
            <SyncOutlined spin /> 等待 Agent 启动...
          </div>
        )}

        {logs.map((log) => {
          const isExpanded = expandedId === log.id;
          const color = agentColors[log.agent];

          return (
            <div
              key={log.id}
              style={{
                marginBottom: isExpanded ? 16 : 8,
                padding: isExpanded ? '8px 12px' : '4px 0',
                background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderRadius: 6,
                borderLeft: log.isKey ? `2px solid ${color}` : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onClick={() => setExpandedId(isExpanded ? null : log.id)}
            >
              {/* 一行摘要 */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: '#6C7086', flexShrink: 0, width: 60, textAlign: 'right' }}>
                  {log.timeDisplay}
                </span>
                <span style={{ color, flexShrink: 0 }}>{agentIcons[log.agent]}</span>
                <span style={{ color: '#89B4FA' }}>{log.agentLabel}.{log.toolName}()</span>
                {log.status === 'running' && <LoadingOutlined style={{ color }} spin />}
                {log.status === 'success' && <CheckCircleOutlined style={{ color: '#A6E3A1' }} />}
                {log.status === 'error' && <ExclamationCircleOutlined style={{ color: '#F38BA8' }} />}
                {log.status === 'success' && (
                  <span style={{ color: '#6C7086', marginLeft: 'auto', flexShrink: 0 }}>{log.durationMs}ms</span>
                )}
              </div>

              {/* 描述 */}
              <div style={{ marginLeft: 68, color: '#BAC2DE', fontSize: 11, marginTop: 2 }}>
                {log.description}
              </div>

              {/* 展开后的输入/输出详情 */}
              {isExpanded && (
                <div style={{ marginLeft: 68, marginTop: 8, fontSize: 11 }}>
                  <Collapse
                    ghost
                    size="small"
                    items={[
                      {
                        key: 'input',
                        label: <Text style={{ fontSize: 11, color: '#89B4FA' }}>📥 Input</Text>,
                        children: (
                          <pre style={{ color: '#A6ADC8', fontSize: 10, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(log.input, null, 2)}
                          </pre>
                        ),
                      },
                      log.output && {
                        key: 'output',
                        label: (
                          <Text style={{ fontSize: 11, color: log.isKey ? '#F9E2AF' : '#A6E3A1' }}>
                            📤 Output {log.isKey && '⭐ 关键结果'}
                          </Text>
                        ),
                        children: (
                          <pre style={{ color: '#A6ADC8', fontSize: 10, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify(log.output, null, 2)}
                          </pre>
                        ),
                      },
                    ].filter(Boolean)}
                  />
                </div>
              )}

              {/* 关键结果的快速摘要（不展开时也显示） */}
              {!isExpanded && log.isKey && log.output && (
                <div style={{ marginLeft: 68, color: '#F9E2AF', fontSize: 10, marginTop: 2, opacity: 0.85 }}>
                  → {JSON.stringify(log.output).slice(0, 120)}...
                </div>
              )}
            </div>
          );
        })}

        {/* 光标闪烁（流式输出中） */}
        {isStreaming && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', color: '#89B4FA' }}>
            <span style={{ animation: 'blink 1s step-end infinite' }}>▊</span>
            <span style={{ fontSize: 10, color: '#6C7086' }}>Agent 正在思考...</span>
          </div>
        )}

        {!isStreaming && logs.length > 0 && (
          <div style={{ color: '#A6E3A1', marginTop: 8 }}>
            <div>══════════════════════════════════════════════</div>
            <div>  ✅ 全部分析完成 · 耗时 {(mockToolCallLogs.reduce((s, l) => s + l.durationMs, 0) / 1000).toFixed(1)}s</div>
            <div>  📊 监控: 4 工具 | 🧠 归因: 6 工具 | ⚡ 策略: 4 工具</div>
            <div>══════════════════════════════════════════════</div>
          </div>
        )}
      </div>
    </Card>
  );
}

// ============================================================
// 结果面板 — 归因报告（Tab 切换时显示）
// ============================================================

function ReportResultPanel() {
  const navigate = useNavigate();
  return (
    <Card bordered={false} title={<Space><SearchOutlined />归因分析结果</Space>}
      extra={<Button type="link" onClick={() => navigate(`/attribution/ATTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`)}>查看完整报告 →</Button>}
    >
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="锁定维度">本地实时 × Android × 小米 × 广东省</Descriptions.Item>
        <Descriptions.Item label="故障环节">
          <Tag color="error">到达率 ↓37%</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="根因 Top-1">小米厂商通道广东地区出现短暂推送异常</Descriptions.Item>
        <Descriptions.Item label="置信度">
          <Progress percent={65} strokeColor="#F7BA1E" size="small" style={{ width: 120 }} />
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}

function StrategyResultPanel() {
  const navigate = useNavigate();
  return (
    <Card bordered={false} title={<Space><ThunderboltOutlined />策略建议</Space>}
      extra={<Button type="link" onClick={() => navigate(`/strategy/SUG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-001`)}>查看完整策略 →</Button>}
    >
      <Descriptions bordered size="small" column={2}>
        <Descriptions.Item label="建议">联系小米技术支持排查广东地区通道异常，必要时切换备用通道</Descriptions.Item>
        <Descriptions.Item label="效果预估">+1,200 首启 UV (+10.2%)</Descriptions.Item>
        <Descriptions.Item label="负责编辑">张三（广东省早班编辑）</Descriptions.Item>
        <Descriptions.Item label="跟踪计划">D+1 执行检查 · D+3 效果检查 · D+7 闭环验证</Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
