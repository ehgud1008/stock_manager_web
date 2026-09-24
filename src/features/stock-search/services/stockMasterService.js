export const STOCK_MARKET = Object.freeze({
  DOMESTIC: 'DOMESTIC',
  OVERSEAS: 'OVERSEAS',
});

const STOCK_MASTER_CONFIG = Object.freeze({
  [STOCK_MARKET.DOMESTIC]: {
    url: '/stocks/stock_master.txt',
    defaults: {},
  },
  [STOCK_MARKET.OVERSEAS]: {
    url: '/stocks/stock_us_master.txt',
    defaults: { marketType: 'US', stockType: 'ST' },
  },
});
const SEARCH_RESULT_LIMIT = 30;

const stockMasterPromises = new Map();

const normalizeMarket = (market) => {
  const normalized = market.trim().toUpperCase();
  if (normalized === '코스피') return 'KOSPI';
  if (normalized === '코스닥') return 'KOSDAQ';
  return normalized;
};

const normalizeSearchText = (value) => value.trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, '');

export const parseStockMaster = (text, defaults = {}) => text
  .replace(/^\uFEFF/, '')
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [stockCode, stockName, marketType, stockType] = line.split(',');
    const resolvedMarketType = marketType?.trim() || defaults.marketType;
    const resolvedStockType = stockType?.trim() || defaults.stockType;
    if (!stockCode || !stockName || !resolvedMarketType || !resolvedStockType) return null;
    return {
      stockCode: stockCode.trim(),
      stockName: stockName.trim(),
      marketType: normalizeMarket(resolvedMarketType),
      stockType: resolvedStockType,
    };
  })
  .filter(Boolean);

export const searchStockMaster = (stocks, query, limit = SEARCH_RESULT_LIMIT) => {
  const keyword = normalizeSearchText(query);
  if (!keyword) return [];

  return stocks
    .map((stock) => {
      const code = normalizeSearchText(stock.stockCode);
      const name = normalizeSearchText(stock.stockName);
      let rank = Number.POSITIVE_INFINITY;

      if (code === keyword || name === keyword) rank = 0;
      else if (code.startsWith(keyword)) rank = 1;
      else if (name.startsWith(keyword)) rank = 2;
      else if (code.includes(keyword)) rank = 3;
      else if (name.includes(keyword)) rank = 4;

      return { stock, rank };
    })
    .filter(({ rank }) => Number.isFinite(rank))
    .sort((left, right) => left.rank - right.rank
      || left.stock.stockCode.localeCompare(right.stock.stockCode))
    .slice(0, limit)
    .map(({ stock }) => stock);
};

export const getStockByCode = (stocks, stockCode) => (
  stocks.find((stock) => stock.stockCode === stockCode) || null
);

export const loadStockMaster = async (market = STOCK_MARKET.DOMESTIC) => {
  const config = STOCK_MASTER_CONFIG[market] || STOCK_MASTER_CONFIG[STOCK_MARKET.DOMESTIC];

  if (!stockMasterPromises.has(market)) {
    const promise = fetch(config.url)
      .then((response) => {
        if (!response.ok) throw new Error('종목 목록을 불러오지 못했습니다.');
        return response.text();
      })
      .then((text) => parseStockMaster(text, config.defaults))
      .catch((error) => {
        stockMasterPromises.delete(market);
        throw error;
      });

    stockMasterPromises.set(market, promise);
  }

  return stockMasterPromises.get(market);
};
