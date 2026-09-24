export const ROUTES = Object.freeze({
  DASHBOARD: '/',
  ANALYSIS: '/analysis/:stockCode',
  UNIFIED_ANALYSIS: '/unified-analysis',
  SCREENER: '/screener',
  BACKTEST: '/backtest',
  SETTINGS: '/settings',
});

export const getAnalysisRoute = (stockCode) => `/analysis/${stockCode}`;
