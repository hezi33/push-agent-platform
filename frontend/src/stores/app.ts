import { create } from 'zustand';

interface AppState {
  /** 侧边栏收缩 */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** 未读通知数 */
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  unreadCount: 2, // Mock: 初始 2 条未读
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
