export const PRICE_DATA_STATUS = Object.freeze({
  SUCCESS: 'SUCCESS',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  COLLECTION_FAILED: 'COLLECTION_FAILED',
});

export const PRICE_PERIOD = Object.freeze({
  MINUTE: 'MINUTE',
  DAY: 'DAY',
  WEEK: 'WEEK',
  MONTH: 'MONTH',
});

export const PRICE_PERIOD_OPTIONS = Object.freeze([
  Object.freeze({ value: PRICE_PERIOD.MINUTE, label: '1분', chartLabel: '1분봉', interval: 1 }),
  Object.freeze({ value: PRICE_PERIOD.DAY, label: '일', chartLabel: '일봉', interval: 1 }),
  Object.freeze({ value: PRICE_PERIOD.WEEK, label: '주', chartLabel: '주봉', interval: 1 }),
  Object.freeze({ value: PRICE_PERIOD.MONTH, label: '월', chartLabel: '월봉', interval: 1 }),
]);

export const getPricePeriodOption = (period) => PRICE_PERIOD_OPTIONS
  .find((option) => option.value === period) || PRICE_PERIOD_OPTIONS[1];
