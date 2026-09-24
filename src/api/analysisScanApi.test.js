import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './analysisScanApi';
const client = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('./httpClient', () => ({ default: client }));
describe('전체 분석 API', () => {
  beforeEach(() => { vi.clearAllMocks(); client.get.mockResolvedValue({ data: { success: true, data: [] } }); client.post.mockResolvedValue({ data: { success: true, data: { runId: 'a' } } }); });
  it('실행 키를 헤더에 전달한다', async () => {
    expect(await api.startAnalysisScan({ market: 'ALL' }, 'key')).toEqual({ runId: 'a' });
    expect(client.post).toHaveBeenCalledWith('/v1/analysis-scans', { market: 'ALL' }, { headers: { 'Idempotency-Key': 'key' } });
  });
  it('선택한 실행 ID로 검색하고 상세를 읽는다', async () => {
    await api.getAnalysisScanItems('run', { page: 1, minRewardRisk: 2 }); await api.getAnalysisScanDetail('run', '005930');
    expect(client.get).toHaveBeenCalledWith('/v1/analysis-scans/run/items', expect.objectContaining({ params: { page: 1, minRewardRisk: 2 } }));
    expect(client.get).toHaveBeenCalledWith('/v1/analysis-scans/run/items/005930', { signal: undefined });
    expect(client.post).not.toHaveBeenCalled();
  });
  it('실패 응답을 거부한다', async () => {
    client.get.mockResolvedValue({ data: { success: false, message: '실패' } });
    await expect(api.listAnalysisScans()).rejects.toThrow('실패');
  });
});
