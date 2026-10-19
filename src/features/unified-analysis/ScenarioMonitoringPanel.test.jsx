import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ScenarioMonitoringPanel from './ScenarioMonitoringPanel';
import * as api from '../../api/unifiedAnalysisApi';

vi.mock('../../api/unifiedAnalysisApi');
const stock = { code: '373220', name: 'LG에너지솔루션', market: 'KOSPI', disposition: 'ENTRY_CONDITIONAL', strategy: 'BREAKOUT',
  scenario: { entryFrom: 390000, entryTo: 400000, targets: [450000], stopLoss: 370000 }, selectionClose: 395000,
  status: 'WAITING_ENTRY_DAY', dataState: 'NOT_DUE', observedDays: 0, expectedDays: 0, history: [], notes: ['선정 당시 시나리오를 고정합니다.'] };
const view = { state: 'READY', runId: 'one', selectionDate: '2026-10-19', firstTrackingDate: '2026-10-20', lastTrackingDate: '2026-11-16', checkedAt: '2026-10-19T12:00:00Z', stocks: [stock], notes: [] };

describe('선정 종목 시나리오 추적', () => {
  beforeEach(() => { vi.resetAllMocks(); api.getScenarioMonitoring.mockResolvedValue(view); });
  it('평가 등록과 후속 일봉 없이도 선정 종목과 고정 목표·손절을 표시한다', async () => {
    const onDetail = vi.fn();render(<ScenarioMonitoringPanel runId="one" onDetail={onDetail} />);
    const table = await screen.findByRole('table', { name: '선정 종목 시나리오 추적' });
    expect(table).toHaveTextContent('LG에너지솔루션');expect(table).toHaveTextContent('450,000원');expect(table).toHaveTextContent('370,000원');
    expect(table).toHaveTextContent('다음 거래일 진입 확인 대기');expect(table).toHaveTextContent('후속 일봉 대기');
    expect(api.requestReportPerformance).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'LG에너지솔루션', exact: true }));expect(onDetail).toHaveBeenCalledWith(stock);
  });
  it('목표·손절 동시 접촉과 자료 출처를 일별 이력에 표시한다', async () => {
    api.getScenarioMonitoring.mockResolvedValue({ ...view, stocks: [{ ...stock, status: 'AMBIGUOUS', dataState: 'CURRENT', entryDate: '2026-10-20', eventDate: '2026-10-20', latestPriceDate: '2026-10-20', latestClose: 400000, observedDays: 1, expectedDays: 1,
      history: [{ date: '2026-10-20', quality: 'VALID', candle: { open: 395000, high: 451000, low: 369000, close: 400000, volume: 1000000 }, targetTouched: true, stopTouched: true, status: 'AMBIGUOUS', sourceRunId: 'daily-saved', collectedAt: '2026-10-20T11:30:00Z', note: '일봉에서 선후 순서는 확인할 수 없습니다.' }] }] });
    render(<ScenarioMonitoringPanel runId="one" />);
    expect(await screen.findByRole('table', { name: '선정 종목 시나리오 추적' })).toHaveTextContent('목표·손절 동시 접촉 · 순서 미확인');
    fireEvent.click(screen.getByRole('button', { name: 'LG에너지솔루션 · 일별 관측과 판정 근거' }));
    const table = screen.getByRole('table', { name: 'LG에너지솔루션 일별 관측' });
    expect(table).toHaveTextContent('목표 접촉');expect(table).toHaveTextContent('손절 접촉');expect(table).toHaveTextContent('daily-saved');
  });
  it('아직 확정되지 않은 보고서와 후보 없는 보고서를 구분한다', async () => {
    api.getScenarioMonitoring.mockResolvedValueOnce({ state: 'WAITING_REPORT' });const rendered = render(<ScenarioMonitoringPanel runId="pending" />);
    await screen.findByText(/확정된 선정 보고서가 준비되면/);rendered.unmount();
    api.getScenarioMonitoring.mockResolvedValue({ ...view, stocks: [] });render(<ScenarioMonitoringPanel runId="empty" />);
    await screen.findByText('이 보고서에 선정된 종목이 없습니다.');
  });
  it('실행 변경 뒤 늦게 도착한 이전 응답을 무시한다', async () => {
    let finish;api.getScenarioMonitoring.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue({ ...view, runId: 'new', stocks: [] });
    const rendered = render(<ScenarioMonitoringPanel runId="old" />);rendered.rerender(<ScenarioMonitoringPanel runId="new" />);
    await screen.findByText('이 보고서에 선정된 종목이 없습니다.');await act(async () => finish(view));
    expect(screen.queryByText('LG에너지솔루션')).not.toBeInTheDocument();
  });
  it('조회 실패를 후보 없음으로 표시하지 않고 재조회할 수 있다', async () => {
    api.getScenarioMonitoring.mockRejectedValueOnce(new Error('연결 실패')).mockResolvedValue(view);
    render(<ScenarioMonitoringPanel runId="one" />);await screen.findByText(/연결 실패/);
    expect(screen.queryByText('이 보고서에 선정된 종목이 없습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '시나리오 추적 새로고침' }));
    await screen.findByRole('table', { name: '선정 종목 시나리오 추적' });
  });
});
