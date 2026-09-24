export const RECENT_STOCKS_STORAGE_KEY = 'stockscope.recentStocks';
const MAX_RECENT_STOCKS = 8;

const isValidStock = (stock) => (
  stock
  && typeof stock.stockCode === 'string'
  && typeof stock.stockName === 'string'
  && typeof stock.marketType === 'string'
);

export const readRecentStocks = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_STOCKS_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(isValidStock).slice(0, MAX_RECENT_STOCKS) : [];
  } catch {
    return [];
  }
};

export const saveRecentStock = (stock) => {
  if (!isValidStock(stock)) return readRecentStocks();

  const nextStocks = [
    stock,
    ...readRecentStocks().filter((item) => (
      item.stockCode !== stock.stockCode || item.marketType !== stock.marketType
    )),
  ].slice(0, MAX_RECENT_STOCKS);

  localStorage.setItem(RECENT_STOCKS_STORAGE_KEY, JSON.stringify(nextStocks));
  return nextStocks;
};
