import { Card, Result, Typography } from 'antd';

const { Text } = Typography;

export default function History() {
  return (
    <Card bordered={false}>
      <Result
        status="info"
        title="处理记录页"
        subTitle={<Text type="secondary">即将实现：历史告警表格 + 多条件筛选 + 统计汇总 + 行展开详情</Text>}
      />
    </Card>
  );
}
