import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReportPerformancePanel from './ReportPerformancePanel';
import * as api from '../../api/unifiedAnalysisApi';

vi.mock('../../api/unifiedAnalysisApi');
const metrics = { candidates: 1, eligible: 1, entered: 1, closed: 0, wins: 0, losses: 0, flat: 0, open: 1, unresolved: 0, noEntry: 0,
  winRatePercent: null, fillRatePercent: 100, meanClosedReturnPercent: null, meanWinPercent: null, meanLossPercent: null, profitFactor: null, maxConsecutiveLosingExitDates: 0, cohortReturnPercent: -5, cohortMaxDrawdownPercent: 5 };
const result = { captureMode: 'RETROSPECTIVE', throughDate: '2026-10-14', metrics, policy: { roundTripFeeBps: 30, slippageBps: 5, holdingDays: 20, neutralBandPercent: 0.3 },
  stocks: [{ code: '005930', name: '삼성전자', horizons: [{ days: 5, state: 'PENDING' }, { days: 10, state: 'MISSING' }, { days: 20, state: 'PRICE_BASIS_CHANGED' }], trade: { state: 'OPEN', netReturnPercent: null, markedReturnPercent: -5 } }],
  forecasts: [{ market: 'KOSPI', date: '2026-10-14', predicted: '상승 우세', actual: null, matched: null, returnPercent: null }], byStrategy: { BREAKOUT: metrics }, limitations: ['전체 계좌 성과가 아닙니다.'] };
describe('선정 이후 성과 검증', () => {
  beforeEach(() => vi.resetAllMocks());
  it('비활성화 상태에서 등록하거나 반복 조회하지 않는다', async () => {
    api.getReportPerformance.mockResolvedValue({ state: 'DISABLED' });
    render(<ReportPerformancePanel runId="one" />);
    expect(await screen.findByText('사후 검증 비활성화')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();expect(api.requestReportPerformance).not.toHaveBeenCalled();
  });
  it('미청산 손실과 미확인 값을 표시하고 과거 등록을 독립 검증으로 표현하지 않는다', async () => {
    api.getReportPerformance.mockResolvedValue({ state: 'WAITING_DATA', revision: 2, result });
    render(<ReportPerformancePanel runId="one" />);
    expect(await screen.findByText(/과거 보고서의 사후 등록 · 독립 검증 아님/)).toBeInTheDocument();
    expect(screen.getByText(/청산 표본 승률 미확인/)).toBeInTheDocument();
    expect(screen.getByText(/평가수익률 -5%/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '후보 사후 성과' })).toHaveTextContent('가격 기준 변경');
    expect(screen.getByText(/평가 대기·미확인/)).toBeInTheDocument();expect(api.requestReportPerformance).not.toHaveBeenCalled();
  });
  it('새 평가의 다섯 기간과 시장 초과수익·경로 미확인을 구분한다', async () => {
    const updated = { ...result, reportVersion: 'candidate-market-v2/test', policy: { ...result.policy, version: 'forward-evaluation-v2' },
      stocks: [{ ...result.stocks[0], disposition: 'WATCH', strategy: 'BREAKOUT', horizons: [
        { days: 1, state: 'VALID', priceReturnPercent: 2, marketState: 'VALID', marketReturnPercent: 1, excessReturnPercent: 1, pathState: 'VALID', maximumRisePercent: 5, maximumFallPercent: -3 },
        { days: 3, state: 'VALID', priceReturnPercent: 4, marketState: 'MISSING', pathState: 'MISSING' },
        ...[5, 10, 20].map(days => ({ days, state: 'PENDING', marketState: 'PENDING', pathState: 'PENDING' }))
      ] }] };
    api.getReportPerformance.mockResolvedValue({ state: 'WAITING_DATA', revision: 1, result: updated });
    render(<ReportPerformancePanel runId="new" />);
    const table = await screen.findByRole('table', { name: '후보 사후 성과' });
    for (const days of [1, 3, 5, 10, 20]) expect(screen.getByRole('columnheader', { name: days + '거래일 성과' })).toBeInTheDocument();
    expect(table).toHaveTextContent('초과 1%p');expect(table).toHaveTextContent('최대 상승 5%');
    expect(table).toHaveTextContent('최대 하락 -3%');expect(table).toHaveTextContent('시장 자료 대기');
    expect(table).toHaveTextContent('최대 상승 자료 대기');expect(table).toHaveTextContent('기간 미도래');
    expect(screen.getByText(/선정 기준 candidate-market-v2/)).toBeInTheDocument();
  });
  it('화면 조회와 명시적인 평가 등록을 구분한다', async () => {
    api.getReportPerformance.mockResolvedValue({ state: 'NOT_CREATED' });api.requestReportPerformance.mockResolvedValue({ state: 'PENDING' });
    render(<ReportPerformancePanel runId="one" />);
    fireEvent.click(await screen.findByRole('button', { name: '이 보고서의 사후 검증 등록' }));
    expect(api.requestReportPerformance).toHaveBeenCalledWith('one');
  });
  it('실행 변경 시 늦게 도착한 이전 평가를 무시한다', async () => {
    let resolveOld;api.getReportPerformance.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; })).mockResolvedValue({ state: 'DISABLED' });
    const view = render(<ReportPerformancePanel runId="old" />);view.rerender(<ReportPerformancePanel runId="new" />);
    await screen.findByText('사후 검증 비활성화');await act(async () => resolveOld({ state: 'COMPLETE', result, revision: 1 }));
    expect(screen.queryByText(/과거 보고서의 사후 등록/)).not.toBeInTheDocument();
  });
});
