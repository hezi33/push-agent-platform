import { useState, useMemo } from 'react';
import { Drawer, Tabs, Space, Typography, Statistic, Row, Col, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import type { KPICardData } from '../../types';
import { getTrendColor, getTrendArrow, CHART_COLORS } from '../../theme/colors';

const { Text, Title } = Typography;

interface MetricDetailDrawerProps {
  open: boolean;
  card: KPICardData | null;
  onClose: () => void;
}

// 生成 30 天趋势数据
function genTrendData(card: KPICardData): number[] {
  const base = card.currentValue;
  const noise = card.format === 'percentage' ? 0.05 : 0.08;
  const days = 30;
  const result: number[] = [];
  for (let i = 0; i < days - 1; i++) {
    result.push(+(base + base * noise * (Math.random() * 2 - 1)).toFixed(card.format === 'percentage' ? 2 : 0));
  }
  result.push(card.currentValue); // 最后一天 = 当前值
  return result;
}

function genDates(days: number): string[] {
  const d: string[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const t = new Date(now);
    t.setDate(t.getDate() - i);
    d.push(t.toISOString().slice(5, 10));
  }
  return d;
}

// 按维度生成对比数据
function genDimensionData(card: KPICardData) {
  const base = card.currentValue;
  const fmt = card.format;
  const pct = fmt === 'percentage';

  const gen = (offset: number) => +(base * (1 + offset)).toFixed(pct ? 2 : 0);

  return {
    vendors: [
      { name: '华为', current: gen(-0.05), baseline: gen(0.08) },
      { name: '小米', current: gen(-0.12), baseline: gen(0.10) },
      { name: 'OPPO', current: gen(0.02), baseline: gen(0.05) },
      { name: 'VIVO', current: gen(-0.03), baseline: gen(0.06) },
      { name: '三星', current: gen(0.01), baseline: gen(0.03) },
    ],
    provinces: [
      { name: '广东', current: gen(-0.15), baseline: gen(0.10) },
      { name: '浙江', current: gen(-0.08), baseline: gen(0.07) },
      { name: '江苏', current: gen(-0.03), baseline: gen(0.06) },
      { name: '北京', current: gen(0.02), baseline: gen(0.05) },
      { name: '上海', current: gen(0.01), baseline: gen(0.04) },
      { name: '山东', current: gen(-0.01), baseline: gen(0.03) },
      { name: '四川', current: gen(0.03), baseline: gen(0.02) },
      { name: '湖北', current: gen(0.01), baseline: gen(0.03) },
    ],
    sendTypes: [
      { name: '全量', current: gen(-0.04), baseline: gen(0.08) },
      { name: '本地实时', current: gen(-0.10), baseline: gen(0.09) },
      { name: '个性化实时', current: gen(0.03), baseline: gen(0.06) },
      { name: '个性化非实时', current: gen(0.01), baseline: gen(0.04) },
    ],
  };
}

export default function MetricDetailDrawer({ open, card, onClose }: MetricDetailDrawerProps) {
  if (!card) return null;

  const dates = useMemo(() => genDates(30), []);
  const trendData = useMemo(() => genTrendData(card), [card.metricKey]);
  const dimData = useMemo(() => genDimensionData(card), [card.metricKey]);

  const color = getTrendColor(card.changePct, card.isPositiveGreen);
  const arrow = getTrendArrow(card.changePct);
  const suffix = card.format === 'percentage' ? '%' : card.format === 'wan' ? ' 万' : '';
  const prec = card.format === 'percentage' ? 2 : 0;

  // 趋势图配置
  const trendOption = {
    color: [CHART_COLORS[0], '#C9CDD4'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 10, color: '#86909C' } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#86909C', formatter: `{value}${suffix}` }, splitLine: { lineStyle: { color: '#F2F3F5' } } },
    series: [
      {
        name: card.title, type: 'line', data: trendData, smooth: true, symbol: 'circle', symbolSize: 3,
        lineStyle: { width: 2 },
        markPoints: {
          data: [{ coord: [29, card.currentValue], symbol: 'pin', symbolSize: 30, itemStyle: { color: '#F53F3F' }, label: { formatter: `${card.currentValue}${suffix}`, fontSize: 10 } }],
        },
      },
    ],
  };

  // 维度对比图
  const barOption = (data: { name: string; current: number; baseline: number }[]) => ({
    color: ['#165DFF', '#E5E6EB'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 }, data: ['当前值', '基线值'] },
    grid: { left: 8, right: 16, top: 16, bottom: 36, containLabel: true },
    xAxis: { type: 'category', data: data.map((d) => d.name), axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10, formatter: `{value}${suffix}` }, splitLine: { lineStyle: { color: '#F2F3F5' } } },
    series: [
      { name: '当前值', type: 'bar', data: data.map((d) => d.current), barWidth: '35%', itemStyle: { borderRadius: [4, 4, 0, 0] } },
      { name: '基线值', type: 'bar', data: data.map((d) => d.baseline), barWidth: '35%', itemStyle: { borderRadius: [4, 4, 0, 0], opacity: 0.35 } },
    ],
  });

  return (
    <Drawer
      title={
        <Space>
          <Text strong style={{ fontSize: 16 }}>{card.title} 详细分析</Text>
          {card.anomaly && <Tag color="error">异常</Tag>}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={720}
      styles={{ body: { padding: '16px 24px' } }}
    >
      {/* 概览 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Statistic title="当前值" value={card.currentValue} precision={prec} suffix={suffix} valueStyle={{ color: card.anomaly ? '#F53F3F' : '#1D2129', fontSize: 22 }} />
        </Col>
        <Col span={6}>
          <Statistic title="昨日值" value={card.yesterdayValue} precision={prec} suffix={suffix} valueStyle={{ fontSize: 20 }} />
        </Col>
        <Col span={6}>
          <Statistic title="变化" value={Math.abs(card.changePct)} precision={1} suffix="%" prefix={arrow === '↑' ? <ArrowUpOutlined /> : arrow === '↓' ? <ArrowDownOutlined /> : <ArrowRightOutlined />} valueStyle={{ color, fontSize: 20 }} />
        </Col>
        <Col span={6}>
          <Statistic title="基线均值" value={card.format === 'percentage' ? 3.90 : card.yesterdayValue} precision={prec} suffix={suffix} valueStyle={{ fontSize: 20 }} />
        </Col>
      </Row>

      {/* 趋势图 */}
      <div style={{ marginBottom: 20 }}>
        <Text strong style={{ fontSize: 14, marginBottom: 8, display: 'block' }}>📈 近 30 天趋势</Text>
        <ReactECharts option={trendOption} style={{ height: 280 }} notMerge />
      </div>

      {/* 多维度对比 */}
      <Tabs
        defaultActiveKey="vendors"
        items={[
          {
            key: 'vendors', label: '按厂商',
            children: <ReactECharts option={barOption(dimData.vendors)} style={{ height: 280 }} notMerge />,
          },
          {
            key: 'provinces', label: '按省份',
            children: <ReactECharts option={barOption(dimData.provinces)} style={{ height: 320 }} notMerge />,
          },
          {
            key: 'sendTypes', label: '按发送类型',
            children: <ReactECharts option={barOption(dimData.sendTypes)} style={{ height: 260 }} notMerge />,
          },
        ]}
      />
    </Drawer>
  );
}
