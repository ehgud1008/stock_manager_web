import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UnifiedAnalysisPage from './UnifiedAnalysisPage';
import * as api from '../../api/unifiedAnalysisApi';
import { unifiedAnalysisFixture } from '../../test/unifiedAnalysisFixtures';
import StockChartPanel from '../../features/stock-chart/components/StockChartPanel';

vi.mock('../../api/unifiedAnalysisApi');
vi.mock('../../features/stock-chart/components/StockChartPanel', () => ({ default: vi.fn(() => <div>가격 차트 영역</div>) }));
const run = { runId: 'unified-1', market: 'ALL', baseDate: '2026-09-18', status: 'COMPLETED', total: 2, completed: 2, failed: 0, skipped: 0 };
const item = { stockCode: '005930', stockName: '삼성전자', market: 'KOSPI', status: 'COMPLETED', priceDate: '2026-09-18', stage: 6,
  previousStage: 5, barsSinceTransition: 2, totalScore: 72.5, buySignal: 'BREAKOUT', sellSignal: null, entryStatus: 'IN_RANGE', quality: 'PARTIAL', currentPrice: 71000, rewardRisk: 1.5 };
const page = { run, totalElements: 1, page: 0, size: 20, content: [item] };
const setup = () => render(<MemoryRouter><UnifiedAnalysisPage /></MemoryRouter>);

describe('시장 전체 종합분석', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    api.listUnifiedRuns.mockResolvedValue([run]); api.getUnifiedItems.mockResolvedValue(page);
    api.getUnifiedDetail.mockResolvedValue(unifiedAnalysisFixture());
  });
  it('저장 결과를 조회하고 상세에서도 재분석하지 않는다', async () => {
    setup(); expect(await screen.findByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('S6 · 상승 전환')).toBeInTheDocument();
    expect(api.startUnifiedRun).not.toHaveBeenCalled(); expect(api.analyzeUnifiedStock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '상세', exact: true }));
    expect(await screen.findByRole('heading', { name: '추세 구조' })).toBeInTheDocument();
    expect(screen.getByText(/저장된 분석은 다시 실행하지 않습니다/)).toBeInTheDocument();
    expect(StockChartPanel).toHaveBeenCalledWith(expect.objectContaining({
      stockCode: '005930', realData: true, refreshKey: '2026-09-19T04:00:00',
      analysis: unifiedAnalysisFixture().result.analysis.scenario,
    }), undefined);
    expect(screen.getByText(/분석 가격일 2026-09-18 기준/)).toBeInTheDocument();
    expect(api.getUnifiedDetail).toHaveBeenCalledWith('unified-1', '005930', expect.any(AbortSignal));
  });
  it('스테이지와 점수·전환 조건을 함께 서버에 전달한다', async () => {
    setup(); await screen.findByText('삼성전자');
    fireEvent.mouseDown(screen.getByLabelText('스테이지'));
    fireEvent.click(await screen.findByRole('option', { name: 'S6 · 상승 전환' }));
    fireEvent.change(screen.getByLabelText('최소 점수'), { target: { value: '70' } });
    fireEvent.change(screen.getByLabelText('전환 후 최대 봉 수'), { target: { value: '3' } });
    fireEvent.mouseDown(screen.getByLabelText('진입 상태'));
    fireEvent.click(await screen.findByRole('option', { name: '진입 구간 내', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    await waitFor(() => expect(api.getUnifiedItems).toHaveBeenLastCalledWith('unified-1', expect.objectContaining({ stage: '6', minScore: '70', maxBarsSinceTransition: '3', entryStatus: 'IN_RANGE', page: 0 }), expect.any(AbortSignal)));
    fireEvent.click(screen.getByRole('button', { name: '초기화', exact: true }));
    await waitFor(() => expect(api.getUnifiedItems).toHaveBeenLastCalledWith('unified-1', expect.not.objectContaining({ entryStatus: 'IN_RANGE' }), expect.any(AbortSignal)));
    fireEvent.mouseDown(screen.getByLabelText('진입 상태'));
    expect(await screen.findByRole('option', { name: '전체', exact: true })).toHaveAttribute('aria-selected', 'true');
  });
  it('새 실행을 확인하고 중복 방지 키를 전송한다', async () => {
    api.startUnifiedRun.mockResolvedValue(run); setup(); await screen.findByText('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '전체 종합분석 실행' }));
    expect(api.startUnifiedRun).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '확인', exact: true }));
    await waitFor(() => expect(api.startUnifiedRun).toHaveBeenCalledWith({ market: 'ALL' }, expect.any(String)));
  });
  it('응답 유실 재시도에서 같은 요청 키를 사용한다', async () => {
    api.startUnifiedRun.mockRejectedValueOnce(new Error('응답 유실')).mockResolvedValueOnce(run);
    setup(); await screen.findByText('삼성전자');
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: '전체 종합분석 실행' }));
      fireEvent.click(screen.getByRole('button', { name: '확인', exact: true }));
      await waitFor(() => expect(api.startUnifiedRun).toHaveBeenCalledTimes(i + 1));
      if (!i) await screen.findByText('응답 유실');
    }
    expect(api.startUnifiedRun.mock.calls[0][1]).toEqual(api.startUnifiedRun.mock.calls[1][1]);
  });
  it('실패·미처리 종목만 재개한다', async () => {
    const partial = { ...run, status: 'COMPLETED_WITH_ERRORS', failed: 1, completed: 1 };
    api.getUnifiedItems.mockResolvedValue({ ...page, run: partial }); api.resumeUnifiedRun.mockResolvedValue(run);
    setup(); fireEvent.click(await screen.findByRole('button', { name: '실패·미처리 재개' }));
    expect(screen.getByText(/완료 결과와 대상 목록·기준일은 유지/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '확인', exact: true }));
    await waitFor(() => expect(api.resumeUnifiedRun).toHaveBeenCalledWith('unified-1'));
  });
  it('실행 전 빈 상태와 조회 오류를 구분한다', async () => {
    api.listUnifiedRuns.mockRejectedValue(new Error('저장소 연결 실패'));
    setup(); expect(await screen.findByText('저장소 연결 실패')).toBeInTheDocument();
    expect(screen.getByText(/결과를 조회하지 못했습니다/)).toBeInTheDocument();
  });
  it('선택 실행이 바뀌면 이전 요청을 취소하고 늦은 결과를 무시한다', async () => {
    const other = { ...run, runId: 'unified-2', baseDate: '2026-09-17' };
    let finish;
    api.listUnifiedRuns.mockResolvedValue([run, other]);
    api.getUnifiedItems.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }))
      .mockResolvedValueOnce({ ...page, run: other, content: [{ ...item, stockCode: '000660', stockName: 'SK하이닉스' }] });
    setup(); await waitFor(() => expect(api.getUnifiedItems).toHaveBeenCalledTimes(1));
    const signal = api.getUnifiedItems.mock.calls[0][2];
    fireEvent.mouseDown(screen.getByLabelText('분석 실행 이력'));
    fireEvent.click(await screen.findByRole('option', { name: /2026-09-17/ }));
    expect(await screen.findByText('SK하이닉스')).toBeInTheDocument(); expect(signal.aborted).toBe(true);
    await act(async () => finish(page));
    expect(screen.queryByText('삼성전자')).not.toBeInTheDocument();
  });
});
