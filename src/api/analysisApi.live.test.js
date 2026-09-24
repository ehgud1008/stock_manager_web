import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { completedAnalysisMock } from '../mocks/analysisMockData';

const client = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('./httpClient', () => ({ default: client }));
const request = { analysisMode: 'SWING', baseDate: completedAnalysisMock.baseDate, forceRecalculate: true };

describe('실제 종목 분석 API', () => {
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubEnv('VITE_USE_MOCKS', 'true'); });
  afterEach(() => vi.unstubAllEnvs());
  it('목업 설정에서도 실제 API를 호출하고 실행 중 요청만 공유한다', async () => {
    let finish;
    client.post.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { analyzeStockLive } = await import('./analysisApi');
    const first = analyzeStockLive('005930', request);
    expect(analyzeStockLive('005930', request)).toBe(first);
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledWith('/v1/stocks/005930/analysis', request, { timeout: 120000 });
    finish({ data: { success: true, data: completedAnalysisMock } });
    expect((await first).data.totalScore).toBe(72.5);
    client.post.mockResolvedValue({ data: { success: true, data: completedAnalysisMock } });
    await analyzeStockLive('005930', request);
    expect(client.post).toHaveBeenCalledTimes(2);
  });
  it.each([
    { success: false, message: '분석 실패' },
    { success: true, data: { ...completedAnalysisMock, stockCode: '000660' } },
    { success: true, data: { ...completedAnalysisMock, analysisMode: 'SHORT_TERM' } },
    { success: true, data: { ...completedAnalysisMock, status: 'FAILED' } },
    { success: true, data: { ...completedAnalysisMock, baseDate: '2000-01-01' } },
  ])('실패 또는 다른 종목·모드·날짜 결과를 거부하고 재요청할 수 있다', async (payload) => {
    client.post.mockResolvedValue({ data: payload });
    const { analyzeStockLive } = await import('./analysisApi');
    await expect(analyzeStockLive('005930', request)).rejects.toThrow();
    await expect(analyzeStockLive('005930', request)).rejects.toThrow();
    expect(client.post).toHaveBeenCalledTimes(2);
  });
  it('서로 다른 보유 정보의 실행 요청은 공유하지 않는다', async () => {
    const finishes = [];
    client.post.mockImplementation(() => new Promise(resolve => finishes.push(resolve)));
    const { analyzeStockLive } = await import('./analysisApi');
    const first = analyzeStockLive('005930', request);
    const second = analyzeStockLive('005930', { ...request, position: { held: false } });
    expect(second).not.toBe(first);
    expect(client.post).toHaveBeenCalledTimes(2);
    finishes.forEach(finish => finish({ data: { success: true, data: completedAnalysisMock } }));
    await Promise.all([first, second]);
  });
  it('차트 역시 목업 설정을 우회해 실제 가격을 조회한다', async () => {
    client.get.mockResolvedValue({ data: { success: true, data: [] } });
    const { getStockPrices } = await import('./priceApi');
    const response = await getStockPrices('005930', 'DAY', 1, { realData: true });
    expect(client.get).toHaveBeenCalledWith('/v1/stocks/005930/prices', { params: { period: 'DAY' } });
    expect(response.data.status).toBe('INSUFFICIENT_DATA');
    expect(response.data.candles).toEqual([]);
  });
});
