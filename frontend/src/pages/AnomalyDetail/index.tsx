import { useParams } from 'react-router-dom';
import { Card, Result, Typography, Button, Space } from 'antd';

const { Text } = Typography;

/**
 * 异常详情页 — 占位
 * TODO: 阶段 0 后续实现
 */
export default function AnomalyDetail() {
  const { alertId } = useParams();

  return (
    <Card bordered={false}>
      <Result
        status="info"
        title="异常详情页"
        subTitle={
          <Space direction="vertical">
            <Text>告警 ID: {alertId}</Text>
            <Text type="secondary">该页面即将实现：告警摘要 + 偏离度趋势图 + 多维度对比 + 事件时间线</Text>
          </Space>
        }
        extra={
          <Button type="primary" onClick={() => window.history.back()}>
            返回看板
          </Button>
        }
      />
    </Card>
  );
}
