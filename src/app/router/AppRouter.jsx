import { Route, Routes } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import StockAnalysisPage from '../../pages/analysis/StockAnalysisPage';
import AnalysisScanPage from '../../pages/analysis/AnalysisScanPage';
import UnifiedAnalysisPage from '../../pages/analysis/UnifiedAnalysisPage';
import UnifiedSingleAnalysisPage from '../../pages/analysis/UnifiedSingleAnalysisPage';
import BacktestPage from '../../pages/backtest/BacktestPage';
import DashboardPage from '../../pages/dashboard/DashboardPage';
import NotFoundPage from '../../pages/not-found/NotFoundPage';
import ScreenerPage from '../../pages/screener/ScreenerPage';
import SettingsPage from '../../pages/settings/SettingsPage';
import { ROUTES } from '../../constants/routes';

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.ANALYSIS} element={<StockAnalysisPage />} />
        <Route path={ROUTES.UNIFIED_ANALYSIS} element={<UnifiedAnalysisPage />} />
        <Route path={`${ROUTES.UNIFIED_ANALYSIS}/stock`} element={<UnifiedSingleAnalysisPage />} />
        <Route path="/analysis-scans" element={<AnalysisScanPage />} />
        <Route path={ROUTES.SCREENER} element={<ScreenerPage />} />
        <Route path={ROUTES.BACKTEST} element={<BacktestPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
