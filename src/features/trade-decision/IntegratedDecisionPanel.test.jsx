import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IntegratedDecisionPanel from './IntegratedDecisionPanel';
import * as api from '../../api/tradeDecisionApi';

vi.mock('../../api/tradeDecisionApi', () => ({
  listDecisions: vi.fn(), getDecision: vi.fn(), startIntegratedDecision: vi.fn(), getDecisionComparison: vi.fn(),
  requestIdentity: vi.fn(() => 'fixed-key'), waitForJob: vi.fn(async job => job),
  isJobPending: job => ['PENDING', 'RUNNING', 'RETRYABLE_FAILED'].includes(job?.status),
  decisionErrorMessage: code => code,
}));
const saved = {
  id: 'integrated-one', snapshotId: 'snapshot', mode: 'INTEGRATED_DECISION', status: 'SUCCEEDED',
  result: {
    engineAction: 'BUY', aiAction: 'BUY', decisionAction: 'WAIT', blockReasons: ['RESEARCH_MISSING'],
    policy: { priceDate: '2026-11-13', capturedAt: '2026-11-16T10:00:00Z', holding: { holding: { revision: 4 } }, research: { status: 'MISSING', sources: [] } },
    aiReview: { conclusion: '추세 확인이 필요합니다.', supportingReasons: [], opposingReasons: [], reviewConditions: ['새 자료 확인 시 재검토합니다.'], missingInformation: [] },
  },
};
describe('IntegratedDecisionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listDecisions.mockResolvedValue({ items: [], hasMore: false });
    api.getDecisionComparison.mockResolvedValue({ status: 'WAITING_DATA', plans: [] });
    api.startIntegratedDecision.mockResolvedValue(saved);
  });
  it('only reads history on mount and starts a guarded judgment explicitly', async () => {
    render(<IntegratedDecisionPanel snapshotId="snapshot" stockCode="005930" aiConfigured />);
    await waitFor(() => expect(api.listDecisions).toHaveBeenCalled());
    expect(api.startIntegratedDecision).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '통합 판단 실행' }));
    await screen.findByText('추세 확인이 필요합니다.');
    expect(api.startIntegratedDecision).toHaveBeenCalledWith('snapshot', { horizonTradingDays: 20 }, 'fixed-key', expect.any(AbortSignal));
    expect(screen.getByText('완료된 외부 리서치가 없습니다.')).toBeTruthy();
    expect(screen.getByText('실행 검증 전')).toBeTruthy();
    expect(screen.getByText(/잔고 버전 4/)).toBeTruthy();
  });
  it('restores only integrated history and displays observed comparison', async () => {
    api.listDecisions.mockResolvedValue({ items: [{ id: 'news', mode: 'NEWS_INSIGHTS' }, { id: saved.id, mode: 'INTEGRATED_DECISION' }], hasMore: false });
    api.getDecision.mockResolvedValue(saved);
    api.getDecisionComparison.mockResolvedValue({ status: 'READY', netReturnDifferencePct: 2, plans: [{ id: 'p', role: 'ENGINE', outcome: { status: 'CLOSED', netReturnPct: -2, ambiguous: true } }] });
    render(<IntegratedDecisionPanel snapshotId="snapshot" stockCode="005930" aiConfigured />);
    await screen.findByText('엔진 대비 차이: 2.00%p');
    expect(api.getDecision).toHaveBeenCalledWith(saved.id, expect.any(AbortSignal));
    expect(api.getDecision).not.toHaveBeenCalledWith('news', expect.anything());
    expect(screen.getByText(/같은 일봉 목표·손절 접촉/)).toBeTruthy();
  });
  it('prepares imported snapshots and keeps order sizing unavailable', async () => {
    const prepareSnapshot = vi.fn().mockResolvedValue({ id: 'snapshot' });
    render(<IntegratedDecisionPanel stockCode="005930" aiConfigured prepareSnapshot={prepareSnapshot} />);
    fireEvent.click(screen.getByRole('button', { name: '통합 판단 실행' }));
    await screen.findByText('추세 확인이 필요합니다.');
    expect(prepareSnapshot).toHaveBeenCalled();
    expect(screen.getByText(/매수 수량 미산출/)).toBeTruthy();
  });
  it('rejects invalid periods and allows read-only history without AI configuration', () => {
    render(<IntegratedDecisionPanel snapshotId="snapshot" stockCode="005930" aiConfigured={false} />);
    expect(screen.getByRole('button', { name: '통합 판단 실행' }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('관측 기간 (거래일)'), { target: { value: '253' } });
    expect(api.startIntegratedDecision).not.toHaveBeenCalled();
  });
});
