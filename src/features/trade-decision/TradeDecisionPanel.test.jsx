import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from '../../api/tradeDecisionApi';
import TradeDecisionPanel from './TradeDecisionPanel';
import { defaultPreferences } from './decisionPreferences';
const selectManual = () => { fireEvent.mouseDown(screen.getByLabelText('보유기간 결정')); fireEvent.click(screen.getByRole('option', { name: '기간 직접 지정' })); };

vi.mock('../../api/tradeDecisionApi', async original => ({ ...await original(), previewDecisionPlan: vi.fn().mockResolvedValue(null), previewSourcePlan: vi.fn().mockResolvedValue(null),
  listDecisions: vi.fn(), getDecision: vi.fn(), startDecision: vi.fn(), reviseDecision: vi.fn(), waitForJob: vi.fn(),
}));
const result = () => ({ id: 'decision-one', snapshotId: 'snapshot-one', status: 'SUCCEEDED', result: {
  finalAction: 'WAIT', generationMode: 'AI_REVIEWED', context: { positionStatus: 'NOT_HELD', horizonTradingDays: 10 },
  policy: { priceDate: '2026-10-05', plan: { entryFrom: 100, entryTo: 110, targets: [130], stopLoss: 90 }, rewardRisk: 1,
    limitations: '뉴스와 실시간 가격은 반영하지 않았습니다.', conditions: { UPSIDE: '상단 돌파', RANGE: '구간 유지', DOWNSIDE: '손절선 이탈' } },
  aiReview: { supportingReasons: [{ evidenceId: 'SIGNALS', explanation: '신호를 기다립니다.' }], opposingReasons: [{ evidenceId: 'TREND', explanation: '추세가 바뀔 수 있습니다.' }],
    scenarios: [{ conditionId: 'UPSIDE', response: '다시 확인합니다.' }, { conditionId: 'RANGE', response: '관찰합니다.' }, { conditionId: 'DOWNSIDE', response: '진입을 보류합니다.' }],
    missingInformation: [], reviewConditionIds: ['UPSIDE'] },
} });

describe('TradeDecisionPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();sessionStorage.clear();window.history.replaceState({}, '', '/unified-analysis/stock?snapshot=snapshot-one');
    api.listDecisions.mockResolvedValue({ items: [], hasMore: false });api.waitForJob.mockImplementation(async j => j);
    api.previewDecisionPlan.mockResolvedValue(null);api.previewSourcePlan.mockResolvedValue(null);
  });
  it('자동 AI 호출 없이 미설정 안내를 보여준다', async () => {
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured={false} />);
    expect(screen.getByRole('button', { name: 'AI 상세 검토' })).toBeDisabled();
    expect(await screen.findByText('저장된 판단이 없습니다.')).toBeInTheDocument();expect(api.startDecision).not.toHaveBeenCalled();
  });
  it('저장된 판단을 새로고침 후 조회만 하고 가격과 미검증 상태를 표시한다', async () => {
    window.history.replaceState({}, '', '?snapshot=snapshot-one&decision=decision-one');api.getDecision.mockResolvedValue(result());
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    expect(await screen.findByText('신규 진입 대기')).toBeInTheDocument();expect(screen.getByText('승률 미검증')).toBeInTheDocument();
    expect(screen.getByText('반대 근거')).toBeInTheDocument();expect(screen.getByText(/목표 130원/)).toBeInTheDocument();
    expect(api.startDecision).not.toHaveBeenCalled();
  });
  it('응답 유실 후 재요청할 때 멱등키를 유지한다', async () => {
    api.startDecision.mockRejectedValueOnce(new Error('연결 중단')).mockResolvedValueOnce(result());
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    fireEvent.click(screen.getByRole('button', { name: 'AI 상세 검토' }));expect(await screen.findByText('연결 중단')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'AI 상세 검토' }));
    await waitFor(() => expect(api.startDecision).toHaveBeenCalledTimes(2));
    expect(api.startDecision.mock.calls[0][2]).toBe(api.startDecision.mock.calls[1][2]);
  });
  it('AI 실패를 대기 의견으로 표시하지 않는다', async () => {
    api.startDecision.mockResolvedValue({ id: 'failed', snapshotId: 'snapshot-one', status: 'FAILED', errorCode: 'AI_INVALID_RESPONSE' });
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    fireEvent.click(screen.getByRole('button', { name: 'AI 상세 검토' }));
    expect(await screen.findByText(/AI 응답의 근거 또는 형식을 검증하지 못했습니다/)).toBeInTheDocument();
    expect(screen.queryByText('신규 진입 대기')).not.toBeInTheDocument();
  });
  it('기간 변경은 가격 계획만 조회하고 AI 작업을 만들지 않는다', async () => {
    api.previewDecisionPlan.mockImplementation(async (id, body) => ({ priceDate: '2026-10-05', horizonPlan: {
      horizonTradingDays: body.horizonTradingDays, lookbackBars: 40, status: 'NO_RESISTANCE', reason: '상단 저항 확인 필요', metrics: {}, focus: '기간별 관측' }, comparisons: [] }));
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    selectManual();
    expect(await screen.findByText(/10거래일 가격 계획/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('매수 후 예상 보유기간 (거래일)'), { target: { value: '20' } });
    expect(await screen.findByText(/20거래일 가격 계획/)).toBeInTheDocument();
    expect(api.previewDecisionPlan).toHaveBeenLastCalledWith('snapshot-one', { positionStatus: 'UNKNOWN', horizonTradingDays: 20, preferences: defaultPreferences }, expect.any(AbortSignal));
    expect(api.startDecision).not.toHaveBeenCalled();expect(api.reviseDecision).not.toHaveBeenCalled();
  });
  it('기간 변경 전의 늦은 조회 응답을 화면에 덮어쓰지 않는다', async () => {
    let resolveOld;
    api.previewDecisionPlan.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }))
      .mockResolvedValue({ horizonPlan: { horizonTradingDays: 20, status: 'NO_SUPPORT', reason: '새 기간 계획', metrics: {} } });
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    await waitFor(() => expect(api.previewDecisionPlan).toHaveBeenCalledTimes(1));
    selectManual();fireEvent.change(screen.getByLabelText('매수 후 예상 보유기간 (거래일)'), { target: { value: '20' } });
    expect(await screen.findByText('새 기간 계획')).toBeInTheDocument();
    resolveOld({ horizonPlan: { horizonTradingDays: 10, status: 'NO_SUPPORT', reason: '오래된 계획', metrics: {} } });
    await waitFor(() => expect(screen.queryByText('오래된 계획')).not.toBeInTheDocument());
  });
  it('가격 이력이 없는 과거 결과는 재분석을 안내하고 AI 호출을 막는다', async () => {
    api.previewDecisionPlan.mockResolvedValue({ blockReason: 'HISTORY_REQUIRED', horizonPlan: { horizonTradingDays: 10, status: 'HISTORY_REQUIRED', reason: '종합분석 재실행 필요', metrics: {} } });
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    expect(await screen.findByText('종합분석 재실행 필요')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'AI 상세 검토' })).toBeDisabled();expect(api.startDecision).not.toHaveBeenCalled();
  });
  it('보유 입력을 전송하고 상세 보고서의 검증된 수치를 표시한다', async () => {
    const saved = result(); saved.result.aiReview.detail = { conclusion: { text: '기간과 신호를 함께 검토한 결론입니다.', metricIds: ['TARGET_ONE'] } };
    saved.result.policy.metrics = { TARGET_ONE: { label: '첫 목표', value: 130, unit: '원', basis: '확인된 저항' } };
    api.startDecision.mockResolvedValue(saved);
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    fireEvent.mouseDown(screen.getByLabelText('보유 상태'));fireEvent.click(screen.getByRole('option', { name: '보유 중' }));
    fireEvent.change(screen.getByLabelText('평균 매수가 (선택)'), { target: { value: '105' } });
    fireEvent.change(screen.getByLabelText('매수일 (선택)'), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'AI 상세 검토' }));
    expect(await screen.findByText('기간과 신호를 함께 검토한 결론입니다.')).toBeInTheDocument();
    expect(screen.getByText('첫 목표: 130원')).toBeInTheDocument();
    expect(api.startDecision).toHaveBeenCalledWith('snapshot-one', { positionStatus: 'HELD', horizonTradingDays: null, preferences: defaultPreferences, averageBuyPrice: 105, purchasedOn: '2026-10-01' }, expect.any(String), expect.any(AbortSignal));
  });
  it('기간 기본값은 AI 제안이며 성향 합계 오류는 호출을 막고 확인 빈도는 프리셋에 덮이지 않는다', async () => {
    api.startDecision.mockResolvedValue(result());render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    expect(screen.queryByLabelText('매수 후 예상 보유기간 (거래일)')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('공격적 비율 (%)'), { target: { value: '21' } });
    expect(screen.getByRole('button', { name: 'AI 상세 검토' })).toBeDisabled();
    fireEvent.mouseDown(screen.getByLabelText('확인 가능한 빈도'));fireEvent.click(screen.getByRole('option', { name: '가끔 확인' }));
    fireEvent.click(screen.getByRole('button', { name: '공격적 기본값' }));
    fireEvent.click(screen.getByRole('button', { name: 'AI 상세 검토' }));
    await waitFor(() => expect(api.startDecision).toHaveBeenCalledWith('snapshot-one', expect.objectContaining({ horizonTradingDays: null, preferences: expect.objectContaining({ aggressive: 70, monitoring: 'OCCASIONAL' }) }), expect.any(String), expect.any(AbortSignal)));
  });
  it('새 형식의 저장 입력을 복원하고 성향 변경을 기존 답변과 구분한다', async () => {
    const saved=result();saved.result.context={ positionStatus: 'NOT_HELD', horizonTradingDays: null, preferences: { ...defaultPreferences, monitoring: 'OCCASIONAL' } };
    window.history.replaceState({}, '', '?snapshot=snapshot-one&decision=decision-one');api.getDecision.mockResolvedValue(saved);
    render(<TradeDecisionPanel snapshotId="snapshot-one" stockCode="005930" aiConfigured />);
    expect(await screen.findByText('신규 진입 대기')).toBeInTheDocument();expect(screen.getByLabelText('확인 가능한 빈도')).toHaveTextContent('가끔 확인');
    expect(screen.queryByText(/입력 조건이 변경되었습니다/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '보수적 기본값' }));expect(screen.getByText(/입력 조건이 변경되었습니다/)).toBeInTheDocument();
    expect(api.startDecision).not.toHaveBeenCalled();
  });
});
