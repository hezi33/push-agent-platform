import { Card, Select, Space, Typography, Switch, Tag } from 'antd';
import { ClockCircleOutlined, FilterOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface FilterValues {
  timeRange: string;
  vendor: string;
  province: string;
  sendType: string;
  autoRefresh: boolean;
}

interface DashboardFilterProps {
  value: FilterValues;
  onChange: (v: FilterValues) => void;
  filteredCount?: number;
}

const TIME_OPTIONS = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: '7d', label: '近 7 天' },
  { value: '14d', label: '近 14 天' },
  { value: '30d', label: '近 30 天' },
];

const VENDOR_OPTIONS = [
  { value: 'all', label: '全部厂商' },
  { value: 'huawei', label: '华为' },
  { value: 'xiaomi', label: '小米' },
  { value: 'oppo', label: 'OPPO' },
  { value: 'vivo', label: 'VIVO' },
  { value: 'samsung', label: '三星' },
];

const PROVINCE_OPTIONS = [
  { value: 'all', label: '全部省份' },
  { value: 'guangdong', label: '广东' },
  { value: 'zhejiang', label: '浙江' },
  { value: 'jiangsu', label: '江苏' },
  { value: 'beijing', label: '北京' },
  { value: 'shanghai', label: '上海' },
  { value: 'shandong', label: '山东' },
  { value: 'sichuan', label: '四川' },
];

const SEND_TYPE_OPTIONS = [
  { value: 'all', label: '全部类型' },
  { value: 'quanliang', label: '全量' },
  { value: 'local_realtime', label: '本地实时' },
  { value: 'personalized_realtime', label: '个性化实时' },
  { value: 'personalized_offline', label: '个性化非实时' },
];

export default function DashboardFilter({ value, onChange, filteredCount }: DashboardFilterProps) {
  const updateOne = (key: keyof FilterValues, val: string | boolean) => {
    onChange({ ...value, [key]: val });
  };

  const hasFilter = value.vendor !== 'all' || value.province !== 'all' || value.sendType !== 'all';

  return (
    <Card bordered={false} style={{ marginBottom: 16 }} bodyStyle={{ padding: '10px 16px' }}>
      <Space size="middle" wrap>
        <FilterOutlined style={{ color: '#86909C' }} />
        <Text type="secondary" style={{ fontSize: 12 }}>时间:</Text>
        <Select size="small" value={value.timeRange} onChange={(v) => updateOne('timeRange', v)} options={TIME_OPTIONS} style={{ width: 110 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>厂商:</Text>
        <Select size="small" value={value.vendor} onChange={(v) => updateOne('vendor', v)} options={VENDOR_OPTIONS} style={{ width: 120 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>省份:</Text>
        <Select size="small" value={value.province} onChange={(v) => updateOne('province', v)} options={PROVINCE_OPTIONS} style={{ width: 120 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>类型:</Text>
        <Select size="small" value={value.sendType} onChange={(v) => updateOne('sendType', v)} options={SEND_TYPE_OPTIONS} style={{ width: 140 }} />
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#86909C', fontSize: 12 }} />
          <Text type="secondary" style={{ fontSize: 11 }}>自动刷新</Text>
          <Switch size="small" checked={value.autoRefresh} onChange={(v) => updateOne('autoRefresh', v)} />
        </Space>
        {hasFilter && (
          <Tag color="blue" style={{ fontSize: 11 }}>
            已筛选 {filteredCount?.toLocaleString() || '—'} 个维度组合
          </Tag>
        )}
      </Space>
    </Card>
  );
}
