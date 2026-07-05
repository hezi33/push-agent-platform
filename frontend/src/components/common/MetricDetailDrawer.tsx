import { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Tabs, Space, Typography, Statistic, Row, Col, Segmented, Button, Select, DatePicker, Tag, message } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, ArrowRightOutlined, ExportOutlined, DownloadOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import type { KPICardData } from '../../types';
import { getTrendColor, getTrendArrow, CHART_COLORS } from '../../theme/colors';
import { generateTrend, generateDates, ALL_PROVINCES, ALL_VENDORS, ALL_SEND_TYPES } from '../../mocks/data/trendGenerator';
import { getFilteredValue } from '../../mocks/data/dimensionData';
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
  const [sendTypeFilter, setSendTypeFilter] = useState('all');

  const hasFilter = vendorFilter !== 'all' || provinceFilter !== 'all' || sendTypeFilter !== 'all';

  // 切换指标时重置
  const prevKey = useRef(card?.metricKey);
  useEffect(() => {
    if (prevKey.current !== card.metricKey) {
      setTimeRange('30'); setCustomDates(null); setVendorFilter('all'); setProvinceFilter('all'); setSendTypeFilter('all');
      prevKey.current = card.metricKey;
    }
  }, [card.metricKey]);

  // ✅ 筛选后的数据
  const filtered = getFilteredValue(card.metricKey, card, vendorFilter, provinceFilter, sendTypeFilter);
  const displayValue = filtered.currentValue;
  const displayYesterday = filtered.yesterdayValue;
  const displayChangePct = filtered.changePct;

  const isPct = card.format === 'percentage';
  const suffix = isPct ? '%' : card.format === 'wan' ? ' 万' : '';
  const prec = isPct ? 2 : 0;
  const baseVal = isPct ? displayYesterday : displayYesterday;
  const noise = isPct ? 0.03 : 0.06;
  const displayAnomaly = card.anomaly || Math.abs(displayChangePct) > 10;

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
    () => generateTrend(card.metricKey, baseVal, noise, days, displayAnomaly ? days - 1 : null, displayAnomaly ? displayValue : undefined),
    [card.metricKey, baseVal, noise, days, displayAnomaly, displayValue],
  );

  const color = getTrendColor(card.changePct, card.isPositiveGreen);
  const arrow = getTrendArrow(card.changePct);

  // 维度数据（筛选后数据联动）
  const dimData = useMemo(() => {
    const g = (offset: number) => +Number(displayValue * (1 + offset)).toFixed(isPct ? 2 : 0);
    // 厂商下钻：选某厂商→数据聚焦该厂商维度
    const vendors = ALL_VENDORS
      .filter((v) => vendorFilter === 'all' || v === vendorFilter)
      .map((n, i) => ({ name: n, current: g(-0.15 + i * 0.04), baseline: g(0.05 + i * 0.02) }));
    // 省份下钻同理
    const provinces = ALL_PROVINCES
      .filter((p) => provinceFilter === 'all' || p === provinceFilter)
      .map((n, i) => ({ name: n, current: g(-0.18 + i * 0.012), baseline: g(0.05 + i * 0.008) }));
    return {
      vendors,
      provinces,
      sendTypes: ALL_SEND_TYPES.map((n, i) => ({ name: n, current: g(-0.12 + i * 0.04), baseline: g(0.05 + i * 0.02) })),
    };
  }, [displayValue, isPct, vendorFilter, provinceFilter]);

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
        <Col span={6}><Statistic title="当前值" value={displayValue} precision={prec} suffix={suffix} valueStyle={{ color: displayAnomaly ? '#F53F3F' : '#1D2129', fontSize: 22 }} /></Col>
        <Col span={6}><Statistic title="基线值" value={displayYesterday} precision={prec} suffix={suffix} /></Col>
        <Col span={6}><Statistic title="变化" value={Math.abs(displayChangePct)} precision={1} suffix="%"
          prefix={displayChangePct > 0 ? <ArrowUpOutlined /> : displayChangePct < 0 ? <ArrowDownOutlined /> : <ArrowRightOutlined />}
          valueStyle={{ color: getTrendColor(displayChangePct, card.isPositiveGreen), fontSize: 20 }} /></Col>
        <Col span={6}>
          {hasFilter ? (
            <Statistic title="筛选维度" value={`${vendorFilter !== 'all' ? vendorFilter + ' ' : ''}${provinceFilter !== 'all' ? provinceFilter + ' ' : ''}${sendTypeFilter !== 'all' ? sendTypeFilter : ''}`.trim() || '全部'} valueStyle={{ fontSize: 14 }} formatter={(v) => <Tag color="blue">{v}</Tag>} />
          ) : (
            <Statistic title="数据范围" value="全量" valueStyle={{ fontSize: 14 }} formatter={(v) => <Text type="secondary">{v}</Text>} />
          )}
        </Col>
      </Row>

      {/* ── 筛选条件（控制全部数据）── */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 12, padding: '8px 12px', background: '#FAFBFC', borderRadius: 8 }}>
        <Col>
          <Space size={8}>
            <Text strong style={{ fontSize: 13 }}>🔍 筛选下钻</Text>
            {hasFilter && <Button size="small" type="link" onClick={() => { setVendorFilter('all'); setProvinceFilter('all'); setSendTypeFilter('all'); }}>清除</Button>}
          </Space>
        </Col>
        <Col>
          <Space size={8} wrap>
            <Select size="small" value={vendorFilter} onChange={setVendorFilter} style={{ width: 100 }}
              options={[{ value: 'all', label: '厂商▾' }, ...ALL_VENDORS.map((v) => ({ value: v, label: v }))]} />
            <Select size="small" value={provinceFilter} onChange={setProvinceFilter} style={{ width: 100 }}
              options={[{ value: 'all', label: '省份▾' }, ...ALL_PROVINCES.map((p) => ({ value: p, label: p }))]} showSearch />
            <Select size="small" value={sendTypeFilter} onChange={setSendTypeFilter} style={{ width: 120 }}
              options={[{ value: 'all', label: '发送类型▾' }, ...ALL_SEND_TYPES.map((s) => ({ value: s, label: s }))]} />
          </Space>
        </Col>
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

