import type { ThemeConfig } from 'antd';

/**
 * Ant Design 5 主题 Token 配置
 * 严格映射 DESIGN.md §二 设计系统的色彩/字体/间距/圆角规范
 */
const theme: ThemeConfig = {
  token: {
    // ── 主色 ──
    colorPrimary: '#165DFF',
    colorInfo: '#165DFF',

    // ── 语义色 ──
    colorSuccess: '#00B42A',
    colorWarning: '#FF7D00',
    colorError: '#F53F3F',

    // ── 中性色 ──
    colorText: '#1D2129',
    colorTextSecondary: '#4E5969',
    colorTextTertiary: '#86909C',
    colorTextQuaternary: '#C9CDD4',
    colorBorder: '#E5E6EB',
    colorBorderSecondary: '#F2F3F5',
    colorFill: '#F2F3F5',
    colorFillSecondary: '#F7F8FA',
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F2F3F5',

    // ── 字体 ──
    fontFamily: `-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif`,
    fontSize: 14,
    fontSizeHeading1: 24,
    fontSizeHeading2: 20,
    fontSizeHeading3: 16,
    fontSizeLG: 16,
    fontSizeSM: 12,

    // ── 圆角 ──
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 4,

    // ── 行高 ──
    lineHeight: 1.5714,

    // ── 间距 ──
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,

    // ── 阴影 ──
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.04)',
    boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.08)',
  },

  components: {
    Layout: {
      siderBg: '#FFFFFF',
      headerBg: '#FFFFFF',
      bodyBg: '#F2F3F5',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: '#E8F2FF',
      itemSelectedColor: '#165DFF',
      itemHeight: 44,
      iconSize: 20,
    },
    Card: {
      paddingLG: 24,
    },
    Table: {
      headerBg: '#F7F8FA',
      headerColor: '#4E5969',
      rowHoverBg: '#F7F8FA',
      borderColor: '#E5E6EB',
    },
    Tag: {
      defaultBg: '#F2F3F5',
      defaultColor: '#4E5969',
    },
  },
};

export default theme;
