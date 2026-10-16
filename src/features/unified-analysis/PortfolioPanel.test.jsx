import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PortfolioPanel from './PortfolioPanel';
import * as api from '../../api/portfolioApi';

vi.mock('../../api/portfolioApi');
const report = { id: 'report-a', tradeDate: '2026-10-13', candidates: 1, version: 'v1' };
const listing = { enabled: true, reports: [report], runs: [] };
const ops = { enabled: true, features: { telegram: true }, tables: {}, pipelines: [], warnings: [], tests: [], destinationLabel: '…1234', destinationFingerprint: 'fingerprint', credentialsConfigured: true, testEnabled: true };
const metrics = { entered: 1, closed: 0, open: 0, unresolved: 1, skipped: 0, winRatePercent: null, meanReturnPercent: null, meanWinPercent: null, meanLossPercent: null, realizedProfit: 0, profitFactor: null, consecutiveLosingExitDates: 0, fillRatePercent: null };
const result = { state: 'DATA_INCOMPLETE', throughDate: '2026-11-12', evaluatedAt: '2026-11-12T12:00:00Z', variants: [{ name: 'MARKET_FILTER', state: 'DATA_GAP', finalEquity: null, returnPercent: null, maximumDrawdownPercent: null, metrics, groups: { 'STRATEGY/BREAKOUT': metrics }, trades: [], curve: [] }], forecasts: [], limitations: ['검증 전 모의 결과입니다.'] };
const view = { id: 'account-a', state: 'DATA_INCOMPLETE', revision: 1, input: { captureMode: 'RETROSPECTIVE', policy: { initialCash: 10000000, maximumPositions: 5, positionPercent: 20, roundTripFeeBps: 30, slippageBps: 5, holdingDays: 20, neutralBandPercent: 0.3 }, cohorts: [{ report: { runId: 'report-a', tradeDate: '2026-10-13', version: 'v1' } }] }, result };
const openPortfolio = () => fireEvent.click(screen.getByText('누적 모의계좌 · 전략 검증'));
const openOps = () => fireEvent.click(screen.getByText('자동 분석 · 알림 운영 확인'));
describe('누적 모의계좌와 운영 확인', () => {
  beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); });
  it('닫힌 화면은 조회하거나 등록·발송하지 않고 비활성화 상태도 쓰지 않는다', async () => {
    api.listPortfolios.mockResolvedValue({ enabled: false, reports: [], runs: [] });
    render(<PortfolioPanel />); expect(api.listPortfolios).not.toHaveBeenCalled(); openPortfolio();
    expect(await screen.findByText('누적 모의계좌 비활성화')).toBeInTheDocument(); expect(api.createPortfolio).not.toHaveBeenCalled(); expect(api.sendTelegramTest).not.toHaveBeenCalled();
  });
  it('표본 없는 수익률과 승률을 0으로 표시하지 않는다', async () => {
    api.listPortfolios.mockResolvedValue({ ...listing, runs: [{ id: view.id, state: view.state, revision: 1 }] }); api.getPortfolio.mockResolvedValue(view);
    render(<PortfolioPanel />); openPortfolio();
    const table = await screen.findByRole('table', { name: '모의계좌 비교' }); expect(table).toHaveTextContent('미확인'); expect(table).not.toHaveTextContent('0%');
    expect(screen.getByText(/과거 보고서의 사후 등록/)).toBeInTheDocument(); expect(screen.getByRole('table', { name: '전략과 근거별 통계' })).toHaveTextContent('1/0');
  });
  it('등록 응답 유실 후 재시도와 화면 재진입에도 같은 요청 키를 유지한다', async () => {
    api.listPortfolios.mockResolvedValue(listing); api.createPortfolio.mockRejectedValue(new Error('응답 유실'));
    const component = render(<PortfolioPanel />); openPortfolio();
    await screen.findByText(/선택한 보고서를 시간순/); fireEvent.click(screen.getByText('평가할 보고서 선택 (0/60)')); fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '모의계좌 평가 등록' })); await screen.findByText('응답 유실');
    const key = api.createPortfolio.mock.calls[0][1]; component.unmount();
    render(<PortfolioPanel />); openPortfolio(); await screen.findByText(/선택한 보고서를 시간순/); fireEvent.click(screen.getByText('평가할 보고서 선택 (0/60)')); fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: '모의계좌 평가 등록' })); await screen.findByText('응답 유실');
    expect(api.createPortfolio.mock.calls[1][1]).toBe(key); expect(api.createPortfolio.mock.calls[0][0].reportIds).toEqual(['report-a']);
  });
  it('미리보기는 발송하지 않으며 테스트는 명시적으로 확인해야 한다', async () => {
    api.getOperations.mockResolvedValue(ops); api.previewReport.mockResolvedValue({ runId: report.id, text: '알림 미리보기 내용' }); api.sendTelegramTest.mockResolvedValue({ state: 'SENT', key: 'test' });
    render(<PortfolioPanel reportId={report.id} />); openOps();
    fireEvent.click(await screen.findByRole('button', { name: '선택 보고서 알림 미리보기' })); expect(await screen.findByText('알림 미리보기 내용')).toBeInTheDocument(); expect(api.sendTelegramTest).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: '텔레그램 연결 테스트' })); expect(api.sendTelegramTest).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '취소' })); expect(api.sendTelegramTest).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: '텔레그램 연결 테스트' })); fireEvent.click(screen.getByRole('button', { name: '테스트 메시지 보내기' }));
    await screen.findByText('테스트 결과: 발송 확인'); expect(api.sendTelegramTest).toHaveBeenCalledTimes(1); expect(api.sendTelegramTest.mock.calls[0][0]).toEqual({ confirm: true, destinationFingerprint: 'fingerprint' });
  });
  it('발송 결과 미확인 시 재확인도 같은 키로 요청한다', async () => {
    api.getOperations.mockResolvedValue(ops); api.sendTelegramTest.mockResolvedValue({ state: 'UNKNOWN', key: 'test' });
    render(<PortfolioPanel reportId={report.id} />); openOps();
    fireEvent.click(await screen.findByRole('button', { name: '텔레그램 연결 테스트' })); fireEvent.click(screen.getByRole('button', { name: '테스트 메시지 보내기' }));
    await screen.findByText(/자동 재발송하지 않습니다/); const key = api.sendTelegramTest.mock.calls[0][1];
    fireEvent.click(await screen.findByRole('button', { name: '텔레그램 연결 테스트' })); fireEvent.click(screen.getByRole('button', { name: '테스트 메시지 보내기' }));
    await waitFor(() => expect(api.sendTelegramTest).toHaveBeenCalledTimes(2)); expect(api.sendTelegramTest.mock.calls[1][1]).toBe(key);
  });
  it('보고서를 바꾸면 늦게 도착한 이전 미리보기를 버린다', async () => {
    let resolve; api.getOperations.mockResolvedValue(ops); api.previewReport.mockImplementation(() => new Promise(r => { resolve = r; }));
    const component = render(<PortfolioPanel reportId="old" />); openOps(); fireEvent.click(await screen.findByRole('button', { name: '선택 보고서 알림 미리보기' }));
    component.rerender(<PortfolioPanel reportId="new" />); await act(async () => resolve({ runId: 'old', text: '이전 보고서' })); expect(screen.queryByText('이전 보고서')).not.toBeInTheDocument();
  });
  it('테스트 발송이 비활성화되면 미리보기만 사용할 수 있다', async () => {
    api.getOperations.mockResolvedValue({ ...ops, testEnabled: false }); render(<PortfolioPanel reportId={report.id} />); openOps();
    expect(await screen.findByRole('button', { name: '텔레그램 연결 테스트' })).toBeDisabled(); expect(screen.getByRole('button', { name: '선택 보고서 알림 미리보기' })).not.toBeDisabled();
  });
});
