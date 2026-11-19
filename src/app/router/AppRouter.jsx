import HoldingsPage from '../../pages/holdings/HoldingsPage';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import StockAnalysisPage from '../../pages/analysis/StockAnalysisPage';
import DailyReportsPage from '../../pages/analysis/DailyReportsPage';
import UnifiedAnalysisPage from '../../pages/analysis/UnifiedAnalysisPage';
import UnifiedSingleAnalysisPage from '../../pages/analysis/UnifiedSingleAnalysisPage';
import BacktestPage from '../../pages/backtest/BacktestPage';
import SwingBacktestPage from '../../pages/backtest/SwingBacktestPage';
import DashboardPage from '../../pages/dashboard/DashboardPage';
import NotFoundPage from '../../pages/not-found/NotFoundPage';
import ScreenerPage from '../../pages/screener/ScreenerPage';
import SettingsPage from '../../pages/settings/SettingsPage';
import DecisionBasketPage from '../../pages/analysis/DecisionBasketPage';
import DecisionStatisticsPage from '../../pages/analysis/DecisionStatisticsPage';
import BrokerAccountPage from '../../pages/holdings/BrokerAccountPage';
import { ROUTES } from '../../constants/routes';

function AnalysisArchiveRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set('archived', 'true');
  return <Navigate replace to={`${ROUTES.UNIFIED_ANALYSIS}?${params}`} />;
}

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/holdings" element={<HoldingsPage />} />
        <Route path="/holdings/broker" element={<BrokerAccountPage />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.ANALYSIS} element={<StockAnalysisPage />} />
        <Route path={ROUTES.DAILY_REPORTS} element={<DailyReportsPage />} />
        <Route path={ROUTES.UNIFIED_ANALYSIS} element={<UnifiedAnalysisPage />} />
        <Route path="/trade-decisions/basket" element={<DecisionBasketPage />} />
        <Route path="/trade-decisions/statistics" element={<DecisionStatisticsPage />} />
        <Route path={`${ROUTES.UNIFIED_ANALYSIS}/stock`} element={<UnifiedSingleAnalysisPage />} />
        <Route path="/analysis-scans" element={<AnalysisArchiveRedirect />} />
        <Route path={ROUTES.SCREENER} element={<ScreenerPage />} />
        <Route path={ROUTES.BACKTEST} element={<SwingBacktestPage />} />
        <Route path={`${ROUTES.BACKTEST}/data-validation`} element={<BacktestPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
