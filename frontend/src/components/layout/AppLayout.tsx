import { useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Badge, Dropdown, Space, Typography, Tag, Tooltip } from 'antd';
import {
  DashboardOutlined,
  AlertOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  HistoryOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  ReloadOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useAppStore } from '../../stores/app';
import { useRelativeTime, randomPastTime } from '../../hooks/useRelativeTime';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const menuItems = [
  { key: '/dashboard',    icon: <DashboardOutlined />,    label: '数据看板' },
  { key: '/anomaly',      icon: <AlertOutlined />,        label: '异常详情' },
  { key: '/attribution',  icon: <SearchOutlined />,       label: '归因分析' },
  { key: '/strategy',     icon: <ThunderboltOutlined />,  label: '策略建议' },
  { key: '/history',      icon: <HistoryOutlined />,      label: '处理记录' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar, unreadCount } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);

  const selectedKey = '/' + location.pathname.split('/')[1];

  // 动态"最后更新时间"——自动递增，不写死
  const lastUpdatedAt = useMemo(() => randomPastTime(60, 180), []);
  const lastUpdatedRelative = useRelativeTime(lastUpdatedAt);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
    window.location.reload();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ── 侧边栏 ── */}
      <Sider
        trigger={null}
        collapsible
        collapsed={sidebarCollapsed}
        width={220}
        style={{
          borderRight: '1px solid #E5E6EB',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        {/* Logo 区域 */}
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid #E5E6EB',
          }}
        >
          <Text
            strong
            style={{
              fontSize: sidebarCollapsed ? 14 : 16,
              color: '#165DFF',
              whiteSpace: 'nowrap',
            }}
          >
            {sidebarCollapsed ? '📊' : '📊 Push Agent'}
          </Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ border: 'none', marginTop: 8 }}
        />
      </Sider>

      {/* ── 主内容区 ── */}
      <Layout style={{ marginLeft: sidebarCollapsed ? 64 : 220, transition: 'margin-left 0.2s' }}>
        {/* 顶部栏 */}
        <Header
          style={{
            height: 56,
            background: '#FFFFFF',
            borderBottom: '1px solid #E5E6EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          <Space>
            <Button
              type="text"
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={toggleSidebar}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              最后更新: {lastUpdatedRelative}
            </Text>
            <Button
              type="text"
              icon={<ReloadOutlined spin={refreshing} />}
              onClick={handleRefresh}
              size="small"
            />
          </Space>

          <Space size="middle">
            {/* 🤖 Agent 运行指示灯 */}
            <Tooltip title="监控 Agent 正在 7×24 小时自动巡检所有维度指标">
              <Tag
                icon={<Badge status="processing" color="#00B42A" style={{ marginRight: 4 }} />}
                color="blue"
                style={{ fontSize: 11, lineHeight: '20px', padding: '0 8px', cursor: 'default' }}
              >
                <RobotOutlined style={{ marginRight: 4, fontSize: 12 }} />
                Agent 运行中
              </Tag>
            </Tooltip>

            <Badge count={unreadCount} size="small">
              <Button type="text" icon={<BellOutlined style={{ fontSize: 18 }} />} />
            </Badge>
            <Dropdown
              menu={{
                items: [
                  { key: 'profile', label: '个人信息' },
                  { key: 'settings', label: '系统设置' },
                  { type: 'divider' },
                  { key: 'logout', label: '退出登录' },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <UserOutlined style={{ fontSize: 16, color: '#4E5969' }} />
                <Text>吴丽芳</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* 页面内容 */}
        <Content style={{ padding: 24, minHeight: 'calc(100vh - 56px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
