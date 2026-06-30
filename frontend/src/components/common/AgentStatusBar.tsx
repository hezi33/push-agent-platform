import { useMemo } from 'react';
import { Card, Tag, Space, Typography, Tooltip, Badge } from 'antd';
import {
  RobotOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  RadarChartOutlined,
} from '@ant-design/icons';
import { useRelativeTime } from '../../hooks/useRelativeTime';

const { Text } = Typography;

interface AgentStatusBarProps {
  /** 上次巡检的 ISO 时间戳（动态生成，非写死） */
  lastScanTime: string;
  dimensionsCovered: number;
  activeAlerts: number;
}

/**
 * Agent 状态栏 — Dashboard 顶部
 *
 * 这是 Agent 在 UI 中最显眼的存在标识：
 * 告诉用户「有一个 AI 在 7×24 小时帮你盯着数据」
 *
 * 时间全部动态计算，不会暴露写死的假时间。
 */
export default function AgentStatusBar({ lastScanTime, dimensionsCovered, activeAlerts }: AgentStatusBarProps) {
  const relativeTime = useRelativeTime(lastScanTime);

  // 格式化完整时间（仅 Tooltip 显示）
  const fullTime = useMemo(() => {
    const d = new Date(lastScanTime);
    return d.toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  }, [lastScanTime]);

  return (
    <Card
      bordered={false}
      style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #E8F2FF 0%, #F0F5FF 100%)',
        borderLeft: '3px solid #165DFF',
        borderRadius: 8,
      }}
      bodyStyle={{ padding: '12px 20px' }}
    >
      <Space size="large" wrap>
        {/* 监控 Agent 状态 */}
        <Space size={6}>
          <Badge status="processing" color="#00B42A" />
          <RobotOutlined style={{ color: '#165DFF', fontSize: 16 }} />
          <Text strong style={{ fontSize: 13 }}>
            监控 Agent
          </Text>
          <Tag color="green" style={{ fontSize: 11, marginLeft: 0 }}>运行中</Tag>
        </Space>

        <Tooltip title={`覆盖 ${dimensionsCovered.toLocaleString()} 个维度组合的实时巡检`}>
          <Space size={4}>
            <RadarChartOutlined style={{ color: '#4E5969', fontSize: 13 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              巡检覆盖 <Text strong style={{ fontSize: 12 }}>{dimensionsCovered.toLocaleString()}</Text> 维度组合
            </Text>
          </Space>
        </Tooltip>

        <Tooltip title={`最近一次巡检: ${fullTime}`}>
          <Space size={4}>
            <ClockCircleOutlined style={{ color: '#4E5969', fontSize: 13 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              上次巡检{' '}
              <Text strong style={{ fontSize: 12 }}>{relativeTime}</Text>
            </Text>
            <SyncOutlined spin style={{ color: '#165DFF', fontSize: 11 }} />
          </Space>
        </Tooltip>

        {activeAlerts > 0 ? (
          <Tag
            color="error"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            {activeAlerts} 条活跃告警
          </Tag>
        ) : (
          <Space size={4}>
            <CheckCircleOutlined style={{ color: '#00B42A', fontSize: 13 }} />
            <Text type="secondary" style={{ fontSize: 12 }}>所有指标正常</Text>
          </Space>
        )}
      </Space>
    </Card>
  );
}

/**
 * AI 检测 Badge — 用于告警列表每一行
 * 标记该告警由监控 Agent 自动发现
 */
export function AIDetectedBadge() {
  return (
    <Tooltip title="此告警由监控 Agent 通过基线比对自动发现，非人工上报">
      <Tag
        icon={<RobotOutlined style={{ fontSize: 10 }} />}
        color="processing"
        style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px' }}
      >
        AI 检测
      </Tag>
    </Tooltip>
  );
}

/**
 * Agent 思考中指示器 — 用于归因进行中的告警
 */
export function AgentThinkingBadge({ status }: { status: string | null }) {
  if (!status) return null;

  const isProcessing = status === 'S07' || status === 'S10';
  const isDone = status === 'S08' || status === 'S15';

  if (isProcessing) {
    return (
      <Tooltip title="Agent 正在分析中...">
        <Tag
          icon={<SyncOutlined spin style={{ fontSize: 10 }} />}
          color="processing"
          style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px' }}
        >
          Agent 分析中
        </Tag>
      </Tooltip>
    );
  }

  if (isDone) {
    return (
      <Tooltip title="Agent 已完成分析，点击查看结果">
        <Tag
          icon={<RobotOutlined style={{ fontSize: 10 }} />}
          color="blue"
          style={{ fontSize: 10, lineHeight: '18px', padding: '0 6px' }}
        >
          AI 已完成
        </Tag>
      </Tooltip>
    );
  }

  return null;
}
