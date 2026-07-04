import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Row, Col, Card, Tag, Space, Typography, Button, Steps, Progress, Descriptions, Collapse, Alert, Tooltip, message,
} from 'antd';
import {
  ArrowLeftOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { getAttributionReport, getAttributionProgress, type AttributionReport, type FunnelStageAnalysis } from '../../mocks/data/attribution';
import { STATUS_LABELS, STATUS_COLORS, getConfidenceColor } from '../../theme/colors';

const { Text, Title, Paragraph } = Typography;

// ============================================================
// 归因分析页
// ============================================================

export default function Attribution() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromWorkbench = searchParams.get('from') === 'workbench';

  // 如果有 reportId → 展示已完成报告；否则模拟进行中再切换
  const [simulating, setSimulating] = useState(!reportId);
  const progress = getAttributionProgress();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // 模拟 3 秒后归因完成
  useEffect(() => {
    if (simulating) {
      timerRef.current = setTimeout(() => setSimulating(false), 3000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [simulating]);

  if (simulating) {
    return <AttributionProgressView steps={progress.steps} currentStep={progress.currentStep} />;
  }

  const data = getAttributionReport();
  if (!data) return null;

  return (
    <div>
      {/* 面包屑 */}
      <Space style={{ marginBottom: 16 }}>
        {fromWorkbench ? (
          <Button type="primary" size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/workbench')}>
            返回 Agent 工作台
          </Button>
        ) : (
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/dashboard')}>返回看板</Button>
        )}
        <Text type="secondary">/</Text>
        <Text strong>归因分析报告</Text>
        <Text type="secondary">/</Text>
        <Text>{data.reportId}</Text>
      </Space>

      {/* 标题行 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
        <Col>
          <Space>
            <RobotOutlined style={{ fontSize: 20, color: '#165DFF' }} />
            <Title level={4} style={{ margin: 0 }}>{data.title}</Title>
            <Tag color={STATUS_COLORS[data.status]}>{STATUS_LABELS[data.status]}</Tag>
          </Space>
        </Col>
        <Col>
          <Space>
            <ClockCircleOutlined />
            <Text type="secondary">总耗时 {data.totalDuration}</Text>
          </Space>
        </Col>
      </Row>

      {/* 步骤指示器 */}
      <Card bordered={false} style={{ marginBottom: 16 }}>
        <Steps
          size="small"
          current={3}
          items={data.steps.map((s) => ({
            title: s.label,
            description: s.duration,
            status: 'finish' as const,
          }))}
        />
      </Card>

      <Row gutter={[16, 16]}>
        {/* 左侧：贡献度决策树 */}
        <Col xs={24} lg={12}>
          <Card title="① 贡献度分解（决策树下钻）" bordered={false}>
            <ContributionTreeChart data={data.contributionTree} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              锁定维度：本地实时 × Android × 小米 × 广东省，贡献 60% 降幅
            </Text>
          </Card>
        </Col>

        {/* 右侧：漏斗环节定位 */}
        <Col xs={24} lg={12}>
          <Card title="② 漏斗环节定位" bordered={false}>
            <FunnelCompareChart data={data.funnelAnalysis} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              定位：打开率下降（-12.8%），到达率和展示率正常 → 排除厂商通道和 SDK 问题
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 根因推断 */}
      <Card
        title={
          <Space>
            <SearchOutlined />
            <span>③ 根因推断</span>
            {data.topConfidence < 70 && (
              <Tag icon={<ExclamationCircleOutlined />} color="warning">建议人工复核</Tag>
            )}
          </Space>
        }
        bordered={false}
        style={{ marginTop: 16 }}
      >
        {data.rootCauses.map((rc, idx) => (
          <RootCauseCard key={idx} cause={rc} isTop={idx === 0} />
        ))}
      </Card>

      {/* 底部操作 */}
      <Card bordered={false} style={{ marginTop: 16 }}>
        <Space size="middle">
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => message.success('归因已确认，策略 Agent 已自动触发')}>
            确认归因
          </Button>
          <Button onClick={() => message.info('修改结论功能待接入')}>修改结论</Button>
          <Button onClick={() => { setSimulating(true); message.info('正在重新启动归因分析...'); }}>重新归因</Button>
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => navigate('/strategy/SUG-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-001')} ghost>
            生成策略建议
          </Button>
        </Space>
        {data.topConfidence < 70 && (
          <Alert
            style={{ marginTop: 12 }}
            message="置信度 < 70%，建议人工复核后再生成策略"
            type="warning"
            showIcon
          />
        )}
      </Card>
    </div>
  );
}

// ============================================================
// 归因进行中视图
// ============================================================

function AttributionProgressView({ steps, currentStep }: { steps: AttributionReport['steps']; currentStep: number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Card bordered={false} style={{ width: 520, textAlign: 'center' }}>
        <SyncOutlined spin style={{ fontSize: 48, color: '#165DFF', marginBottom: 24 }} />
        <Title level={4}>归因 Agent 分析中...</Title>
        <Progress percent={Math.round((currentStep / 4) * 100)} showInfo={false} style={{ marginBottom: 24 }} />
        <Steps
          direction="vertical"
          size="small"
          current={currentStep}
          items={steps.map((s, i) => ({
            title: s.label,
            description: i < currentStep ? `✅ ${s.duration || '完成'}` : i === currentStep ? '🔄 进行中...' : '⏳ 等待中',
            status: i < currentStep ? 'finish' as const : i === currentStep ? 'process' as const : 'wait' as const,
          }))}
        />
        <Text type="secondary" style={{ marginTop: 16, display: 'block' }}>
          预计还需 {Math.max(1, 4 - currentStep)} 分钟
        </Text>
      </Card>
    </div>
  );
}

// ============================================================
// 贡献度决策树（ECharts 树图）
// ============================================================

function ContributionTreeChart({ data }: { data: AttributionReport['contributionTree'] }) {
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (p: any) => {
        const pct = p.data.contributionPct ?? p.data.value;
        const color = p.data.isAbnormal ? '#F53F3F' : '#4E5969';
        return `<span style="color:${color}"><b>${p.name}</b></span><br/>贡献度: ${pct}%`;
      },
    },
    series: [{
      type: 'tree',
      data: [data],
      top: '2%', left: '2%', bottom: '2%', right: '8%',
      symbolSize: 10,
      orient: 'LR',
      label: { position: 'left', verticalAlign: 'middle', fontSize: 11, color: '#1D2129' },
      leaves: { label: { position: 'right', verticalAlign: 'middle' } },
      initialTreeDepth: 3,
      expandAndCollapse: true,
      animationDuration: 400,
      lineStyle: { color: '#C9CDD4', width: 1.5 },
      itemStyle: { color: '#165DFF' },
      emphasis: { focus: 'descendant' },
    }],
  };

  return <ReactECharts option={option} style={{ height: 380 }} notMerge />;
}

// ============================================================
// 漏斗环节对比图
// ============================================================

function FunnelCompareChart({ data }: { data: FunnelStageAnalysis[] }) {
  const option = {
    color: ['#165DFF', '#C9CDD4'],
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0, textStyle: { fontSize: 11 }, data: ['当前值', '基线值'] },
    grid: { left: 12, right: 24, top: 16, bottom: 40, containLabel: true },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.stageLabel),
      axisLabel: { fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, formatter: '{value}%' },
      splitLine: { lineStyle: { color: '#F2F3F5' } },
    },
    series: [
      {
        name: '当前值', type: 'bar', barWidth: '35%',
        data: data.map((d) => ({
          value: d.currentRate,
          itemStyle: {
            color: d.isAbnormal ? '#F53F3F' : '#165DFF',
            borderRadius: [4, 4, 0, 0],
          },
        })),
        label: { show: true, position: 'top', fontSize: 10, formatter: '{c}%' },
      },
      {
        name: '基线值', type: 'bar', barWidth: '35%',
        data: data.map((d) => d.baselineRate),
        itemStyle: { opacity: 0.4, borderRadius: [4, 4, 0, 0] },
      },
    ],
  };

  return <ReactECharts option={option} style={{ height: 380 }} notMerge />;
}

// ============================================================
// 根因假设卡片
// ============================================================

function RootCauseCard({ cause, isTop }: { cause: AttributionReport['rootCauses'][0]; isTop: boolean }) {
  const confidenceColor = getConfidenceColor(cause.confidence);
  const rankEmoji = ['🥇', '🥈', '🥉'][cause.rank - 1] || '';

  return (
    <Card
      size="small"
      bordered={false}
      style={{
        marginBottom: 12,
        borderLeft: isTop ? '3px solid #165DFF' : undefined,
        background: isTop ? '#F7F8FA' : '#FFFFFF',
      }}
      title={
        <Space>
          <Text>{rankEmoji}</Text>
          <Text strong style={{ fontSize: 14 }}>{cause.hypothesis}</Text>
          <Tooltip title={`AI 推断的可靠程度: ${cause.confidence}%`}>
            <Tag color={confidenceColor} style={{ fontSize: 12 }}>
              置信度 {cause.confidence}%
            </Tag>
          </Tooltip>
          {cause.confidence < 60 && (
            <Tag icon={<ExclamationCircleOutlined />} color="error">需人工复核</Tag>
          )}
        </Space>
      }
    >
      {/* 置信度进度条 */}
      <Row gutter={16} align="middle" style={{ marginBottom: 12 }}>
        <Col flex="auto">
          <Progress
            percent={cause.confidence}
            strokeColor={confidenceColor}
            size="small"
            showInfo={false}
          />
        </Col>
      </Row>

      {/* 证据列表 */}
      <Text type="secondary" style={{ fontSize: 12, marginBottom: 4, display: 'block' }}>支撑证据：</Text>
      <ul style={{ margin: 0, paddingLeft: 20 }}>
        {cause.evidence.map((e, i) => (
          <li key={i} style={{ fontSize: 12, color: '#4E5969', marginBottom: 2 }}>{e}</li>
        ))}
      </ul>
    </Card>
  );
}
