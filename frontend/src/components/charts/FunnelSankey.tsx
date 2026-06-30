import ReactECharts from 'echarts-for-react';

interface FunnelStage {
  name: string;
  uv: number;
  rate: string;
}

interface FunnelSankeyProps {
  stages: FunnelStage[];
  height?: number;
}

/**
 * 漏斗转化桑基图
 * 展示 Push 漏斗四环节：发送 → 到达 → 展示 → 打开
 */
export default function FunnelSankey({ stages, height = 350 }: FunnelSankeyProps) {
  const nodes = stages.map((s) => ({ name: s.name }));
  const links = [];
  for (let i = 0; i < stages.length - 1; i++) {
    links.push({
      source: stages[i].name,
      target: stages[i + 1].name,
      value: stages[i + 1].uv,
    });
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const stage = stages[params.dataIndex];
          return `<b>${stage.name}</b><br/>UV: ${stage.uv.toLocaleString()}<br/>转化率: ${stage.rate}`;
        }
        return `${params.data.source} → ${params.data.target}<br/>UV: ${params.data.value.toLocaleString()}`;
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'left',
        layoutIterations: 0,
        data: nodes.map((n, i) => ({
          name: n.name,
          itemStyle: {
            color: i === stages.length - 1 ? '#00B42A' : '#165DFF',
            borderColor: i === stages.length - 1 ? '#00B42A' : '#165DFF',
          },
          label: {
            formatter: `{b}\n${stages[i].uv.toLocaleString()} UV`,
          },
        })),
        links: links.map((l) => ({
          source: l.source,
          target: l.target,
          value: l.value,
          lineStyle: {
            color: 'gradient',
            curveness: 0.5,
            opacity: 0.3,
          },
        })),
        label: {
          fontSize: 12,
          color: '#4E5969',
        },
        lineStyle: {
          color: 'gradient',
          curveness: 0.5,
        },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height }} notMerge />;
}
