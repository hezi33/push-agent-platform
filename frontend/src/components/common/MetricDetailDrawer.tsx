import { useState, useEffect, useMemo } from 'react';
import { Drawer, Tabs, Space, Typography, Statistic, Row, Col, Segmented, Button, Select, Tag, message } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined, ExportOutlined, DownloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { KPICardData } from '../../types';
import { getTrendColor, getTrendArrow, CHART_COLORS } from '../../theme/colors';
import { generateTrend, generateDates, ALL_PROVINCES, ALL_VENDORS, ALL_SEND_TYPES } from '../../mocks/data/trendGenerator';

const { Text, Title } = Typography;

interface MetricDetailDrawerProps {
  open: boolean;
  card: KPICardData | null;
  onClose: () => void;
}

const TIME_OPTIONS = [
  { value: '7d', label: '7天' },
  { value: '30d', label: '30天' },
  { value: '90d', label: '90天' },
  { value: '180d', label: '半年' },
  { value: '365d', label: '一年' },
];

export default function MetricDetailDrawer({ open, card, onClose }: MetricDetailDrawerProps) {
  const [timeRange, setTimeRange] = useState('30d');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [provinceFilter, setProvinceFilter] = useState('all');

  // 重置筛选（打开新卡片时）
  useEffect(() => {
    if (open) { setTimeRange('30d'); setVendorFilter('all'); setProvinceFilter('all'); }
  }, [open, card?.metricKey]);

  if (!card) return null;

  const days = parseInt(timeRange);
  const dates = useMemo(() => generateDates(days), [days]);
  const isPct = card.format === 'percentage';
  const suffix = isPct ? '%' : card.format === 'wan' ? ' 万' : '';
  const prec = isPct ? 2 : 0;
  const baseValue = isPct ? (card.metricKey === 'uv_open_rate' ? 3.90 : card.metricKey === 'pv_open_rate' ? 0.73 : 3) : card.yesterdayValue;
  const noisePct = isPct ? 0.03 : 0.06;
  const anomalyIdx = card.anomaly ? days - 1 : null;

  // ✅ 用统一生成器——和卡片迷你图一致
  const trendData = useMemo(
    () => generateTrend(card.metricKey, baseValue, noisePct, days, anomalyIdx, anomalyIdx !== null ? card.currentValue : undefined),
    [card.metricKey, baseValue, noisePct, days, anomalyIdx, card.currentValue],
  );

  const color = getTrendColor(card.changePct, card.isPositiveGreen);
  const arrow = getTrendArrow(card.changePct);

  // 按维度生成对比（用同一生成器做种子偏移）
  const dimData = useMemo(() => {
    const gen = (keySeed: string, offset: number) => {
      const val = card.currentValue * (1 + offset);
      return +val.toFixed(isPct ? 2 : 0);
    };
    return {
      vendors: ALL_VENDORS.map((name, i) => ({ name, current: gen('v_' + i, -0.15 + i * 0.04), baseline: gen('vb_' + i, 0.05 + i * 0.02) })),
      provinces: ALL_PROVINCES.map((name, i) => ({ name, current: gen('p_' + i, -0.18 + i * 0.015), baseline: gen('pb_' + i, 0.05 + i * 0.01) })),
      sendTypes: ALL_SEND_TYPES.map((name, i) => ({ name, current: gen('s_' + i, -0.12 + i * 0.04), baseline: gen('sb_' + i, 0.05 + i * 0.02) })),
    };
  }, [card.currentValue, card.metricKey, isPct]);

  // 趋势图
  const trendOption = {
    color: [CHART_COLORS[0], '#C9CDD4'],
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: dates.map((d) => d.slice(5)), axisLabel: { fontSize: 10, color: '#86909C', rotate: days > 90 ? 45 : 0, interval: days > 90 ? Math.floor(days / 20) : 0 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#86909C', formatter: `{value}${suffix}` }, splitLine: { lineStyle: { color: '#F2F3F5' } } },
    series: [{
      name: card.title, type: 'line', data: trendData, smooth: true, symbol: 'none',
      lineStyle: { width: 2 },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(22,93,255,0.08)' }, { offset: 1, color: 'rgba(255,255,255,0)' }] } },
      markLine: days > 7 ? { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: '#86909C', width: 1 }, label: { fontSize: 10, color: '#86909C', formatter: '基线 {c}' }, data: [{ yAxis: baseValue, name: '基线' }] } : undefined,
    }],
    ...(card.anomaly ? {
      markPoints: { data: [{ coord: [days - 1, card.currentValue], symbol: 'pin', symbolSize: 30, itemStyle: { color: '#F53F3F' }, label: { formatter: `${card.currentValue}${suffix}`, fontSize: 10, color: '#F53F3F' } }] },
    } : {}),
  };

  // 维度柱状图
  const barOption = (data: { name: string; current: number; baseline: number }[]) => ({
    color: ['#165DFF', '#E5E6EB'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 }, data: ['当前值', '基线值'] },
    grid: { left: 8, right: 16, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category', data: data.map((d) => d.name),
      axisLabel: { fontSize: 10, rotate: data.length > 8 ? 45 : 0, interval: 0 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: `{value}${suffix}` }, splitLine: { lineStyle: { color: '#F2F3F5' } } },
    series: [
      { name: '当前值', type: 'bar', data: data.map((d) => d.current), barWidth: data.length > 10 ? '60%' : '35%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '基线值', type: 'bar', data: data.map((d) => d.baseline), barWidth: data.length > 10 ? '60%' : '35%', itemStyle: { borderRadius: [4, 4, 0, 0], opacity: 0.3 } },
    ],
  });

  return (
    <Drawer
      title={<Space><Text strong style={{ fontSize: 16 }}>{card.title} 详细分析</Text>{card.anomaly && <Tag color="error">异常</Tag>}</Space>}
      open={open} onClose={onClose} width={780}
      extra={
        <Button icon={<ExportOutlined />} size="small" onClick={() => message.info('导出 Excel 功能待后端接入')}>导出 Excel</Button>
      }
      styles={{ body: { padding: '16px 24px' } }}
    >
      {/* 概览 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}><Statistic title="当前值" value={card.currentValue} precision={prec} suffix={suffix} valueStyle={{ color: card.anomaly ? '#F53F3F' : '#1D2129', fontSize: 22 }} /></Col>
        <Col span={6}><Statistic title="昨日值" value={card.yesterdayValue} precision={prec} suffix={suffix} valueStyle={{ fontSize: 20 }} /></Col>
        <Col span={6}><Statistic title="变化" value={Math.abs(card.changePct)} precision={1} suffix="%" prefix={arrow === '↑' ? <ArrowUpOutlined /> : arrow === '↓' ? <ArrowDownOutlined /> : <ArrowRightOutlined />} valueStyle={{ color, fontSize: 20 }} /></Col>
        <Col span={6}><Statistic title="基线均值" value={isPct ? baseValue : card.yesterdayValue} precision={prec} suffix={suffix} valueStyle={{ fontSize: 20 }} /></Col>
      </Row>

      {/* 趋势图 + 筛选 */}
      <div style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col><Text strong style={{ fontSize: 14 }}>📈 趋势图</Text></Col>
          <Col>
            <Space size={8}>
              <Segmented size="small" value={timeRange} onChange={(v) => setTimeRange(v as string)} options={TIME_OPTIONS} />
            </Space>
          </Col>
        </Row>
        <ReactECharts option={trendOption} style={{ height: 300 }} notMerge />
      </div>

      {/* 多维度对比 + 筛选 */}
      <div>
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col><Text strong style={{ fontSize: 14 }}>📊 多维度对比</Text></Col>
          <Col>
            <Space size={8}>
              <Select size="small" value={vendorFilter} onChange={setVendorFilter} style={{ width: 100 }}
                options={[{ value: 'all', label: '全部厂商' }, ...ALL_VENDORS.map((v) => ({ value: v, label: v }))]} />
              <Select size="small" value={provinceFilter} onChange={setProvinceFilter} style={{ width: 100 }}
                options={[{ value: 'all', label: '全部省份' }, ...ALL_PROVINCES.map((p) => ({ value: p, label: p }))]} />
            </Space>
          </Col>
        </Row>
        <Tabs
          defaultActiveKey="vendors"
          items={[
            { key: 'vendors', label: `按厂商 (${ALL_VENDORS.length})`, children: <ReactECharts option={barOption(dimData.vendors)} style={{ height: 300 }} notMerge /> },
            { key: 'provinces', label: `按省份 (${ALL_PROVINCES.length})`, children: <ReactECharts option={barOption(dimData.provinces)} style={{ height: 450 }} notMerge /> },
            { key: 'sendTypes', label: '按发送类型', children: <ReactECharts option={barOption(dimData.sendTypes)} style={{ height: 280 }} notMerge /> },
          ]}
        />
      </div>
    </Drawer>
  );
}

