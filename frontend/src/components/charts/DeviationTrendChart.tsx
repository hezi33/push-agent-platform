import ReactECharts from 'echarts-for-react';

interface DeviationTrendProps {
  dates: string[];
  actual: number[];
  baseline: number[];
  upperBound: number[];
  lowerBound: number[];
  yAxisLabel?: string;
  height?: number;
}

/**
 * 偏离度趋势图 — 异常详情页核心图表
 *
 * 用置信区间 + 实际值 + 基线的组合，直观展示异常从何时开始、偏离了多少。
 */
export default function DeviationTrendChart({
  dates, actual, baseline, upperBound, lowerBound,
  yAxisLabel = '%', height = 380,
}: DeviationTrendProps) {
  const option = {
    color: ['#165DFF', '#86909C', '#F53F3F'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#FFFFFF',
      borderColor: '#E5E6EB',
      textStyle: { color: '#1D2129', fontSize: 13 },
      formatter: (params: any[]) => {
        let html = `<b>${params[0].axisValue}</b><br/>`;
        params.forEach((p: any) => {
          html += `${p.marker} ${p.seriesName}: ${p.value}${yAxisLabel}<br/>`;
        });
        return html;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
      data: ['实际值', '基线均值', '异常标记'],
    },
    grid: { left: 12, right: 24, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: dates.map((d) => d.slice(5)),
      axisLabel: { color: '#86909C', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#86909C', fontSize: 11, formatter: `{value}${yAxisLabel}` },
      splitLine: { lineStyle: { color: '#F2F3F5' } },
    },
    series: [
      // 置信区间（±2σ 色带）
      {
        name: '上界 (+2σ)',
        type: 'line',
        data: upperBound,
        lineStyle: { opacity: 0 },
        symbol: 'none',
        stack: 'confidence',
        areaStyle: { color: 'rgba(22, 93, 255, 0.06)' },
      },
      {
        name: '下界 (-2σ)',
        type: 'line',
        data: lowerBound,
        lineStyle: { opacity: 0 },
        symbol: 'none',
        stack: 'confidence',
        areaStyle: { color: '#FFFFFF' },
      },
      // 基线均值
      {
        name: '基线均值',
        type: 'line',
        data: baseline,
        lineStyle: { type: 'dashed', width: 1.5, color: '#86909C' },
        symbol: 'none',
      },
      // 实际值
      {
        name: '实际值',
        type: 'line',
        data: actual,
        smooth: true,
        lineStyle: { width: 2.5 },
        symbol: 'circle',
        symbolSize: 4,
        markPoints: {
          data: actual.map((val, i) => {
            const isAnomaly = i === actual.length - 1;
            return isAnomaly ? {
              coord: [i, val],
              symbol: 'pin',
              symbolSize: 32,
              itemStyle: { color: '#F53F3F' },
              label: { formatter: `${val}${yAxisLabel}`, fontSize: 11, color: '#F53F3F', fontWeight: 'bold' },
            } : undefined;
          }).filter(Boolean),
        },
      },
      // 异常高亮区域（最后一天标注红色竖线）
      {
        name: '异常标记',
        type: 'line',
        data: actual.map((_, i) => (i === actual.length - 1 ? actual[i] : null)),
        lineStyle: { width: 0 },
        symbol: 'emptyCircle',
        symbolSize: 12,
        itemStyle: { color: '#F53F3F', borderColor: '#F53F3F', borderWidth: 3 },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
