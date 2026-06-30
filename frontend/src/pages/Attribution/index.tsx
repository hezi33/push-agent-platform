import { Card, Result, Typography } from 'antd';

const { Text } = Typography;

export default function Attribution() {
  return (
    <Card bordered={false}>
      <Result
        status="info"
        title="归因分析页"
        subTitle={<Text type="secondary">即将实现：贡献度决策树 + 漏斗定位 + 根因推断 + 置信度仪表盘</Text>}
      />
    </Card>
  );
}
