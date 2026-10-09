import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import httpClient from './httpClient';
import { getSnapshot, isJobPending, pause, requestIdentity, startDecision, waitForJob } from './tradeDecisionApi';
vi.mock('./httpClient', () => ({ default: { post: vi.fn(), get: vi.fn() } }));

describe('tradeDecisionApi', () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); });
  afterEach(() => vi.useRealTimers());
  it('판단 입력과 멱등키를 전송하고 응답만 반환한다', async () => {
    httpClient.post.mockResolvedValue({ data: { success: true, data: { id: 'decision' } } });
    const body = { positionStatus: 'NOT_HELD', horizonTradingDays: 10 };
    expect(await startDecision('snapshot', body, 'stable-key')).toEqual({ id: 'decision' });
    expect(httpClient.post).toHaveBeenCalledWith('/v1/analysis-snapshots/snapshot/decisions', body, expect.objectContaining({ headers: { 'Idempotency-Key': 'stable-key' } }));
  });
  it('실패 응답을 완료 데이터로 사용하지 않는다', async () => {
    httpClient.get.mockResolvedValue({ data: { success: false, message: '분석 없음' } });
    await expect(getSnapshot('missing')).rejects.toThrow('분석 없음');
  });
  it('동일 입력의 네트워크 재시도에는 같은 키를 재사용한다', () => {
    const first = requestIdentity('key', { horizon: 10 });
    expect(requestIdentity('key', { horizon: 10 })).toBe(first);
    expect(requestIdentity('key', { horizon: 20 })).not.toBe(first);
    expect(requestIdentity('key', { horizon: 10 }, true)).not.toBe(first);
  });
  it('조회는 처리 완료 시 종료하고 실패 상태는 그대로 반환한다', async () => {
    vi.useFakeTimers(); const read = vi.fn().mockResolvedValue({ id: 'job', status: 'FAILED', errorCode: 'AI_NOT_CONFIGURED' });
    const result = waitForJob({ id: 'job', status: 'PENDING' }, read, new AbortController().signal);
    await vi.advanceTimersByTimeAsync(2000);
    expect((await result).status).toBe('FAILED'); expect(read).toHaveBeenCalledTimes(1);
    expect(isJobPending({ status: 'FAILED' })).toBe(false);
  });
  it('화면 이탈 시 대기를 취소한다', async () => {
    const c = new AbortController(); const result = pause(30000, c.signal); c.abort();
    await expect(result).rejects.toMatchObject({ name: 'AbortError' });
  });
});
