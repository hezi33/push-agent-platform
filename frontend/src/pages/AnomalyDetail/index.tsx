import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Row, Col, Card, Tag, Space, Typography, Button, Descriptions, Timeline, Tabs, Spin, Result, message,
} from 'antd';
import {
  ArrowLeftOutlined, SearchOutlined, BellOutlined, ThunderboltOutlined,
  ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined,
  RobotOutlined, ClockCircleOutlined, CheckCircleOutlined, SyncOutlined,
} from '@ant-design/icons';
import DeviationTrendChart from '../../components/charts/DeviationTrendChart';
import DimensionCompareChart from '../../components/charts/DimensionCompareChart';
import { getAnomalyDetail, type AnomalyDetailData } from '../../mocks/data/anomaly';
import {
  ALERT_LEVEL_COLORS,
  ALERT_LEVEL_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  getTrendArrow,
} from '../../theme/colors';
import { useRelativeTime } from '../../hooks/useRelativeTime';

const { Text, Title, Paragraph } = Typography;

// ============================================================
// 异常详情页
// ============================================================

export default function AnomalyDetail() {
  const { alertId } = useParams<{ alertId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromWorkbench = searchParams.get('from') === 'workbench';

  if (!alertId) {
    return (
      <Card bordered={false}>
        <Result
          status="warning"
          title="未指定告警 ID"
          extra={<Button onClick={() => navigate('/dashboard')}>返回看板</Button>}
        />
      </Card>
    );
  }

  const data = getAnomalyDetail(alertId);
  if (!data) return null;

  return (
    <div>
      {/* ── 面包屑 ── */}
      <Space style={{ marginBottom: 16 }}>
        {fromWorkbench ? (
          <Button type="primary" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workbench')}>
            返回 Agent 工作台
          </Button>
        ) : (
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>
            返回看板
          </Button>
        )}
        <Text type="secondary">/</Text>
        <Button type="link" style={{ padding: 0, fontSize: 14, fontWeight: 600, height: 'auto' }} onClick={() => navigate('/dashboard')}>
          异常详情
        </Button>
        <Text type="secondary">/</Text>
        <Text strong>{alertId}</Text>
      </Space>

      {/* ── 告警摘要横幅 ── */}
      <AlertBanner data={data} onTriggerAttribution={() => navigate(`/attribution/new?alertId=${alertId}`)} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {/* ── 偏离度趋势图 ── */}
        <Col xs={24} lg={16}>
          <Card title={`📈 ${data.metricLabel}趋势（近 30 天）`} bordered={false}>
            <DeviationTrendChart
              dates={data.trendData.dates}
              actual={data.trendData.actual}
              baseline={data.trendData.baseline}
              upperBound={data.trendData.upperBound}
              lowerBound={data.trendData.lowerBound}
              yAxisLabel="%"
            />
          </Card>
        </Col>

        {/* ── 事件时间线 ── */}
        <Col xs={24} lg={8}>
          <Card title="⏱ 处理时间线" bordered={false} style={{ height: '100%' }}>
            <Timeline
              items={data.timeline.map((item) => {
                const iconMap: Record<string, React.ReactNode> = {
                  detect: <RobotOutlined style={{ fontSize: 13 }} />,
                  alert: <BellOutlined style={{ fontSize: 13 }} />,
                  attribution: <SearchOutlined style={{ fontSize: 13 }} />,
                  strategy: <ThunderboltOutlined style={{ fontSize: 13 }} />,
                  action: <CheckCircleOutlined style={{ fontSize: 13 }} />,
                };

                const colorMap: Record<string, string> = {
                  detect: '#165DFF',
                  alert: '#F53F3F',
                  attribution: '#FF7D00',
                  strategy: '#722ED1',
                  action: '#00B42A',
                };

                return {
                  color: colorMap[item.icon] || '#165DFF',
                  dot: iconMap[item.icon],
                  children: (
                    <div>
                      <Text style={{ fontSize: 12, color: '#86909C' }}>
                        {new Date(item.time).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <br />
                      <Text style={{ fontSize: 13 }}>{item.event}</Text>
                    </div>
                  ),
                };
              })}
            />
          </Card>
        </Col>
      </Row>

      {/* ── 多维度对比 ── */}
      <Card title="📊 多维度对比" bordered={false} style={{ marginTop: 16 }}>
        <Tabs
          defaultActiveKey="vendors"
          items={[
            {
              key: 'vendors',
              label: '厂商',
              children: (
                <DimensionCompareChart
                  title="各厂商对比"
                  data={data.dimensionComparison.vendors}
                />
              ),
            },
            {
              key: 'provinces',
              label: '省份',
              children: (
                <DimensionCompareChart
                  title="Top 省份对比"
                  data={data.dimensionComparison.provinces}
                />
              ),
            },
            {
              key: 'sendTypes',
              label: '发送类型',
              children: (
                <DimensionCompareChart
                  title="各发送类型对比"
                  data={data.dimensionComparison.sendTypes}
                />
              ),
            },
            {
              key: 'platforms',
              label: '平台',
              children: (
                <DimensionCompareChart
                  title="各平台对比"
                  data={data.dimensionComparison.platforms}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

// ============================================================
// 告警摘要横幅子组件
// ============================================================

function AlertBanner({ data, onTriggerAttribution }: { data: AnomalyDetailData; onTriggerAttribution: () => void }) {
  const navigate = useNavigate();
  const relativeTime = useRelativeTime(data.detectedAt);
  const iconMap: Record<string, React.ReactNode> = {
    S05: <ExclamationCircleOutlined />,
    S04: <WarningOutlined />,
    S03: <InfoCircleOutlined />,
  };
  const arrow = getTrendArrow(data.changePct);

  const isAttributionDone = data.attributionStatus === 'S08';
  const isAttributing = data.attributionStatus === 'S07';

  return (
    <Card
      bordered={false}
      style={{
        borderLeft: `4px solid ${ALERT_LEVEL_COLORS[data.level] || '#F53F3F'}`,
        borderRadius: 8,
      }}
    >
      <Row align="top" justify="space-between">
        <Col flex="auto">
          {/* 严重程度 + 标题 */}
          <Space size="middle" style={{ marginBottom: 12 }}>
            <Tag
              color={ALERT_LEVEL_COLORS[data.level]}
              icon={iconMap[data.level]}
              style={{ fontSize: 13, padding: '2px 10px' }}
            >
              {ALERT_LEVEL_LABELS[data.level]}
            </Tag>
            <Title level={4} style={{ margin: 0 }}>{data.title}</Title>
            <Tag icon={<ClockCircleOutlined />} color="default">{relativeTime}</Tag>
          </Space>

          <Paragraph style={{ color: '#4E5969', marginBottom: 16, fontSize: 14 }}>
            {data.summary}
          </Paragraph>

          {/* 关键指标描述 */}
          <Descriptions size="small" column={4} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="当前值">
              <Text strong style={{ color: '#F53F3F', fontSize: 16 }}>
                {data.currentValue}%
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="基线值">
              <Text>{data.baselineValue}%</Text>
            </Descriptions.Item>
            <Descriptions.Item label="变化幅度">
              <Text style={{ color: '#F53F3F', fontWeight: 500 }}>
                {arrow} {Math.abs(data.changePct).toFixed(1)}%
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="偏离度">
              <Text style={{ color: '#F53F3F', fontWeight: 600 }}>
                {data.deviationSigma.toFixed(1)}σ
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="影响维度">
              <Space size={4} wrap>
                <Tag>{data.dimension.sendType}</Tag>
                {data.dimension.vendor !== 'all' && <Tag color="blue">{data.dimension.vendor}</Tag>}
                {data.dimension.province !== 'all' && <Tag color="purple">{data.dimension.province}</Tag>}
                {data.dimension.platform !== 'all' && <Tag color="cyan">{data.dimension.platform}</Tag>}
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="影响预估">
              <Text style={{ color: '#F53F3F' }}>
                损失 ~{data.estimatedLoss.toLocaleString()} 首启
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="归因状态">
              {data.attributionStatus ? (
                <Tag color={STATUS_COLORS[data.attributionStatus]}>
                  {STATUS_LABELS[data.attributionStatus]}
                </Tag>
              ) : (
                <Tag>未触发</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="发现时间">
              <Text>{new Date(data.detectedAt).toLocaleString('zh-CN')}</Text>
            </Descriptions.Item>
          </Descriptions>

          {/* 操作按钮 */}
          <Space>
            {isAttributing ? (
              <Button type="primary" icon={<SyncOutlined spin />} disabled>
                Agent 归因中...
              </Button>
            ) : isAttributionDone ? (
              <Button type="primary" icon={<SearchOutlined />} onClick={() => navigate(`/attribution/ATTR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-002?from=workbench`)}>
                查看归因报告
              </Button>
            ) : (
              <Button type="primary" icon={<SearchOutlined />} onClick={() => navigate('/workbench?alertId=' + data.alertId)}>
                在 Agent 工作台中分析
              </Button>
            )}
            <Button icon={<BellOutlined />} onClick={() => message.success('已订阅该告警的状态更新')}>
              订阅更新
            </Button>
            <Button danger onClick={() => message.info('告警已忽略')}>
              忽略告警
            </Button>
          </Space>
        </Col>

        {/* Agent 标识 */}
        <Col>
          <Space direction="vertical" align="center" style={{ padding: '12px 16px', background: '#F7F8FA', borderRadius: 8 }}>
            <RobotOutlined style={{ fontSize: 24, color: '#165DFF' }} />
            <Text style={{ fontSize: 11, color: '#86909C' }}>监控 Agent</Text>
            <Tag color="green" style={{ fontSize: 10 }}>AI 检测</Tag>
          </Space>
        </Col>
      </Row>
    </Card>
  );
}
