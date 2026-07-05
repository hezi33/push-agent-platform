import { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Tabs, Space, Typography, Statistic, Row, Col, Segmented, Button, Select, DatePicker, Tag, message } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined, ExportOutlined, DownloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { KPICardData } from '../../types';
import { getTrendColor, getTrendArrow, CHART_COLORS } from '../../theme/colors';
import { generateTrend, generateDates, ALL_PROVINCES, ALL_VENDORS, ALL_SEND_TYPES } from '../../mocks/data/trendGenerator';
import { downloadCSV, exportTrendData, exportDimensionData } from '../../utils/exportCSV';

const { Text } = Typography;
const { RangePicker } = DatePicker;

interface MetricDetailDrawerProps { open: boolean; card: KPICardData | null; onClose: () => void; }

const TIME_OPTIONS = [
  { value: '7', label: '7天' }, { value: '30', label: '30天' }, { value: '90', label: '90天' },
  { value: '180', label: '半年' }, { value: '365', label: '一年' }, { value: 'custom', label: '自定义' },
];

export default function MetricDetailDrawer({ open, card, onClose }: MetricDetailDrawerProps) {
  if (!card) return null;

  const [timeRange, setTimeRange] = useState('30');
  const [customDates, setCustomDates] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [vendorFilter, setVendorFilter] = useState('all');
  const [provinceFilter, setProvinceFilter] = useState('all');

  // 重置
  const prevKey = useRef(card?.metricKey);
  useEffect(() => {
    if (prevKey.current !== card.metricKey) {
      setTimeRange('30'); setCustomDates(null); setVendorFilter('all'); setProvinceFilter('all');
      prevKey.current = card.metricKey;
    }
  }, [card.metricKey]);

  const isPct = card.format === 'percentage';
  const suffix = isPct ? '%' : card.format === 'wan' ? ' 万' : '';
  const prec = isPct ? 2 : 0;
  const baseVal = isPct ? (card.metricKey === 'uv_open_rate' ? 3.90 : card.metricKey === 'pv_open_rate' ? 0.73 : 3) : card.yesterdayValue;
  const noise = isPct ? 0.03 : 0.06;

  // 日期范围
  const isCustom = timeRange === 'custom';
  const days = isCustom && customDates
    ? customDates[1].diff(customDates[0], 'day') + 1
    : parseInt(timeRange);

  const dates = useMemo(() => {
    if (isCustom && customDates) {
      const result: string[] = [];
      const start = customDates[0];
      for (let i = 0; i < days; i++) {
        result.push(start.add(i, 'day').format('YYYY-MM-DD'));
      }
      return result;
    }
    return generateDates(days);
  }, [days, isCustom, customDates]);

  const trendData = useMemo(
    () => generateTrend(card.metricKey, baseVal, noise, days, card.anomaly ? days - 1 : null, card.anomaly ? card.currentValue : undefined),
    [card.metricKey, baseVal, noise, days, card.anomaly, card.currentValue],
  );

  const color = getTrendColor(card.changePct, card.isPositiveGreen);
  const arrow = getTrendArrow(card.changePct);

  // 维度数据（按筛选过滤）
  const dimData = useMemo(() => {
    const g = (offset: number) => +Number(card.currentValue * (1 + offset)).toFixed(isPct ? 2 : 0);
    const vendors = ALL_VENDORS
      .filter((v) => vendorFilter === 'all' || v === vendorFilter)
      .map((n, i) => ({ name: n, current: g(-0.15 + i * 0.04), baseline: g(0.05 + i * 0.02) }));
    const provinces = ALL_PROVINCES
      .filter((p) => provinceFilter === 'all' || p === provinceFilter)
      .map((n, i) => ({ name: n, current: g(-0.18 + i * 0.012), baseline: g(0.05 + i * 0.008) }));
    return {
      vendors,
      provinces,
      sendTypes: ALL_SEND_TYPES.map((n, i) => ({ name: n, current: g(-0.12 + i * 0.04), baseline: g(0.05 + i * 0.02) })),
    };
  }, [card.currentValue, isPct, vendorFilter, provinceFilter]);

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
    <Modal
      title={<Space><Text strong style={{ fontSize: 16 }}>{card.title} 详细分析</Text>{card.anomaly && <Tag color="error">异常</Tag>}</Space>}
      open={open} onCancel={onClose} width={860}
      footer={null}
      destroyOnClose
    >
      {/* 概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}><Statistic title="当前值" value={card.currentValue} precision={prec} suffix={suffix} valueStyle={{ color: card.anomaly ? '#F53F3F' : '#1D2129', fontSize: 22 }} /></Col>
        <Col span={6}><Statistic title="昨日值" value={card.yesterdayValue} precision={prec} suffix={suffix} /></Col>
        <Col span={6}><Statistic title="变化" value={Math.abs(card.changePct)} precision={1} suffix="%"
          prefix={arrow === '↑' ? <ArrowUpOutlined /> : arrow === '↓' ? <ArrowDownOutlined /> : <ArrowRightOutlined />}
          valueStyle={{ color, fontSize: 20 }} /></Col>
        <Col span={6}><Statistic title="基线均值" value={isPct ? baseVal : card.yesterdayValue} precision={prec} suffix={suffix} /></Col>
      </Row>

      {/* 日期筛选 + 导出 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Text strong style={{ fontSize: 14 }}>📈 趋势图</Text>
        </Col>
        <Col>
          <Space size={8} wrap>
            <Segmented size="small" value={timeRange} onChange={(v) => setTimeRange(v as string)} options={TIME_OPTIONS} />
            {isCustom && (
              <RangePicker
                size="small"
                value={customDates as any}
                onChange={(dates) => setCustomDates(dates as [dayjs.Dayjs, dayjs.Dayjs] | null)}
                style={{ width: 240 }}
              />
            )}
            <Button size="small" icon={<DownloadOutlined />} onClick={() => exportTrendData(card.title, dates, trendData, suffix)}>
              导出趋势
            </Button>
          </Space>
        </Col>
      </Row>

      <div style={{ marginBottom: 20 }}>
        <ReactECharts option={{
          color: ['#165DFF'],
          tooltip: { trigger: 'axis' },
          grid: { left: 50, right: 20, top: 20, bottom: 40 },
          xAxis: { type: 'category', data: dates.map((d) => d.slice(5)), axisLabel: { fontSize: 10 } },
          yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
          series: [{ name: card.title, type: 'line', data: trendData, smooth: true }],
        }} style={{ height: 300 }} />
      </div>

      {/* 维度筛选 + 导出 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
        <Col>
          <Text strong style={{ fontSize: 14 }}>📊 多维度对比</Text>
        </Col>
        <Col>
          <Space size={8} wrap>
            <Select size="small" value={vendorFilter} onChange={setVendorFilter} style={{ width: 110 }}
              options={[{ value: 'all', label: '全部厂商' }, ...ALL_VENDORS.map((v) => ({ value: v, label: v }))]} />
            <Select size="small" value={provinceFilter} onChange={setProvinceFilter} style={{ width: 110 }}
              options={[{ value: 'all', label: '全部省份' }, ...ALL_PROVINCES.map((p) => ({ value: p, label: p }))]}
              showSearch />
          </Space>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="vendors"
        tabBarExtraContent={
          <Button size="small" icon={<DownloadOutlined />} onClick={() => exportDimensionData(card.title, '厂商', dimData.vendors, suffix)}>
            导出
          </Button>
        }
        items={[
          { key: 'vendors', label: `按厂商 (${dimData.vendors.length})`, children: <ReactECharts option={barOption(dimData.vendors)} style={{ height: 280 }} /> },
          { key: 'provinces', label: `按省份 (${dimData.provinces.length})`, children: <ReactECharts option={barOption(dimData.provinces)} style={{ height: 400 }} /> },
          { key: 'sendTypes', label: '按发送类型', children: <ReactECharts option={barOption(dimData.sendTypes)} style={{ height: 260 }} /> },
        ]}
      />
    </Modal>
  );
}

