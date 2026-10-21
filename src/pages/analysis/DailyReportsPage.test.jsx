import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DailyReportsPage from './DailyReportsPage';
import * as api from '../../api/unifiedAnalysisApi';
import { PortfolioWorkspace, OperationsWorkspace } from '../../features/unified-analysis/PortfolioPanel';

vi.mock('../../api/unifiedAnalysisApi');
vi.mock('../../features/unified-analysis/PortfolioPanel', () => ({ PortfolioWorkspace: vi.fn(() => <div>계좌 검증 영역</div>), OperationsWorkspace: vi.fn(({ reportId }) => <div>운영 영역 {reportId}</div>) }));
vi.mock('../../features/unified-analysis/ReportPerformancePanel', () => ({ default: ({ runId }) => <div>사후 성과 {runId}</div> }));
vi.mock('../../features/unified-analysis/ScenarioMonitoringPanel', () => ({ default: ({ runId }) => <div>시나리오 추적 {runId}</div> }));
vi.mock('../../features/unified-analysis/ScenarioMonitoringOverviewPanel', () => ({ default: ({ onDetail, onReport }) => <div>전체 선정 이력 추적<button onClick={() => onDetail({ runId: 'older-selection', code: '373220', name: 'LG에너지솔루션' })}>이전 선정 종목 상세</button><button onClick={() => onReport('older-selection')}>이전 선정 원본</button></div> }));
vi.mock('../../features/unified-analysis/SavedUnifiedDetail', () => ({ default: ({ selection }) => <div>공통 상세 {selection.runId} {selection.code}</div> }));
const ready = { runId: 'ready', tradeDate: '2026-10-13', market: 'ALL', scanState: 'COMPLETED', reportState: 'READY' };
const pending = { runId: 'pending', tradeDate: '2026-10-14', market: 'ALL', scanState: 'RUNNING', reportState: 'WORKING' };
const library = { enabled: true, latestReady: ready, newestRun: pending, expectedTradeDate: '2026-10-14', reports: [pending, ready], page: 0, hasMore: false };
const report = { status: 'READY', tradeDate: ready.tradeDate, forecastDate: '2026-10-14', informationAsOf: '2026-10-13T11:00:00Z', finalizedAt: '2026-10-13T11:30:00Z', markets: [], candidates: [], limitations: [] };
function Location() { const location = useLocation(); return <div data-testid="location">{location.search}</div>; }
const renderPage = (entry = '/daily-reports') => render(<MemoryRouter initialEntries={[entry]}><DailyReportsPage /><Location /></MemoryRouter>);
describe('장 마감 리포트 메뉴', () => {
  beforeEach(() => {
    vi.clearAllMocks(); api.listDailyReports.mockResolvedValue(library);
    api.getDailyReport.mockResolvedValue({ state: 'READY', report, notificationState: 'DISABLED' });
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it('진행 중인 최신 실행 대신 최신 확정 보고서를 열고 이전 날짜임을 표시한다', async () => {
    renderPage(); await screen.findByText('오늘은 조건을 충족한 종목이 없습니다');
    expect(api.getDailyReport).toHaveBeenCalledWith('ready', expect.any(AbortSignal));
    expect(screen.getByText(/최근 예정 거래일 2026-10-14의 보고서가 아니므로/)).toBeInTheDocument();
    expect(screen.getByText(/가장 최근 전체 시장 실행/)).toHaveTextContent('보고서 작성 중');
    expect(api.requestDailyReport).not.toHaveBeenCalled();expect(api.startUnifiedRun).not.toHaveBeenCalled();
    expect(PortfolioWorkspace).not.toHaveBeenCalled();expect(OperationsWorkspace).not.toHaveBeenCalled();
  });
  it('직접 연결한 과거 보고서를 최신 보고서로 바꾸지 않는다', async () => {
    api.getDailyReport.mockResolvedValue({ state: 'READY', report: { ...report, tradeDate: '2026-10-01' } });
    renderPage('/daily-reports?runId=old-report'); await screen.findByText('오늘은 조건을 충족한 종목이 없습니다');
    expect(api.getDailyReport).toHaveBeenCalledWith('old-report', expect.any(AbortSignal));
    expect(screen.getByText(/현재 표시 기준일은 2026-10-01/)).toBeInTheDocument();
    expect(api.getDailyReport.mock.calls.some(([id]) => id === 'ready')).toBe(false);
  });
  it('성과와 운영은 해당 탭에서만 열며 URL에 탭 선택을 보존한다', async () => {
    renderPage(); await screen.findByText('오늘은 조건을 충족한 종목이 없습니다');
    fireEvent.click(screen.getByRole('tab', { name: '성과 검증' })); expect(await screen.findByText('계좌 검증 영역')).toBeInTheDocument();expect(screen.getByText('사후 성과 ready')).toBeInTheDocument();
    expect(screen.getByText('전체 선정 이력 추적')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('runId=ready');
    expect(OperationsWorkspace).not.toHaveBeenCalled();expect(screen.getByTestId('location')).toHaveTextContent('tab=performance');
    fireEvent.click(screen.getByRole('tab', { name: '운영 상태' }));expect(await screen.findByText('운영 영역 ready')).toBeInTheDocument();
    expect(screen.queryByText('계좌 검증 영역')).not.toBeInTheDocument();
  });
  it('성과 탭 직접 접속 시 처음 확인한 보고서를 고정하여 목록 갱신에도 감시 대상을 유지한다', async () => {
    vi.useFakeTimers();
    await act(async () => { renderPage('/daily-reports?tab=performance'); });
    expect(screen.getByText('전체 선정 이력 추적')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('runId=ready');
    const next = { ...ready, runId: 'new-selection', tradeDate: '2026-10-14' };
    api.listDailyReports.mockResolvedValue({ ...library, latestReady: next, newestRun: next, reports: [next, ready] });
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(api.listDailyReports).toHaveBeenCalledTimes(2);
    expect(screen.getByText('전체 선정 이력 추적')).toBeInTheDocument();
    expect(screen.getByText('사후 성과 ready')).toBeInTheDocument();
    expect(screen.queryByText('시나리오 추적 new-selection')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('runId=ready');
  });
  it('최신 보고서 보기 클릭 당시의 보고서를 유지하고 다시 클릭할 때만 새 보고서로 전환한다', async () => {
    vi.useFakeTimers();
    await act(async () => { renderPage('/daily-reports?tab=performance&runId=old-report'); });
    expect(screen.getByText('전체 선정 이력 추적')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '최신 확정 보고서 보기' }));
    expect(screen.getByText('전체 선정 이력 추적')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('runId=ready');
    const next = { ...ready, runId: 'new-selection', tradeDate: '2026-10-14' };
    api.listDailyReports.mockResolvedValue({ ...library, latestReady: next, newestRun: next, reports: [next, ready] });
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(api.listDailyReports).toHaveBeenCalledTimes(2);
    expect(screen.getByText('전체 선정 이력 추적')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('runId=ready');
    fireEvent.click(screen.getByRole('button', { name: '최신 확정 보고서 보기' }));
    expect(screen.getByText('전체 선정 이력 추적')).toBeInTheDocument();
    expect(screen.getByText('사후 성과 new-selection')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('runId=new-selection');
  });
  it('전체 이력의 상세는 현재 선택 보고서와 다른 원래 실행을 열고 단일 보고서 보기로도 전환한다', async () => {
    renderPage('/daily-reports?tab=performance&runId=ready');
    await screen.findByText('전체 선정 이력 추적');
    fireEvent.click(screen.getByRole('button', { name: '이전 선정 종목 상세' }));
    expect(await screen.findByText('공통 상세 older-selection 373220')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '선택 보고서만' }));
    expect(screen.getByText('시나리오 추적 ready')).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('tracking=report');
    expect(screen.queryByText('전체 선정 이력 추적')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '전체 선정 이력' }));
    fireEvent.click(screen.getByRole('button', { name: '이전 선정 원본' }));
    await waitFor(() => expect(api.getDailyReport).toHaveBeenCalledWith('older-selection', expect.any(AbortSignal)));
    expect(screen.getByTestId('location')).toHaveTextContent('runId=older-selection');
    expect(screen.getByTestId('location')).toHaveTextContent('tab=report');
  });
  it('종목 상세는 선택 보고서의 저장된 공통 상세로 연결한다', async () => {
    const stock = { code: '005930', name: '삼성전자', disposition: 'WATCH', cautions: [], evidence: [], relativeReturn20: 1 };
    api.getDailyReport.mockResolvedValue({ state: 'READY', report: { ...report, candidates: [stock] } });
    renderPage();fireEvent.click(await screen.findByText('삼성전자 (005930) · 관찰 대상'));
    fireEvent.click(screen.getByRole('button', { name: '저장된 종목 분석 보기' }));expect(await screen.findByText('공통 상세 ready 005930')).toBeInTheDocument();
    expect(api.analyzeUnifiedStock).not.toHaveBeenCalled();
  });
  it('비활성화·빈 이력을 정상 분석 후 후보 없음과 구분한다', async () => {
    api.listDailyReports.mockResolvedValue({ enabled: false, reports: [] });const view = renderPage();await screen.findByText(/보고서 기능이 비활성화/);
    expect(api.getDailyReport).not.toHaveBeenCalled();expect(screen.queryByText('오늘은 조건을 충족한 종목이 없습니다')).not.toBeInTheDocument();
    view.unmount();api.listDailyReports.mockResolvedValue({ enabled: true, reports: [], page: 0 });renderPage();await screen.findByText(/아직 확정된 전체 시장 보고서가 없습니다/);
    expect(api.getDailyReport).not.toHaveBeenCalled();
  });
  it('보고서 변경 후 늦게 도착한 이전 응답을 버린다', async () => {
    let finish;api.getDailyReport.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ state: 'WORKING' });
    renderPage();fireEvent.click(await screen.findByRole('button', { name: '해당 실행 보기' }));
    await waitFor(() => expect(api.getDailyReport).toHaveBeenCalledWith('pending', expect.any(AbortSignal)));
    await act(async () => finish({ state: 'READY', report }));expect(screen.queryByText('오늘은 조건을 충족한 종목이 없습니다')).not.toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('runId=pending');
  });
  it('이전 이력 페이지를 열어도 최신 확정 보고서 선택을 유지한다', async () => {
    api.listDailyReports.mockResolvedValueOnce({ ...library, hasMore: true }).mockResolvedValue({ ...library, reports: [], page: 1 });
    renderPage();await screen.findByText('오늘은 조건을 충족한 종목이 없습니다');fireEvent.click(screen.getByRole('button', { name: '이전 이력' }));
    await waitFor(() => expect(api.listDailyReports).toHaveBeenCalledWith({ page: 1, size: 30 }, expect.any(AbortSignal)));
    expect(screen.getByText('오늘은 조건을 충족한 종목이 없습니다')).toBeInTheDocument();expect(api.getDailyReport).toHaveBeenCalledTimes(1);
  });
  it('목록 조회 오류나 잘못된 링크에서 임의 보고서를 표시하지 않는다', async () => {
    api.listDailyReports.mockRejectedValueOnce(new Error('조회 오류'));const view = renderPage();await screen.findByText(/보고서 목록을 조회하지 못했습니다/);expect(api.getDailyReport).not.toHaveBeenCalled();view.unmount();
    api.listDailyReports.mockResolvedValue(library);renderPage('/daily-reports?runId=bad%2Fid');await screen.findByText('보고서 링크의 실행 ID가 올바르지 않습니다.');expect(api.getDailyReport).not.toHaveBeenCalled();
  });
});
