import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Row, Col, Card, Table, Tag, Space, Typography, Button, Select, DatePicker, Input, Statistic,
} from 'antd';
import {
  HistoryOutlined,
  SearchOutlined,
  ExportOutlined,
  FilterOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { mockAlertList } from '../../mocks/data/dashboard';
import { getStrategyList } from '../../mocks/data/strategy';
import type { AlertItem } from '../../types';
import {
  ALERT_LEVEL_COLORS,
  ALERT_LEVEL_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from '../../theme/colors';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;

// ============================================================
// 处理记录页
// ============================================================

export default function History() {
  const navigate = useNavigate();

  // 筛选状态
  const [levelFilter, setLevelFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [keyword, setKeyword] = useState('');

  const alerts = useMemo(() => {
    let filtered = [...mockAlertList];
    if (levelFilter.length > 0) {
      filtered = filtered.filter((a) => levelFilter.includes(a.level));
    }
    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.metricLabel.includes(kw) ||
          a.dimension.vendor.includes(kw) ||
          a.dimension.province.includes(kw) ||
          a.summary.includes(kw)
      );
    }
    return filtered;
  }, [levelFilter, keyword]);

  // 统计
  const stats = useMemo(() => {
    const total = alerts.length;
    const critical = alerts.filter((a) => a.level === 'S05').length;
    const warning = alerts.filter((a) => a.level === 'S04').length;
    const notice = alerts.filter((a) => a.level === 'S03').length;
    const unresolved = alerts.filter((a) => a.attributionStatus !== 'S08' && a.attributionStatus !== null).length;
    return { total, critical, warning, notice, unresolved };
  }, [alerts]);

  return (
    <div>
      {/* 标题 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <HistoryOutlined style={{ fontSize: 20, color: '#165DFF' }} />
            <Title level={4} style={{ margin: 0 }}>处理记录</Title>
          </Space>
        </Col>
        <Col>
          <Button icon={<ExportOutlined />}>导出 Excel</Button>
        </Col>
      </Row>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" bordered={false}>
            <Statistic title="全部告警" value={stats.total} valueStyle={{ fontSize: 24 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bordered={false} style={{ borderLeft: '3px solid #F53F3F' }}>
            <Statistic title="严重" value={stats.critical} valueStyle={{ color: '#F53F3F', fontSize: 24 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bordered={false} style={{ borderLeft: '3px solid #FF7D00' }}>
            <Statistic title="告警" value={stats.warning} valueStyle={{ color: '#FF7D00', fontSize: 24 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bordered={false} style={{ borderLeft: '3px solid #F7BA1E' }}>
            <Statistic title="关注" value={stats.notice} valueStyle={{ color: '#F7BA1E', fontSize: 24 }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" bordered={false} style={{ borderLeft: '3px solid #165DFF' }}>
            <Statistic title="处理中" value={stats.unresolved} valueStyle={{ color: '#165DFF', fontSize: 24 }} />
          </Card>
        </Col>
      </Row>

      {/* 筛选栏 */}
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <FilterOutlined style={{ marginRight: 8, color: '#86909C' }} />
          </Col>
          <Col>
            <Select
              mode="multiple"
              placeholder="严重程度"
              style={{ width: 180 }}
              value={levelFilter}
              onChange={setLevelFilter}
              allowClear
              options={[
                { value: 'S05', label: '严重' },
                { value: 'S04', label: '告警' },
                { value: 'S03', label: '关注' },
              ]}
            />
          </Col>
          <Col>
            <RangePicker placeholder={['开始日期', '结束日期']} />
          </Col>
          <Col flex="auto">
            <Input
              placeholder="搜索指标、厂商、省份..."
              prefix={<SearchOutlined />}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Text type="secondary" style={{ fontSize: 12 }}>
              共 {alerts.length} 条记录
            </Text>
          </Col>
        </Row>
      </Card>

      {/* 数据表格 */}
      <Card bordered={false}>
        <Table<AlertItem>
          dataSource={alerts}
          rowKey="alertId"
          size="middle"
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          onRow={(record) => ({
            onClick: () => navigate(`/anomaly/${record.alertId}`),
            style: { cursor: 'pointer' },
          })}
          columns={historyColumns}
        />
      </Card>
    </div>
  );
}

const historyColumns: ColumnsType<AlertItem> = [
  {
    title: '时间', dataIndex: 'detectedAt', key: 'time', width: 160,
    render: (t: string) => new Date(t).toLocaleString('zh-CN'),
    sorter: (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime(),
    defaultSortOrder: 'descend',
  },
  {
    title: '严重程度', dataIndex: 'level', key: 'level', width: 90,
    render: (level: string) => {
      const iconMap: Record<string, React.ReactNode> = { S05: <ExclamationCircleOutlined />, S04: <WarningOutlined />, S03: <InfoCircleOutlined /> };
      return <Tag color={ALERT_LEVEL_COLORS[level]} icon={iconMap[level]}>{ALERT_LEVEL_LABELS[level]}</Tag>;
    },
  },
  {
    title: '异常指标', key: 'metric', width: 180,
    render: (_: unknown, r: AlertItem) => (
      <Space direction="vertical" size={0}>
        <Text strong style={{ fontSize: 13 }}>{r.metricLabel}</Text>
        <Text style={{ fontSize: 12, color: r.changePct < 0 ? '#F53F3F' : '#00B42A' }}>
          {r.changePct > 0 ? '↑' : '↓'} {Math.abs(r.changePct)}% (σ={r.deviationSigma})
        </Text>
      </Space>
    ),
  },
  {
    title: '影响维度', key: 'dim', width: 180,
    render: (_: unknown, r: AlertItem) => (
      <Space size={4} wrap>
        {r.dimension.sendType !== 'all' && <Tag style={{ fontSize: 11 }}>{r.dimension.sendType}</Tag>}
        {r.dimension.vendor !== 'all' && <Tag color="blue" style={{ fontSize: 11 }}>{r.dimension.vendor}</Tag>}
        {r.dimension.province !== 'all' && <Tag color="purple" style={{ fontSize: 11 }}>{r.dimension.province}</Tag>}
      </Space>
    ),
  },
  {
    title: '归因结果', key: 'attribution', width: 200,
    render: (_: unknown, r: AlertItem) => {
      if (!r.attributionStatus) return <Text type="secondary">—</Text>;
      return (
        <Space direction="vertical" size={0}>
          <Tag color={STATUS_COLORS[r.attributionStatus]}>{STATUS_LABELS[r.attributionStatus]}</Tag>
          <Text style={{ fontSize: 11, color: '#86909C' }} ellipsis>{r.summary.slice(0, 40)}...</Text>
        </Space>
      );
    },
  },
  {
    title: '操作', key: 'action', width: 100,
    render: (_: unknown, r: AlertItem) => (
      <Button type="link" size="small" onClick={(e) => { e.stopPropagation(); navigate(`/anomaly/${r.alertId}`); }}>
        查看详情
      </Button>
    ),
  },
];
