import { beforeEach, describe, expect, it, vi } from 'vitest';
import httpClient from './httpClient';
import { getStockPrices } from './priceApi';

vi.mock('./httpClient', () => ({
  default: { get: vi.fn() },
}));

const apiPayload = {
  success: true,
  code: 'SUCCESS',
  message: '조회 성공',
  data: [
    {
      timestamp: '2026-08-22T15:29:00+09:00',
      businessDate: '2026-08-22',
      open: 71000,
      high: 71600,
      low: 70800,
      close: 71500,
      volume: 320000,
    },
    {
      timestamp: '2026-08-22T15:30:00+09:00',
      businessDate: '2026-08-22',
      open: 71500,
      high: 71800,
      low: 71200,
      close: 71700,
      volume: 410000,
    },
  ],
};

describe('priceApi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('분봉 조회 시 전문 주기와 간격을 전달하고 timestamp를 사용한다', async () => {
    httpClient.get.mockResolvedValue({ data: apiPayload });

    const response = await getStockPrices('005930', 'MINUTE', 5);

    expect(httpClient.get).toHaveBeenCalledWith('/v1/stocks/005930/prices', {
      params: { period: 'MINUTE', interval: 5 },
    });
    expect(response.data.candles[0].date).toBe('2026-08-22T15:29:00+09:00');
    expect(response.data.source).toBe('KIWOOM_CHART_MINUTE');
  });

  it('주·월봉 조회에는 분봉 간격을 전송하지 않는다', async () => {
    httpClient.get.mockResolvedValue({ data: apiPayload });

    await getStockPrices('005930', 'WEEK');
    await getStockPrices('005930', 'MONTH');

    expect(httpClient.get).toHaveBeenNthCalledWith(1, '/v1/stocks/005930/prices', {
      params: { period: 'WEEK' },
    });
    expect(httpClient.get).toHaveBeenNthCalledWith(2, '/v1/stocks/005930/prices', {
      params: { period: 'MONTH' },
    });
  });
});
