import ReactECharts from 'echarts-for-react';

interface DimensionItem {
  name: string;
  current: number;
  baseline: number;
  changePct?: number;
}

interface DimensionCompareProps {
  title: string;
  data: DimensionItem[];
  yAxisLabel?: string;
  height?: number;
}

/**
 * 多维度分组对比柱状图
 * 用于异常详情页的厂商/省份/平台/发送类型对比面板
 */
export default function DimensionCompareChart({
  title, data, yAxisLabel = '%', height = 320,
}: DimensionCompareProps) {
  const names = data.map((d) => d.name);
  const currents = data.map((d) => d.current);
  const baselines = data.map((d) => d.baseline);

  const option = {
    color: ['#165DFF', '#C9CDD4'],
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        let html = `<b>${params[0].name}</b><br/>`;
        params.forEach((p: any) => {
          html += `${p.marker} ${p.seriesName}: ${p.value}${yAxisLabel}<br/>`;
        });
        const item = data[params[0].dataIndex];
        if (item.changePct) {
          html += `变化: ${item.changePct > 0 ? '+' : ''}${item.changePct}%`;
        }
        return html;
      },
    },
    legend: {
      bottom: 0,
      textStyle: { fontSize: 11 },
      data: ['当前值', '基线值'],
    },
    grid: { left: 12, right: 24, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: names,
      axisLabel: { color: '#4E5969', fontSize: 11, rotate: names.length > 6 ? 30 : 0 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#86909C', fontSize: 11, formatter: `{value}${yAxisLabel}` },
      splitLine: { lineStyle: { color: '#F2F3F5' } },
    },
    series: [
      {
        name: '当前值',
        type: 'bar',
        data: currents,
        barWidth: '40%',
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: (params: any) => {
            const item = data[params.dataIndex];
            if (item.changePct && Math.abs(item.changePct) > 5) return '#F53F3F';
            return '#165DFF';
          },
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 10,
          color: '#4E5969',
          formatter: (params: any) => `${params.value}${yAxisLabel}`,
        },
      },
      {
        name: '基线值',
        type: 'bar',
        data: baselines,
        barWidth: '40%',
        itemStyle: { borderRadius: [4, 4, 0, 0], opacity: 0.5 },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
