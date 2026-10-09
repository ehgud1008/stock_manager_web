import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api/tradeDecisionApi';
import UnifiedDecisionTab from './UnifiedDecisionTab';

vi.mock('../../api/tradeDecisionApi', async original => ({ ...await original(), previewDecisionPlan: vi.fn().mockResolvedValue(null), previewSourcePlan: vi.fn().mockResolvedValue(null),
  getDecisionCapabilities: vi.fn(), findImportedSnapshot: vi.fn(), startSnapshot: vi.fn(), getSnapshot: vi.fn(),
  listDecisions: vi.fn(), getDecision: vi.fn(), startDecision: vi.fn(), waitForJob: vi.fn(),
}));
const snapshot = { id: 'snapshot-a', status: 'SUCCEEDED', stockCode: '005930' };
const decision = { id: 'decision-a', snapshotId: 'snapshot-a', status: 'SUCCEEDED', context: { positionStatus: 'NOT_HELD', horizonTradingDays: 10 },
  result: { finalAction: 'WAIT', generationMode: 'POLICY_ONLY', context: { positionStatus: 'NOT_HELD', horizonTradingDays: 10 }, policy: { priceDate: '2026-10-05', plan: null } } };
const setup = () => render(<UnifiedDecisionTab runId="run-a" stockCode="005930" priceDate="2026-10-05" />);
describe('UnifiedDecisionTab', () => {
  beforeEach(() => {
    vi.clearAllMocks(); sessionStorage.clear();window.history.replaceState({}, '', '/unified-analysis');
    api.getDecisionCapabilities.mockResolvedValue({ enabled: true, aiConfigured: true });
    api.findImportedSnapshot.mockResolvedValue(null);api.listDecisions.mockResolvedValue({ items: [], hasMore: false });
    api.startSnapshot.mockResolvedValue(snapshot);api.startDecision.mockResolvedValue(decision);
    api.waitForJob.mockImplementation(async j => j);
  });
  it('탭 진입은 선택 실행을 조회하며 작업을 생성하지 않는다', async () => {
    setup();expect(await screen.findByRole('button', { name: 'AI 상세 검토' })).toBeEnabled();
    expect(api.findImportedSnapshot).toHaveBeenCalledWith('005930', 'run-a', expect.any(AbortSignal));
    expect(api.startSnapshot).not.toHaveBeenCalled();expect(api.startDecision).not.toHaveBeenCalled();
  });
  it('버튼을 누를 때만 선택 실행을 복사하고 팝업 안에서 판단을 보여준다', async () => {
    setup();fireEvent.click(await screen.findByRole('button', { name: 'AI 상세 검토' }));
    expect(await screen.findByText('신규 진입 대기')).toBeInTheDocument();
    expect(api.startSnapshot).toHaveBeenCalledWith('005930', expect.any(String), expect.any(AbortSignal), { source: 'UNIFIED_RUN_ITEM', runId: 'run-a' });
    expect(api.startDecision).toHaveBeenCalledWith('snapshot-a', expect.any(Object), expect.any(String), expect.any(AbortSignal));
    expect(window.location.pathname).toBe('/unified-analysis');expect(window.location.search).toBe('');
    await waitFor(() => expect(api.listDecisions).toHaveBeenCalledWith('005930', expect.any(AbortSignal), 0, 'snapshot-a'));
  });
  it('재진입 시 해당 분석의 최근 판단을 조회만 해서 복원한다', async () => {
    api.findImportedSnapshot.mockResolvedValue(snapshot);
    api.listDecisions.mockResolvedValue({ items: [{ id: 'decision-a', snapshotId: 'snapshot-a', createdAt: 1, action: 'WAIT' }], hasMore: false });
    api.getDecision.mockResolvedValue(decision);
    setup();expect(await screen.findByText('신규 진입 대기')).toBeInTheDocument();
    expect(api.getDecision).toHaveBeenCalledWith('decision-a', expect.any(AbortSignal));
    expect(api.startSnapshot).not.toHaveBeenCalled();expect(api.startDecision).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: '해당 분석 열기' })).not.toBeInTheDocument();
  });
  it('미설정 상태와 조회 오류를 구분하고 실패 시 자동 생성하지 않는다', async () => {
    api.findImportedSnapshot.mockRejectedValueOnce(new Error('조회 실패')).mockResolvedValueOnce(null);
    setup();expect(await screen.findByText('조회 실패')).toBeInTheDocument();
    expect(api.startSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    expect(await screen.findByRole('button', { name: 'AI 상세 검토' })).toBeEnabled();
  });
  it('기능 비활성화이면 저장 테이블을 조회하지 않는다', async () => {
    api.getDecisionCapabilities.mockResolvedValue({ enabled: false, aiConfigured: false });
    setup();expect(await screen.findByText(/저장 분석 기능을 활성화한 후/)).toBeInTheDocument();
    expect(api.findImportedSnapshot).not.toHaveBeenCalled();
  });
  it('준비 중인 스냅샷은 기존 작업을 이어서 사용한다', async () => {
    const pending = { ...snapshot, status: 'RUNNING' };
    api.findImportedSnapshot.mockResolvedValue(pending);
    api.waitForJob.mockImplementation(async j => j.id === 'snapshot-a' ? snapshot : j);
    setup();fireEvent.click(await screen.findByRole('button', { name: 'AI 상세 검토' }));
    expect(await screen.findByText('신규 진입 대기')).toBeInTheDocument();
    expect(api.startSnapshot).not.toHaveBeenCalled();expect(api.startDecision).toHaveBeenCalledTimes(1);
  });
});
