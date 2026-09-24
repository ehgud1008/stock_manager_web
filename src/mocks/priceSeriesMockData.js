import { PRICE_DATA_STATUS, PRICE_PERIOD } from '../constants/priceDataStatuses';

const createTrendCloses = (count, start, end) => Array.from({ length: count }, (_, index) => {
  if (index === count - 1) return end;
  const progress = index / (count - 1);
  const trend = start + ((end - start) * progress);
  const wave = (Math.sin(index * 0.72) * 850) + (Math.cos(index * 0.27) * 420);
  return Math.round((trend + wave) / 100) * 100;
});

const createBusinessDates = (count, endDate) => {
  const dates = [];
  const cursor = new Date(`${endDate}T00:00:00Z`);
  while (dates.length < count) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.unshift(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates;
};

const createPeriodDates = (period, count) => {
  if (period === PRICE_PERIOD.MINUTE) {
    const end = Date.parse('2026-07-24T15:30:00+09:00');
    return Array.from(
      { length: count },
      (_, index) => new Date(end - ((count - index - 1) * 60_000)).toISOString(),
    );
  }
  if (period === PRICE_PERIOD.WEEK) {
    return Array.from(
      { length: count },
      (_, index) => new Date(Date.UTC(2025, 1, 17 + (index * 7))).toISOString().slice(0, 10),
    );
  }
  if (period === PRICE_PERIOD.MONTH) {
    return Array.from(
      { length: count },
      (_, index) => new Date(Date.UTC(2019, 11 + index, 1)).toISOString().slice(0, 10),
    );
  }
  return createBusinessDates(count, '2026-07-24');
};

const PERIOD_SERIES = {
  [PRICE_PERIOD.MINUTE]: createTrendCloses(120, 70100, 71500),
  [PRICE_PERIOD.DAY]: createTrendCloses(80, 66500, 71500),
  [PRICE_PERIOD.WEEK]: createTrendCloses(80, 57000, 71500),
  [PRICE_PERIOD.MONTH]: createTrendCloses(80, 41000, 71500),
};

const createCandles = (period) => {
  const closes = PERIOD_SERIES[period] || PERIOD_SERIES[PRICE_PERIOD.DAY];
  const dates = createPeriodDates(period, closes.length);
  return closes.map((close, index) => {
    const previousClose = index === 0 ? close - 300 : closes[index - 1];
    const open = previousClose + (((index % 5) - 2) * 100);
    return {
      date: dates[index],
      open,
      high: Math.max(open, close) + 300 + ((index % 4) * 100),
      low: Math.min(open, close) - 300 - ((index % 3) * 100),
      close,
      volume: 7_500_000 + ((index * 1_337_777) % 12_000_000),
    };
  });
};

export const createPriceSeriesMock = (stockCode, period) => ({
  stockCode,
  period,
  status: PRICE_DATA_STATUS.SUCCESS,
  statusMessage: '',
  isLatest: true,
  baseDate: '2026-07-24',
  lastCollectedAt: '2026-07-24T18:10:00+09:00',
  source: 'MOCK',
  candles: createCandles(period),
});
