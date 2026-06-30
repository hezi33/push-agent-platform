import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import zhCN from 'antd/locale/zh_CN';
import theme from './theme/tokens';
import AppLayout from './components/layout/AppLayout';

// 页面
import Dashboard from './pages/Dashboard';
import AnomalyDetail from './pages/AnomalyDetail';
import Attribution from './pages/Attribution';
import Strategy from './pages/Strategy';
import History from './pages/History';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 60 * 1000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={theme} locale={zhCN}>
        <AntApp>
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/anomaly" element={<AnomalyDetail />} />
                <Route path="/anomaly/:alertId" element={<AnomalyDetail />} />
                <Route path="/attribution" element={<Attribution />} />
                <Route path="/attribution/:reportId" element={<Attribution />} />
                <Route path="/strategy" element={<Strategy />} />
                <Route path="/strategy/:suggestionId" element={<Strategy />} />
                <Route path="/history" element={<History />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
