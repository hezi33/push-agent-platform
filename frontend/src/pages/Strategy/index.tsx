import { Card, Result, Typography } from 'antd';

const { Text } = Typography;

export default function Strategy() {
  return (
    <Card bordered={false}>
      <Result
        status="info"
        title="策略建议页"
        subTitle={<Text type="secondary">即将实现：建议卡片 + 效果预估 + D+1/D+3/D+7 跟踪时间线 + 升级流程</Text>}
      />
    </Card>
  );
}
