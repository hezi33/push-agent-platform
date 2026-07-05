import { useState, useMemo } from 'react';
import { Drawer, Tabs, Space, Typography, Statistic, Row, Col, Segmented, Button, Select, Tag, message } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined, ExportOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { KPICardData } from '../../types';
import { getTrendColor, getTrendArrow, CHART_COLORS } from '../../theme/colors';
import { generateTrend, generateDates, ALL_PROVINCES, ALL_VENDORS, ALL_SEND_TYPES } from '../../mocks/data/trendGenerator';

const { Text } = Typography;

interface MetricDetailDrawerProps { open: boolean; card: KPICardData | null; onClose: () => void; }

const TIME_OPTIONS = [
  { value: '7', label: '7天' }, { value: '30', label: '30天' }, { value: '90', label: '90天' },
  { value: '180', label: '半年' }, { value: '365', label: '一年' },
];

export default function MetricDetailDrawer({ open, card, onClose }: MetricDetailDrawerProps) {
  if (!card) return null;
  const [timeRange, setTimeRange] = useState('30');

  const days = parseInt(timeRange);
  const dates = useMemo(() => generateDates(days), [days]);
  const isPct = card.format === 'percentage';
  const suffix = isPct ? '%' : card.format === 'wan' ? ' 万' : '';
  const prec = isPct ? 2 : 0;
  const baseVal = isPct ? (card.metricKey === 'uv_open_rate' ? 3.90 : card.metricKey === 'pv_open_rate' ? 0.73 : 3) : card.yesterdayValue;
  const noise = isPct ? 0.03 : 0.06;

  const trendData = useMemo(
    () => generateTrend(card.metricKey, baseVal, noise, days, card.anomaly ? days - 1 : null, card.anomaly ? card.currentValue : undefined),
    [card.metricKey, baseVal, noise, days, card.anomaly, card.currentValue],
  );

  const color = getTrendColor(card.changePct, card.isPositiveGreen);
  const arrow = getTrendArrow(card.changePct);

  // 维度数据
  const dimData = useMemo(() => {
    const g = (offset: number) => +Number(card.currentValue * (1 + offset)).toFixed(isPct ? 2 : 0);
    return {
      vendors: ALL_VENDORS.map((n, i) => ({ name: n, current: g(-0.15 + i * 0.04), baseline: g(0.05 + i * 0.02) })),
      provinces: ALL_PROVINCES.map((n, i) => ({ name: n, current: g(-0.18 + i * 0.012), baseline: g(0.05 + i * 0.008) })),
      sendTypes: ALL_SEND_TYPES.map((n, i) => ({ name: n, current: g(-0.12 + i * 0.04), baseline: g(0.05 + i * 0.02) })),
    };
  }, [card.currentValue, isPct]);

  const barOption = (data: { name: string; current: number; baseline: number }[]) => ({
    color: ['#165DFF', '#E5E6EB'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 16, top: 16, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: data.map((d) => d.name), axisLabel: { fontSize: 10, rotate: data.length > 8 ? 45 : 0 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 }, splitLine: { lineStyle: { color: '#F2F3F5' } } },
    series: [
      { name: '当前值', type: 'bar', data: data.map((d) => d.current), barWidth: '60%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '基线值', type: 'bar', data: data.map((d) => d.baseline), barWidth: '60%', itemStyle: { borderRadius: [4, 4, 0, 0], opacity: 0.3 } },
    ],
  });

  return (
    <Drawer
      title={<Space><Text strong style={{ fontSize: 16 }}>{card.title} 详细分析</Text>{card.anomaly && <Tag color="error">异常</Tag>}</Space>}
      open={open} onClose={onClose} width={780}
      extra={<Button icon={<ExportOutlined />} size="small" onClick={() => message.info('导出 Excel 功能待后端接入')}>导出 Excel</Button>}
      bodyStyle={{ padding: '16px 24px' }}
      destroyOnClose
    >
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Statistic title="当前值" value={card.currentValue} precision={prec} suffix={suffix} valueStyle={{ color: card.anomaly ? '#F53F3F' : '#1D2129', fontSize: 22 }} /></Col>
        <Col span={6}><Statistic title="昨日值" value={card.yesterdayValue} precision={prec} suffix={suffix} /></Col>
        <Col span={6}><Statistic title="变化" value={Math.abs(card.changePct)} precision={1} suffix="%"
          prefix={arrow === '↑' ? <ArrowUpOutlined /> : arrow === '↓' ? <ArrowDownOutlined /> : <ArrowRightOutlined />}
          valueStyle={{ color, fontSize: 20 }} /></Col>
        <Col span={6}><Statistic title="基线均值" value={isPct ? baseVal : card.yesterdayValue} precision={prec} suffix={suffix} /></Col>
      </Row>

      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col><Text strong style={{ fontSize: 14 }}>📈 趋势图</Text></Col>
          <Col><Segmented size="small" value={timeRange} onChange={(v) => setTimeRange(v as string)} options={TIME_OPTIONS} /></Col>
        </Row>
        <div style={{ height: 300, background: '#F7F8FA', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ReactECharts option={{
            color: ['#165DFF'],
            tooltip: { trigger: 'axis' },
            grid: { left: 50, right: 20, top: 20, bottom: 40 },
            xAxis: { type: 'category', data: dates.map((d) => d.slice(5)), axisLabel: { fontSize: 10 } },
            yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
            series: [{ name: card.title, type: 'line', data: trendData, smooth: true }],
          }} style={{ height: 300, width: '100%' }} />
        </div>
      </div>

      <div>
        <Text strong style={{ fontSize: 14, marginBottom: 12, display: 'block' }}>📊 多维度对比</Text>
        <Tabs
          defaultActiveKey="vendors"
          items={[
            { key: 'vendors', label: '按厂商', children: <ReactECharts option={barOption(dimData.vendors)} style={{ height: 280 }} /> },
            { key: 'provinces', label: `按省份 (${ALL_PROVINCES.length})`, children: <ReactECharts option={barOption(dimData.provinces)} style={{ height: 400 }} /> },
            { key: 'sendTypes', label: '按发送类型', children: <ReactECharts option={barOption(dimData.sendTypes)} style={{ height: 260 }} /> },
          ]}
        />
      </div>
    </Drawer>
  );
}

