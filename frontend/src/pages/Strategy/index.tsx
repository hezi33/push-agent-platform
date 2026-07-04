import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Row, Col, Card, Tag, Space, Typography, Button, Steps, Statistic, Descriptions, List, Alert, Tooltip, message,
} from 'antd';
import {
  ArrowLeftOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getStrategyDetail, getStrategyList } from '../../mocks/data/strategy';
import { STATUS_LABELS, STATUS_COLORS } from '../../theme/colors';

const { Text, Title, Paragraph } = Typography;

// ============================================================
// 策略建议页
// ============================================================

export default function Strategy() {
  const { suggestionId } = useParams<{ suggestionId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromWorkbench = searchParams.get('from') === 'workbench';

  if (!suggestionId) {
    return <StrategyList onSelect={(id) => navigate(`/strategy/${id}`)} />;
  }

  const data = getStrategyDetail(suggestionId);

  return (
    <div>
      {/* 面包屑 */}
      <Space style={{ marginBottom: 16 }}>
        {fromWorkbench ? (
          <Button type="primary" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workbench')}>
            返回 Agent 工作台
          </Button>
        ) : (
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>返回看板</Button>
        )}
        <Text type="secondary">/</Text>
        <Button type="link" style={{ padding: 0, fontSize: 14, fontWeight: 600, height: 'auto' }} onClick={() => navigate('/strategy')}>
          策略建议
        </Button>
        <Text type="secondary">/</Text>
        <Text>{data.suggestionId}</Text>
      </Space>

      {/* 标题行 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <ThunderboltOutlined style={{ fontSize: 20, color: '#722ED1' }} />
            <Title level={4} style={{ margin: 0 }}>优化建议 #{data.suggestionId}</Title>
            <Tag color={STATUS_COLORS[data.status]}>{data.statusLabel}</Tag>
            <Tag>{data.priority}</Tag>
          </Space>
        </Col>
        <Col>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <RobotOutlined /> 由策略 Agent 基于归因报告自动生成
          </Text>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* 左侧：建议详情 */}
        <Col xs={24} lg={14}>
          {/* 建议卡片 */}
          <Card
            title={<Space><ThunderboltOutlined /> 优化建议</Space>}
            bordered={false}
            style={{ marginBottom: 16 }}
          >
            <Descriptions column={1} size="small" labelStyle={{ fontWeight: 500 }}>
              <Descriptions.Item label="问题">{data.problemDesc}</Descriptions.Item>
              <Descriptions.Item label="建议">{data.suggestion}</Descriptions.Item>
              <Descriptions.Item label="参考方向">{data.reference}</Descriptions.Item>
              <Descriptions.Item label="负责编辑">
                <Space>
                  <UserOutlined />
                  <Text strong>{data.editorName}</Text>
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 效果预估 */}
          <Card title="📈 效果预估" bordered={false} style={{ marginBottom: 16 }}>
            <Row gutter={24}>
              <Col span={8}>
                <Statistic
                  title="当前首启 UV"
                  value={data.estimatedEffect.currentFirstOpen}
                  suffix={`（${82}%）`}
                  valueStyle={{ color: '#4E5969' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="预估首启 UV"
                  value={data.estimatedEffect.estimatedFirstOpen}
                  suffix={`（${96}%）`}
                  valueStyle={{ color: '#165DFF', fontSize: 28 }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="提升幅度"
                  value={`+${data.estimatedEffect.improvementAbs}`}
                  suffix={`（+${data.estimatedEffect.improvementPct}%）`}
                  valueStyle={{ color: '#00B42A' }}
                />
              </Col>
            </Row>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              💡 预估依据：{data.estimatedEffect.basedOn}
            </Text>
          </Card>

          {/* 指标对比 */}
          <Card title="📊 执行前后对比" bordered={false}>
            <Row gutter={16}>
              {data.metricComparison.map((m, i) => (
                <Col span={8} key={i}>
                  <Statistic
                    title={m.label}
                    value={m.after}
                    suffix={m.unit}
                    valueStyle={{ color: '#00B42A', fontSize: 24 }}
                  />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    执行前: {m.before}{m.unit}
                  </Text>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        {/* 右侧：跟踪时间线 */}
        <Col xs={24} lg={10}>
          {/* 跟踪时间线 */}
          <Card title="⏱ 执行跟踪" bordered={false} style={{ marginBottom: 16 }}>
            <Steps
              direction="vertical"
              size="small"
              current={2}
              items={data.checkpoints.map((cp) => {
                const statusMap: Record<string, 'finish' | 'process' | 'wait' | 'error'> = {
                  done: 'finish',
                  current: 'process',
                  pending: 'wait',
                  warning: 'error',
                };
                return {
                  title: cp.label,
                  description: (
                    <div>
                      <Text style={{ fontSize: 11, color: '#86909C' }}>{cp.date}</Text>
                      <br />
                      <Text style={{ fontSize: 12 }}>{cp.note}</Text>
                    </div>
                  ),
                  status: statusMap[cp.status],
                  icon: cp.status === 'warning' ? <CloseCircleOutlined /> : undefined,
                };
              })}
            />
          </Card>

          {/* 事件时间线 */}
          <Card title="📋 操作日志" bordered={false} size="small">
            {data.timeline.map((t, i) => {
              const iconMap: Record<string, React.ReactNode> = {
                generate: <RobotOutlined />,
                push: <ThunderboltOutlined />,
                execute: <CheckCircleOutlined />,
                check: <ClockCircleOutlined />,
              };
              return (
                <div key={i} style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                  <Tag color="blue" style={{ fontSize: 10 }}>{iconMap[t.icon]}</Tag>
                  <div>
                    <Text style={{ fontSize: 11, color: '#86909C' }}>{t.date}</Text>
                    <br />
                    <Text style={{ fontSize: 12 }}>{t.event}</Text>
                  </div>
                </div>
              );
            })}
          </Card>
        </Col>
      </Row>

      {/* 底部操作 */}
      <Card bordered={false} style={{ marginTop: 16 }}>
        <Space>
          {data.status === 'S11' && (
            <>
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => message.success('建议已审核通过，已推送至编辑')}>审核通过并推送</Button>
              <Button danger onClick={() => message.info('建议已驳回')}>驳回并修改</Button>
            </>
          )}
          {data.status === 'S13' && (
            <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => navigate('/history')}>
              查看处理记录
            </Button>
          )}
          {data.status === 'S16' && (
            <>
              <Button type="primary" danger icon={<ExclamationCircleOutlined />} onClick={() => message.success('已再次提醒编辑')}>再次提醒编辑</Button>
              <Button onClick={() => message.success('已抄送组长')}>升级抄送组长</Button>
            </>
          )}
          <Button onClick={() => navigate('/attribution/ATTR-' + fmtToday() + '-002')}>返回归因报告</Button>
        </Space>
      </Card>
    </div>
  );
}

function fmtToday(): string {
  return new Date().toISOString().split('T')[0].replace(/-/g, '');
}

// ============================================================
// 策略列表视图（不带 suggestionId 时）
// ============================================================

function StrategyList({ onSelect }: { onSelect: (id: string) => void }) {
  const list = getStrategyList();
  const navigate = useNavigate();

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <ThunderboltOutlined style={{ fontSize: 20, color: '#722ED1' }} />
            <Title level={4} style={{ margin: 0 }}>策略建议列表</Title>
            <Tag color="blue"><RobotOutlined /> AI 生成</Tag>
          </Space>
        </Col>
      </Row>

      <List
        grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 2 }}
        dataSource={list}
        renderItem={(item) => {
          const statusColor = STATUS_COLORS[item.status] || '#86909C';
          return (
            <List.Item>
              <Card
                hoverable
                bordered={false}
                onClick={() => onSelect(item.suggestionId)}
              >
                <Space style={{ marginBottom: 8 }}>
                  <Tag color={item.priority === 'P0' ? 'red' : item.priority === 'P1' ? 'orange' : 'blue'}>
                    {item.priority}
                  </Tag>
                  <Tag color={statusColor}>{item.statusLabel}</Tag>
                </Space>

                <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
                  {item.problem}
                </Text>

                <Paragraph
                  type="secondary"
                  style={{ fontSize: 12, marginBottom: 12 }}
                  ellipsis={{ rows: 2 }}
                >
                  {item.suggestion}
                </Paragraph>

                <Descriptions size="small" column={2}>
                  <Descriptions.Item label="负责编辑">{item.editorName}</Descriptions.Item>
                  <Descriptions.Item label="预估效果">
                    <Text style={{ color: '#00B42A' }}>{item.effect}</Text>
                  </Descriptions.Item>
                </Descriptions>

                {/* 检查点状态 */}
                <Space size={4} style={{ marginTop: 12 }}>
                  {(['d1', 'd3', 'd7'] as const).map((k) => {
                    const status = item.checkpoints[k];
                    const color = status === 'done' ? '#00B42A' : status === 'current' ? '#165DFF' : status === 'warning' ? '#F53F3F' : '#C9CDD4';
                    const label = { d1: 'D+1', d3: 'D+3', d7: 'D+7' }[k];
                    return (
                      <Tooltip key={k} title={label}>
                        <div
                          style={{
                            width: 10, height: 10, borderRadius: '50%',
                            background: color,
                            border: status === 'current' ? '2px solid #165DFF' : undefined,
                            animation: status === 'current' ? 'alertPulse 2s infinite' : undefined,
                          }}
                        />
                      </Tooltip>
                    );
                  })}
                </Space>
              </Card>
            </List.Item>
          );
        }}
      />
    </div>
  );
}
