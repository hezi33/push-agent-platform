import ReactECharts from 'echarts-for-react';
import { CHART_COLORS } from '../../theme/colors';

interface TrendSeries {
  name: string;
  data: number[];
  anomalyPoints?: number[];
}

interface TrendLineChartProps {
  dates: string[];
  series: TrendSeries[];
  height?: number;
}

/**
 * 核心指标趋势折线图
 * 用于 Dashboard 的 7 天趋势展示
 */
export default function TrendLineChart({ dates, series, height = 350 }: TrendLineChartProps) {
  const option = {
    color: CHART_COLORS,
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E6EB',
      textStyle: { color: '#1D2129', fontSize: 13 },
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
    },
    legend: {
      bottom: 0,
      textStyle: { color: '#4E5969', fontSize: 12 },
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 24,
    },
    grid: {
      left: 12,
      right: 24,
      top: 12,
      bottom: 40,
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: dates.map((d) => d.slice(5)), // MM-DD 格式
      axisLine: { lineStyle: { color: '#E5E6EB' } },
      axisTick: { show: false },
      axisLabel: { color: '#86909C', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#F2F3F5' } },
      axisLabel: { color: '#86909C', fontSize: 11 },
    },
    series: series.map((s, idx) => ({
      name: s.name,
      type: 'line',
      data: s.data.map((val, i) => {
        const isAnomaly = s.anomalyPoints?.includes(i);
        return {
          value: val,
          symbol: isAnomaly ? 'circle' : 'none',
          symbolSize: isAnomaly ? 8 : 4,
          itemStyle: isAnomaly ? { color: '#F53F3F', borderColor: '#FFFFFF', borderWidth: 2 } : undefined,
        };
      }),
      smooth: true,
      lineStyle: { width: 2 },
      markLine: idx === 0 ? {
        silent: true,
        symbol: 'none',
        lineStyle: { type: 'dashed', color: '#86909C', width: 1 },
        label: { color: '#86909C', fontSize: 10, formatter: '基线\n{c}' },
        data: [{ yAxis: 3.90, name: '基线' }],
      } : undefined,
    })),
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
