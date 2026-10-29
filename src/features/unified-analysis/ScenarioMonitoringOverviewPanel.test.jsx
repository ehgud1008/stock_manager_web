import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScenarioMonitoringOverviewPanel from './ScenarioMonitoringOverviewPanel';
import * as api from '../../api/unifiedAnalysisApi';

vi.mock('../../api/unifiedAnalysisApi');
const stock = { code: '373220', name: 'LG에너지솔루션', disposition: 'WATCH', scenario: { entryFrom: 428000, entryTo: 428500, targets: [470000], stopLoss: 417125 }, selectionClose: 428500,
  status: 'WATCH_ONLY', dataState: 'CURRENT', latestPriceDate: '2026-10-21', latestClose: 412500, selectionReturnPercent: -3.734, targetDistancePercent: 13.94, stopDistancePercent: -1.12, observedDays: 2, expectedDays: 2, history: [], notes: [] };
const row = { runId: 'older-report', selectionDate: '2026-10-19', firstTrackingDate: '2026-10-20', lastTrackingDate: '2026-11-16', code: '373220', name: stock.name, stock };
const data = { from: '2026-10-01', to: '2026-10-22', page: 0, size: 20, totalElements: 2, hasMore: false, checkedAt: '2026-10-21T15:00:00Z', rows: [row, { ...row, runId: 'newer-report', selectionDate: '2026-10-20', stock: { ...stock, scenario: { ...stock.scenario, targets: [480000] } } }], notes: [] };

describe('전체 선정 이력 추적', () => {
  beforeEach(() => { vi.resetAllMocks(); api.listScenarioMonitoring.mockResolvedValue(data); });
  it('여러 선정일과 같은 종목의 서로 다른 목표를 함께 표시하고 원래 실행의 상세로 연결한다', async () => {
    const onDetail = vi.fn(); const onReport = vi.fn(); render(<ScenarioMonitoringOverviewPanel onDetail={onDetail} onReport={onReport} />);
    const table = await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    expect(table).toHaveTextContent('2026-10-19'); expect(table).toHaveTextContent('2026-10-20');
    expect(table).toHaveTextContent('-3.73%');
    expect(table).not.toHaveTextContent('470,000원');
    fireEvent.click(within(table).getAllByRole('button', { name: '상세보기' })[0]);
    const detail = screen.getByRole('dialog', { name: /2026-10-19 선정 검증/ });
    expect(detail).toHaveTextContent('470,000원');
    fireEvent.click(within(detail).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(within(table).getAllByRole('button', { name: stock.name, exact: true })).toHaveLength(2));
    fireEvent.click(within(table).getAllByRole('button', { name: stock.name, exact: true })[0]); expect(onDetail).toHaveBeenCalledWith(row);
    fireEvent.click(within(table).getAllByRole('button', { name: '원본 보고서' })[1]); expect(onReport).toHaveBeenCalledWith('newer-report');
    expect(api.getScenarioMonitoring).not.toHaveBeenCalled(); expect(api.requestReportPerformance).not.toHaveBeenCalled();
  });
  it('종목 검색과 선정 기간을 서버 조회에 적용하고 페이지 이동에서도 검색을 유지한다', async () => {
    api.listScenarioMonitoring.mockResolvedValue({ ...data, hasMore: true, totalElements: 25 });
    render(<ScenarioMonitoringOverviewPanel />); await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    fireEvent.change(screen.getByLabelText('종목명 또는 코드'), { target: { value: 'LG' } });
    fireEvent.change(screen.getByLabelText('선정 시작일'), { target: { value: '2026-10-19' } });
    fireEvent.change(screen.getByLabelText('선정 종료일'), { target: { value: '2026-10-21' } });
    fireEvent.click(screen.getByRole('button', { name: '조회', exact: true }));
    await waitFor(() => expect(api.listScenarioMonitoring).toHaveBeenLastCalledWith({ from: '2026-10-19', to: '2026-10-21', search: 'LG', disposition: 'ALL', page: 0, size: 20 }, expect.any(AbortSignal)));
    await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    fireEvent.click(screen.getByRole('button', { name: '다음 선정 이력' }));
    await waitFor(() => expect(api.listScenarioMonitoring).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'LG', page: 1 }), expect.any(AbortSignal)));
  });
  it('깨진 자료는 종목을 숨기거나 후보 없음으로 표시하지 않는다', async () => {
    api.listScenarioMonitoring.mockResolvedValue({ ...data, rows: [{ ...row, stock: null, errorCode: 'SOURCE_UNAVAILABLE' }], totalElements: 1 });
    render(<ScenarioMonitoringOverviewPanel />);
    const table = await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    expect(table).toHaveTextContent(stock.name); expect(table).toHaveTextContent('추적 자료를 조회하지 못했습니다');
    expect(screen.queryByText('조회 조건에 해당하는 선정 이력이 없습니다.')).not.toBeInTheDocument();
  });
  it('조회 실패를 표시하고 재시도하며 해제 후 도착한 응답은 무시한다', async () => {
    api.listScenarioMonitoring.mockRejectedValueOnce(new Error('연결 실패'));
    const rendered = render(<ScenarioMonitoringOverviewPanel />); await screen.findByText(/연결 실패/);
    fireEvent.click(screen.getByRole('button', { name: '전체 추적 새로고침' }));
    await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' }); rendered.unmount();
    let finish; api.listScenarioMonitoring.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = render(<ScenarioMonitoringOverviewPanel />); const signal = api.listScenarioMonitoring.mock.calls.at(-1)[1]; pending.unmount();
    await act(async () => finish(data)); expect(signal.aborted).toBe(true);
  });
  it('삭제 확인 후 해당 실행만 숨기고 삭제 목록에서 복원한다', async () => {
    api.listScenarioMonitoring.mockResolvedValue({ ...data, deletionEnabled: true });
    api.setMonitoringVisibility.mockResolvedValue(null);
    render(<ScenarioMonitoringOverviewPanel />);
    const table = await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    fireEvent.click(within(table).getAllByRole('button', { name: '목록에서 삭제' })[0]);
    expect(api.setMonitoringVisibility).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
    await waitFor(() => expect(api.setMonitoringVisibility).toHaveBeenCalledWith('older-report', '373220', false));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('삭제 이력 보기'));
    await waitFor(() => expect(api.listScenarioMonitoring).toHaveBeenLastCalledWith(expect.objectContaining({ deleted: true, page: 0 }), expect.any(AbortSignal)));
    const hidden = await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    fireEvent.click(within(hidden).getAllByRole('button', { name: '복원', exact: true })[0]);
    fireEvent.click(screen.getByRole('button', { name: '복원 확인' }));
    await waitFor(() => expect(api.setMonitoringVisibility).toHaveBeenLastCalledWith('older-report', '373220', true));
  });
  it('삭제 실패를 표시하고 종목을 임의로 제거하지 않는다', async () => {
    api.listScenarioMonitoring.mockResolvedValue({ ...data, deletionEnabled: true });
    api.setMonitoringVisibility.mockRejectedValue(new Error('저장 실패'));
    render(<ScenarioMonitoringOverviewPanel />);
    const table = await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    fireEvent.click(within(table).getAllByRole('button', { name: '목록에서 삭제' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
    expect(await screen.findByText('저장 실패')).toBeInTheDocument();
    expect(table).toHaveTextContent('2026-10-19');
  });
  it('종료 모의 손익과 상세 근거를 표시하고 동시 접촉을 수익 확정으로 바꾸지 않는다', async () => {
    const outcome = { result: 'AMBIGUOUS', summary: '목표·손절 선후 미확인', entryDate: '2026-10-20', entryPrice: 428000, conservativeReturnPercent: -2.8, holdingDays: 1, roundTripFeeBps: 30, slippageBps: 5 };
    api.listScenarioMonitoring.mockResolvedValue({ ...data, rows: [{ ...row, stock: { ...stock, status: 'AMBIGUOUS', outcome } }] });
    render(<ScenarioMonitoringOverviewPanel />);
    const table = await screen.findByRole('table', { name: '전체 선정 종목 시나리오 추적' });
    expect(table).toHaveTextContent('미확정'); expect(table).not.toHaveTextContent('-2.8%');
    fireEvent.click(within(table).getByRole('button', { name: '상세보기' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('손절 우선 가정 모의 손익: -2.8%');
  });
});
