import { http, HttpResponse, delay } from 'msw';
import { mockDashboardData } from '../data/dashboard';

/**
 * MSW API Handlers
 * 拦截前端请求，返回 Mock 数据
 */

export const handlers = [
  // ── Dashboard API ──

  // GET /api/v1/dashboard — 获取数据看板全量数据
  http.get('/api/v1/dashboard', async () => {
    await delay(300); // 模拟网络延迟
    return HttpResponse.json({
      code: 0,
      data: mockDashboardData,
    });
  }),

  // GET /api/v1/dashboard/metrics — 仅获取 KPI 指标卡片
  http.get('/api/v1/dashboard/metrics', async () => {
    await delay(200);
    return HttpResponse.json({
      code: 0,
      data: mockDashboardData.kpiCards,
      lastUpdated: mockDashboardData.lastUpdated,
    });
  }),

  // GET /api/v1/dashboard/trends — 获取趋势数据
  http.get('/api/v1/dashboard/trends', async () => {
    await delay(200);
    return HttpResponse.json({
      code: 0,
      data: mockDashboardData.trendData,
    });
  }),

  // GET /api/v1/alerts — 获取告警列表（支持分页和筛选）
  http.get('/api/v1/alerts', async ({ request }) => {
    await delay(300);
    const url = new URL(request.url);
    const level = url.searchParams.get('level');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '20');

    let filtered = [...mockDashboardData.alertList];
    if (level) {
      filtered = filtered.filter((a) => a.level === level);
    }

    return HttpResponse.json({
      code: 0,
      data: {
        data: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
        page,
        pageSize,
      },
    });
  }),
];
