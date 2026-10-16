export const ROUTES = Object.freeze({
  DASHBOARD: '/',
  ANALYSIS: '/analysis/:stockCode',
  UNIFIED_ANALYSIS: '/unified-analysis',
  DAILY_REPORTS: '/daily-reports',
  SCREENER: '/screener',
  BACKTEST: '/backtest',
  SETTINGS: '/settings',
});

export const getAnalysisRoute = (stockCode) => `/analysis/${stockCode}`;
