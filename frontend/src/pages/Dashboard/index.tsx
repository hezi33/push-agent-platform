import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Statistic, Table, Tag, Space, Typography, Spin, Tooltip, Segmented,
} from 'antd';
import {
  ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined,
  ExclamationCircleOutlined, WarningOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import TrendLineChart from '../../components/charts/TrendLineChart';
import FunnelSankey from '../../components/charts/FunnelSankey';
import AgentStatusBar, { AIDetectedBadge, AgentThinkingBadge } from '../../components/common/AgentStatusBar';
import MetricDetailDrawer from '../../components/common/MetricDetailDrawer';
import { useWorkbenchStore } from '../../stores/workbench';
import { mockDashboardData } from '../../mocks/data/dashboard';
import { randomPastTime } from '../../hooks/useRelativeTime';
import type { AlertItem, KPICardData } from '../../types';
import {
  ALERT_LEVEL_COLORS, ALERT_LEVEL_LABELS, STATUS_LABELS, STATUS_COLORS,
  getTrendColor, getTrendArrow,
} from '../../theme/colors';

const { Text } = Typography;

// ============================================================
// Dashboard 数据看板首页（丰富版）
// ============================================================

export default function Dashboard() {
  const navigate = useNavigate();

  // KPI 详情 Drawer
  const [drawerCard, setDrawerCard] = useState<KPICardData | null>(null);
  // 趋势图时间范围
  const [trendDays, setTrendDays] = useState<string>('7');

  // 动态生成"上次巡检时间"——每次渲染都不一样，且在 30s~5min 前随机
  const lastScanTime = useMemo(() => randomPastTime(30, 300), []);

  // 使用 TanStack Query 获取数据（当前用 Mock 直接赋值）
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      // 模拟 API 调用，后续接入真实 API 时只改这里
      await new Promise((r) => setTimeout(r, 400));
      return mockDashboardData;
    },
    refetchInterval: 5 * 60 * 1000, // 5 分钟自动刷新
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!data) return null;

  const unreadAlerts = data.alertList.filter((a) => !a.isRead).length;

  return (
    <div>
      {/* ── 🤖 Agent 状态栏 ── */}
      <AgentStatusBar
        lastScanTime={lastScanTime}
        dimensionsCovered={3650}
        activeAlerts={data.alertList.filter((a) => a.level !== 'S03').length}
      />

      {/* ── KPI 数据卡片 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {data.kpiCards.map((card) => (
          <Col xs={24} sm={12} lg={8} xl={4} key={card.metricKey}>
            <KPICard
              card={card}
              onClick={() => setDrawerCard(card)}
            />
          </Col>
        ))}
      </Row>

      {/* ── 图表区 ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card
            title="核心指标趋势"
            extra={
              <Segmented size="small" value={trendDays} onChange={(v) => setTrendDays(v as string)}
                options={[{ value: '7', label: '7天' }, { value: '14', label: '14天' }, { value: '30', label: '30天' }]} />
            }
            bordered={false}
          >
            <TrendLineChart
              dates={data.trendData.dates}
              series={data.trendData.series}
            />
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="漏斗转化概览（今日）" bordered={false}>
            <FunnelSankey
              stages={[
                { name: '发送', uv: 25800000, rate: '100%' },
                { name: '到达', uv: 17500000, rate: '67.8%' },
                { name: '展示', uv: 7520000, rate: '43.0%' },
                { name: '打开', uv: 255680, rate: '3.40%' },
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* ── KPI 详情侧拉 Drawer ── */}
      <MetricDetailDrawer open={!!drawerCard} card={drawerCard} onClose={() => setDrawerCard(null)} />

      {/* ── 异常告警列表 ── */}
      <Card
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#F53F3F' }} />
            <span>异常告警列表</span>
            <Tag color="red">{unreadAlerts} 条未读</Tag>
            <AIDetectedBadge />
          </Space>
        }
        bordered={false}
      >
        <Table<AlertItem>
          dataSource={data.alertList}
          rowKey="alertId"
          size="middle"
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record) => ({
            onClick: () => {
              useWorkbenchStore.getState().setAlertContext({
                level: record.level,
                metric: record.metricLabel,
                dim: [record.dimension.vendor, record.dimension.province, record.dimension.sendType].filter((d) => d !== 'all').join(' · ') || '全平台',
                loss: record.estimatedLoss,
              });
              navigate(`/workbench?alertId=${record.alertId}`);
            },
            style: { cursor: 'pointer', background: record.isRead ? undefined : '#FFF7F5' },
          })}
          columns={alertColumns}
        />
      </Card>
    </div>
  );
}

// ============================================================
// KPI 数据卡片子组件
// ============================================================

function KPICard({ card, onClick }: { card: KPICardData; onClick: () => void }) {
  const color = getTrendColor(card.changePct, card.isPositiveGreen);
  const arrow = getTrendArrow(card.changePct);

  // 迷你趋势图配置（卡片内 sparkline）
  const sparklineOption = {
    grid: { left: 0, right: 0, top: 8, bottom: 0 },
    xAxis: { show: false, data: card.trendData.map((_, i) => i) },
    yAxis: { show: false, min: Math.min(...card.trendData) * 0.95, max: Math.max(...card.trendData) * 1.05 },
    series: [{
      type: 'line',
      data: card.trendData,
      smooth: true,
      showSymbol: false,
      lineStyle: { width: 2, color: card.anomaly ? '#F53F3F' : '#165DFF' },
      areaStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: card.anomaly ? 'rgba(245,63,63,0.15)' : 'rgba(22,93,255,0.1)' },
            { offset: 1, color: 'rgba(255,255,255,0)' },
          ],
        },
      },
    }],
  };

  return (
    <Card
      hoverable
      onClick={onClick}
      bordered={false}
      style={{
        borderLeft: card.anomaly ? '3px solid #F53F3F' : undefined,
        borderRadius: 8,
      }}
      bodyStyle={{ padding: '16px 20px' }}
    >
      <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>
        {card.title}
        {card.anomaly && (
          <Tooltip title="指标异常，点击查看详情">
            <ExclamationCircleOutlined style={{ color: '#F53F3F', marginLeft: 6 }} />
          </Tooltip>
        )}
      </Text>

      <Statistic
        value={card.currentValue}
        precision={card.format === 'percentage' ? 2 : 0}
        suffix={card.format === 'percentage' ? '%' : card.format === 'wan' ? ' 万' : undefined}
        valueStyle={{
          fontSize: card.format === 'percentage' ? 28 : 24,
          fontWeight: 600,
          color: card.anomaly ? '#F53F3F' : '#1D2129',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <Space size={4}>
          {arrow === '↑' ? (
            <ArrowUpOutlined style={{ fontSize: 12, color }} />
          ) : arrow === '↓' ? (
            <ArrowDownOutlined style={{ fontSize: 12, color }} />
          ) : (
            <ArrowRightOutlined style={{ fontSize: 12, color }} />
          )}
          <Text style={{ fontSize: 12, color, fontWeight: 500 }}>
            {Math.abs(card.changePct).toFixed(1)}%
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>vs 昨日</Text>
        </Space>
      </div>

      {/* 迷你趋势图 */}
      <div style={{ marginTop: 8, height: 40 }}>
        <ReactECharts option={sparklineOption} style={{ height: 40 }} notMerge />
      </div>
    </Card>
  );
}

// ============================================================
// 告警列表表格列定义
// ============================================================

const alertColumns: ColumnsType<AlertItem> = [
  {
    title: '严重程度',
    dataIndex: 'level',
    key: 'level',
    width: 90,
    render: (level: string) => {
      const iconMap: Record<string, React.ReactNode> = {
        S05: <ExclamationCircleOutlined />,
        S04: <WarningOutlined />,
        S03: <InfoCircleOutlined />,
      };
      return (
        <Tag color={ALERT_LEVEL_COLORS[level]} icon={iconMap[level]}>
          {ALERT_LEVEL_LABELS[level]}
        </Tag>
      );
    },
    sorter: (a, b) => b.deviationSigma - a.deviationSigma,
  },
  {
    title: '异常指标',
    key: 'metric',
    width: 180,
    render: (_: unknown, record: AlertItem) => (
      <Space direction="vertical" size={0}>
        <Text strong style={{ fontSize: 13 }}>{record.metricLabel}</Text>
        <Text
          style={{
            fontSize: 12,
            color: record.changePct < 0 ? '#F53F3F' : '#00B42A',
          }}
        >
          {getTrendArrow(record.changePct)} {Math.abs(record.changePct).toFixed(1)}%
          <Text type="secondary" style={{ fontSize: 11 }}>
            {' '}({record.currentValue}% vs {record.baselineValue}%)
          </Text>
        </Text>
      </Space>
    ),
  },
  {
    title: '影响维度',
    key: 'dimension',
    width: 200,
    render: (_: unknown, record: AlertItem) => (
      <Space size={4} wrap>
        {record.dimension.sendType !== 'all' && (
          <Tag style={{ fontSize: 11 }}>{record.dimension.sendType}</Tag>
        )}
        {record.dimension.vendor !== 'all' && (
          <Tag color="blue" style={{ fontSize: 11 }}>{record.dimension.vendor}</Tag>
        )}
        {record.dimension.province !== 'all' && (
          <Tag color="purple" style={{ fontSize: 11 }}>{record.dimension.province}</Tag>
        )}
        {record.dimension.platform !== 'all' && (
          <Tag color="cyan" style={{ fontSize: 11 }}>{record.dimension.platform}</Tag>
        )}
      </Space>
    ),
  },
  {
    title: '偏离度',
    dataIndex: 'deviationSigma',
    key: 'sigma',
    width: 80,
    render: (sigma: number) => (
      <Text style={{ color: sigma >= 3 ? '#F53F3F' : sigma >= 2 ? '#FF7D00' : '#F7BA1E', fontWeight: 500 }}>
        {sigma.toFixed(1)}σ
      </Text>
    ),
    sorter: (a, b) => b.deviationSigma - a.deviationSigma,
  },
  {
    title: '影响预估',
    dataIndex: 'estimatedLoss',
    key: 'loss',
    width: 120,
    render: (loss: number) =>
      loss > 0 ? (
        <Text style={{ color: '#F53F3F', fontSize: 12 }}>
          损失 ~{loss.toLocaleString()} 首启
        </Text>
      ) : (
        <Text type="secondary">—</Text>
      ),
  },
  {
    title: '发现时间',
    dataIndex: 'detectedAt',
    key: 'time',
    width: 120,
    render: (time: string) => {
      const d = new Date(time);
      const now = new Date();
      const hoursAgo = Math.floor((now.getTime() - d.getTime()) / 3600000);
      return (
        <Space direction="vertical" size={0}>
          <Text style={{ fontSize: 12 }}>{d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {hoursAgo < 1 ? '刚刚' : `${hoursAgo} 小时前`}
          </Text>
        </Space>
      );
    },
    sorter: (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
    defaultSortOrder: 'descend',
  },
  {
    title: 'AI 检测',
    key: 'ai',
    width: 100,
    render: (_: unknown, record: AlertItem) => (
      <Space>
        <AIDetectedBadge />
        <AgentThinkingBadge status={record.attributionStatus} />
      </Space>
    ),
  },
  {
    title: '归因状态',
    dataIndex: 'attributionStatus',
    key: 'status',
    width: 110,
    render: (status: string | null) => {
      if (!status) return <Tag>未触发</Tag>;
      return (
        <Tag color={STATUS_COLORS[status]}>
          {STATUS_LABELS[status] || status}
        </Tag>
      );
    },
  },
];
