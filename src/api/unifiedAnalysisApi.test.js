import { beforeEach, describe, expect, it, vi } from 'vitest';
import httpClient from './httpClient';
import { analyzeUnifiedStock, startUnifiedRun, getUnifiedItems, getUnifiedDetail } from './unifiedAnalysisApi';
import { unifiedAnalysisFixture } from '../test/unifiedAnalysisFixtures';

vi.mock('./httpClient', () => ({ default: { post: vi.fn(), get: vi.fn() } }));
describe('unifiedAnalysisApi', () => {
  beforeEach(() => vi.clearAllMocks());
  it('전체 실행 키와 고정 실행의 목록·상세 경로를 전송한다', async () => {
    httpClient.post.mockResolvedValue({ data: { success: true, data: { runId: 'run-1' } } });
    httpClient.get.mockResolvedValue({ data: { success: true, data: {} } });
    await startUnifiedRun({ market: 'KOSPI' }, 'key-1');
    expect(httpClient.post).toHaveBeenCalledWith('/v1/unified-analysis/runs', { market: 'KOSPI' }, { headers: { 'Idempotency-Key': 'key-1' } });
    const signal = new AbortController().signal;
    await getUnifiedItems('run-1', { stage: 6 }, signal);
    expect(httpClient.get).toHaveBeenCalledWith('/v1/unified-analysis/runs/run-1/items', { params: { stage: 6 }, signal });
    await getUnifiedDetail('run-1', '005930', signal);
    expect(httpClient.get).toHaveBeenCalledWith('/v1/unified-analysis/runs/run-1/items/005930', { signal });
  });
  it('전용 서버 API와 긴 수집 시간 제한을 사용한다', async () => {
    const data = unifiedAnalysisFixture();
    httpClient.post.mockResolvedValue({ data: { success: true, data } });
    const signal = new AbortController().signal;
    expect(await analyzeUnifiedStock('005930', signal)).toEqual(data);
    expect(httpClient.post).toHaveBeenCalledWith('/v1/stocks/005930/unified-analysis', {}, { signal, timeout: 120000 });
  });
  it('다른 종목의 결과를 표시하지 않는다', async () => {
    httpClient.post.mockResolvedValue({ data: { success: true, data: unifiedAnalysisFixture('000660') } });
    await expect(analyzeUnifiedStock('005930')).rejects.toThrow('요청한 종목');
  });
  it('실패 응답과 불완전한 응답을 오류로 표시한다', async () => {
    httpClient.post.mockResolvedValueOnce({ data: { success: false, message: '수집 실패' } });
    await expect(analyzeUnifiedStock('005930')).rejects.toThrow('수집 실패');
    httpClient.post.mockResolvedValueOnce({ data: { success: true, data: {} } });
    await expect(analyzeUnifiedStock('005930')).rejects.toThrow('결과를 확인');
  });
});
