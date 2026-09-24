import { createPriceSeriesMock } from '../mocks/priceSeriesMockData';
import { validatePriceResponse } from '../utils/validatePriceResponse';
import httpClient from './httpClient';

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

export const getStockPrices = async (stockCode, period, minuteInterval = 1, { realData = false } = {}) => {
  if (useMocks && !realData) {
    return {
      success: true,
      code: 'SUCCESS',
      message: '화면용 가격 목업 응답',
      data: validatePriceResponse(createPriceSeriesMock(stockCode, period)),
    };
  }

  const response = await httpClient.get(`/v1/stocks/${stockCode}/prices`, {
    params: {
      period,
      ...(period === 'MINUTE' ? { interval: minuteInterval } : {}),
    },
  });
  const payload = response.data;
  if (!payload?.success) throw new Error(payload?.message || '가격 조회에 실패했습니다.');
  const candles = (payload.data || []).map((candle) => ({
    date: candle.timestamp || candle.businessDate,
    open: candle.open,
    high: candle.high,
    low: candle.low,
    close: candle.close,
    volume: candle.volume,
  }));
  const latest = candles.at(-1);
  const normalized = {
    stockCode,
    period,
    status: candles.length >= 2 ? 'SUCCESS' : 'INSUFFICIENT_DATA',
    statusMessage: candles.length >= 2
      ? '키움 차트 전문 조회 데이터입니다.'
      : '선택한 주기의 차트 데이터가 부족합니다.',
    isLatest: true,
    baseDate: latest?.date || null,
    lastCollectedAt: null,
    source: `KIWOOM_CHART_${period}`,
    candles,
  };
  return {
    ...payload,
    data: validatePriceResponse(normalized),
  };
};
