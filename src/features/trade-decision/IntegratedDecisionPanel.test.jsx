import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IntegratedDecisionPanel from './IntegratedDecisionPanel';
import * as api from '../../api/tradeDecisionApi';

vi.mock('../../api/tradeDecisionApi', () => ({
  listDecisions: vi.fn(), getDecision: vi.fn(), startIntegratedDecision: vi.fn(), getDecisionComparison: vi.fn(), getDecisionValidity: vi.fn(), startSnapshot: vi.fn(),
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
  it('compares forward amounts without mixing different capital bases', async () => {
    api.listDecisions.mockResolvedValue({ items: [{ id: saved.id, mode: 'INTEGRATED_DECISION' }], hasMore: false });
    api.getDecision.mockResolvedValue(saved);
    api.getDecisionComparison.mockResolvedValue({ status: 'READY_AMOUNT', forwardPnlDifferenceAmount: 150.25, plans: [{ id: 'q', role: 'AI_FINAL', outcome: { status: 'CLOSED', basis: 'INTEGER_SHARE_FORWARD_SIMULATION', netReturnPct: 2, netPnlAmount: 200.25, remainingQuantity: 0 } }] });
    render(<IntegratedDecisionPanel snapshotId="snapshot" stockCode="005930" aiConfigured />);
    expect(await screen.findByText('엔진 대비 모의 손익 차이: 150.25원')).toBeInTheDocument();
    expect(screen.getByText(/수량 기준 모의 손익: 200.25원/)).toBeInTheDocument();
    expect(screen.getByText(/추가 투입 금액이 달라/)).toBeInTheDocument();
    expect(screen.queryByText(/엔진 대비 차이:.*%p/)).toBeNull();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    api.listDecisions.mockResolvedValue({ items: [], hasMore: false });
    api.getDecisionComparison.mockResolvedValue({ status: 'WAITING_DATA', plans: [] });
    api.startIntegratedDecision.mockResolvedValue(saved);
    api.getDecisionValidity.mockResolvedValue({ status: 'VALID', researchStatus: 'MISSING', requiresAnalysisRefresh: false, requiresResearchRefresh: true,
      reasonCodes: [], validUntil: '2026-11-18T11:00:00Z', nextReviewAt: '2026-11-16T11:00:00Z', elapsedTradingDays: 0, evaluatedAt: '2026-11-16T10:00:00Z' });
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
  it('shows expiry separately from the saved action and collects a new snapshot only on request', async () => {
    api.listDecisions.mockResolvedValue({ items: [{ id: saved.id, mode: 'INTEGRATED_DECISION' }], hasMore: false });
    api.getDecision.mockResolvedValue(saved);
    api.getDecisionValidity.mockResolvedValue({ status: 'EXPIRED', requiresAnalysisRefresh: true, requiresResearchRefresh: true, reasonCodes: ['SIGNAL_EXPIRED'],
      validUntil: '2026-11-16T11:00:00Z', nextReviewAt: null, elapsedTradingDays: 1, signalRemainingTradingDays: 0, evaluatedAt: '2026-11-17T11:00:00Z' });
    api.startSnapshot.mockResolvedValue({ id: 'new-snapshot', status: 'PENDING' });
    render(<IntegratedDecisionPanel snapshotId="snapshot" stockCode="005930" aiConfigured />);
    await screen.findByText('판단 만료');
    expect(screen.getByText('저장 당시: 신규 진입 대기')).toBeTruthy();
    expect(screen.getByRole('button', { name: '현재 잔고로 새 판단' }).disabled).toBe(true);
    expect(api.startSnapshot).not.toHaveBeenCalled(); expect(api.startIntegratedDecision).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '최신 종합분석 새로 수집' }));
    const link = await screen.findByRole('link', { name: '새 종합분석 결과 열기' });
    expect(link.getAttribute('href')).toBe('/unified-analysis/stock?snapshot=new-snapshot');
    expect(api.startSnapshot).toHaveBeenCalledWith('005930', 'fixed-key', expect.any(AbortSignal));
    expect(api.startIntegratedDecision).not.toHaveBeenCalled();
  });
  it('checks validity again on focus without generating a new judgment', async () => {
    api.listDecisions.mockResolvedValue({ items: [{ id: saved.id, mode: 'INTEGRATED_DECISION' }], hasMore: false });
    api.getDecision.mockResolvedValue(saved);
    render(<IntegratedDecisionPanel snapshotId="snapshot" stockCode="005930" aiConfigured />);
    await screen.findByText('저장 자료 기준 유효');
    api.getDecisionValidity.mockResolvedValue({ status: 'REVIEW_REQUIRED', requiresAnalysisRefresh: true, requiresResearchRefresh: true, reasonCodes: ['NEW_TRADING_SESSION_COMPLETED'], evaluatedAt: '2026-11-16T11:00:00Z' });
    fireEvent.focus(window);
    await screen.findByText('재검토 필요');
    expect(api.startSnapshot).not.toHaveBeenCalled(); expect(api.startIntegratedDecision).not.toHaveBeenCalled();
  });
  it('directs after-EOD refresh to current completed market results instead of collecting the previous day again', async () => {
    api.listDecisions.mockResolvedValue({ items: [{ id: saved.id, mode: 'INTEGRATED_DECISION' }], hasMore: false });
    api.getDecision.mockResolvedValue(saved);
    api.getDecisionValidity.mockResolvedValue({ status: 'REVIEW_REQUIRED', requiresAnalysisRefresh: true, requiresResearchRefresh: true,
      reasonCodes: ['NEW_TRADING_SESSION_COMPLETED'], refreshMethod: 'EOD_RESULTS', evaluatedAt: '2026-11-17T12:00:00Z' });
    render(<IntegratedDecisionPanel snapshotId="snapshot" stockCode="005930" aiConfigured />);
    const link = await screen.findByRole('link', { name: '장 마감 종합분석 확인' });
    expect(link.getAttribute('href')).toBe('/unified-analysis');
    expect(screen.queryByRole('button', { name: '최신 종합분석 새로 수집' })).toBeNull();
    expect(api.startSnapshot).not.toHaveBeenCalled(); expect(api.startIntegratedDecision).not.toHaveBeenCalled();
  });
  it('fails closed on validity lookup errors and offers research navigation independently', async () => {
    api.listDecisions.mockResolvedValue({ items: [{ id: saved.id, mode: 'INTEGRATED_DECISION' }], hasMore: false });
    api.getDecision.mockResolvedValue(saved);const onReviewResearch = vi.fn();
    render(<IntegratedDecisionPanel snapshotId="snapshot" stockCode="005930" aiConfigured onReviewResearch={onReviewResearch} />);
    fireEvent.click(await screen.findByRole('button', { name: '뉴스·공시 보완으로 이동' }));
    expect(onReviewResearch).toHaveBeenCalledTimes(1);
    api.getDecisionValidity.mockRejectedValue(new Error('조회 실패'));
    fireEvent.click(screen.getByRole('button', { name: '유효 상태 다시 확인' }));
    await screen.findByText(/현재 유효 상태를 확인하지 못했습니다/);
    expect(screen.getByRole('button', { name: '현재 잔고로 새 판단' }).disabled).toBe(true);
    expect(api.startIntegratedDecision).not.toHaveBeenCalled();
  });
});
