import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UnifiedAnalysisPage from './UnifiedAnalysisPage';
import * as api from '../../api/unifiedAnalysisApi';
import { unifiedAnalysisFixture } from '../../test/unifiedAnalysisFixtures';
import StockChartPanel from '../../features/stock-chart/components/StockChartPanel';
import * as decisions from '../../api/tradeDecisionApi';

vi.mock('../../api/unifiedAnalysisApi');
vi.mock('../../api/tradeDecisionApi', async original => ({ ...await original(), previewDecisionPlan: vi.fn().mockResolvedValue(null), previewSourcePlan: vi.fn().mockResolvedValue(null), getDecisionCapabilities: vi.fn(), findImportedSnapshot: vi.fn(), startSnapshot: vi.fn(), startDecision: vi.fn() }));
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
    decisions.getDecisionCapabilities.mockResolvedValue({ enabled: true, aiConfigured: true });
    decisions.findImportedSnapshot.mockResolvedValue(null);
  });
  it('저장 결과를 조회하고 상세에서도 재분석하지 않는다', async () => {
    setup(); expect(await screen.findByText('삼성전자')).toBeInTheDocument();
    expect(screen.getByText('S6 · 상승 전환')).toBeInTheDocument();
    expect(api.startUnifiedRun).not.toHaveBeenCalled(); expect(api.analyzeUnifiedStock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '상세', exact: true }));
    expect(await screen.findByRole('heading', { name: '추세 구조' })).toBeInTheDocument();
    expect(screen.getByText(/저장된 분석은 다시 실행하지 않습니다/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '스테이징' })).toHaveAttribute('aria-selected', 'true');
    expect(StockChartPanel).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: '종목 평가와 가격 구간' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '종목분석' }));
    expect(screen.getByRole('tabpanel', { name: '종목분석' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '종목 평가와 가격 구간' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '매수·매도 시그널' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /팩터별 점수와 근거/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '추세 구조' })).not.toBeInTheDocument();
    expect(StockChartPanel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: '차트', exact: true }));
    expect(screen.getByRole('tabpanel', { name: '차트' })).toBeVisible();
    expect(StockChartPanel).toHaveBeenCalledWith(expect.objectContaining({
      stockCode: '005930', realData: true, refreshKey: '2026-09-19T04:00:00',
      analysis: unifiedAnalysisFixture().result.analysis.scenario,
    }), undefined);
    expect(screen.getByText(/분석 가격일 2026-09-18 기준/)).toBeInTheDocument();
    expect(api.getUnifiedDetail).toHaveBeenCalledWith('unified-1', '005930', expect.any(AbortSignal));
    expect(api.getUnifiedDetail).toHaveBeenCalledTimes(1);
    expect(api.analyzeUnifiedStock).not.toHaveBeenCalled();
    expect(api.startUnifiedRun).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: '종목 평가와 가격 구간' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: '스테이징' }));
    expect(screen.getByRole('table', { name: '종합분석 EMA' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '가격 차트' })).not.toBeInTheDocument();
  });
  it('상세 조회 오류 후 선택한 탭에서 재조회할 수 있다', async () => {
    api.getUnifiedDetail.mockRejectedValueOnce(new Error('상세 조회 실패')).mockResolvedValueOnce(unifiedAnalysisFixture());
    setup(); await screen.findByText('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '상세', exact: true }));
    await screen.findByText('상세 조회 실패');
    fireEvent.click(screen.getByRole('tab', { name: '종목분석' }));
    fireEvent.click(screen.getByRole('button', { name: '다시 조회' }));
    expect(await screen.findByRole('heading', { name: '종목 평가와 가격 구간' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '종목분석' })).toHaveAttribute('aria-selected', 'true');
    expect(StockChartPanel).not.toHaveBeenCalled();
  });
  it('AI 탭을 팝업 안에서 열고 탭 이동 후 입력을 유지하며 자동 AI 호출하지 않는다', async () => {
    setup();await screen.findByText('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '상세', exact: true }));
    await screen.findByRole('heading', { name: '추세 구조' });
    expect(decisions.getDecisionCapabilities).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: 'AI 판단' }));
    expect(await screen.findByRole('button', { name: 'AI 상세 검토' })).toBeEnabled();
    expect(screen.getByRole('tabpanel', { name: 'AI 판단' })).toBeVisible();
    fireEvent.mouseDown(screen.getByLabelText('보유기간 결정'));fireEvent.click(screen.getByRole('option', { name: '기간 직접 지정' }));
    fireEvent.change(screen.getByLabelText('매수 후 예상 보유기간 (거래일)'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('tab', { name: '스테이징' }));
    fireEvent.click(screen.getByRole('tab', { name: 'AI 판단' }));
    expect(screen.getByLabelText('매수 후 예상 보유기간 (거래일)')).toHaveValue(20);
    expect(decisions.findImportedSnapshot).toHaveBeenCalledTimes(1);
    expect(decisions.startSnapshot).not.toHaveBeenCalled();expect(decisions.startDecision).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: '이 저장 결과로 AI 검토' })).not.toBeInTheDocument();
  });
  it('팝업을 다시 열면 기본 스테이징 탭으로 돌아온다', async () => {
    setup(); await screen.findByText('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '상세', exact: true }));
    await screen.findByRole('heading', { name: '추세 구조' });
    fireEvent.click(screen.getByRole('tab', { name: '차트', exact: true }));
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    StockChartPanel.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '상세', exact: true }));
    await screen.findByRole('heading', { name: '추세 구조' });
    expect(screen.getByRole('tab', { name: '스테이징' })).toHaveAttribute('aria-selected', 'true');
    expect(StockChartPanel).not.toHaveBeenCalled();
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
  it('시장·최소 거래량·최소 거래대금은 기존 정렬을 유지한 검색조건으로 보내며 초기화한다', async () => {
    api.getUnifiedItems.mockResolvedValue({ ...page, content: [{ ...item, volume: 123456, tradingAmountMillionWon: 10025 }] });
    setup(); await screen.findByText('삼성전자');
    expect(screen.getByText('123,456')).toBeInTheDocument();
    expect(screen.getByText('100.25')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('결과 시장'));
    fireEvent.click(await screen.findByRole('option', { name: '코스닥', exact: true }));
    fireEvent.change(screen.getByLabelText('최소 거래량 (주)'), { target: { value: '100000' } });
    fireEvent.change(screen.getByLabelText('최소 거래대금 (억원)'), { target: { value: '100.25' } });
    fireEvent.click(screen.getByRole('button', { name: '검색', exact: true }));
    await waitFor(() => expect(api.getUnifiedItems).toHaveBeenLastCalledWith('unified-1', expect.objectContaining({
      market: 'KOSDAQ', minVolume: '100000', minTradingAmountEok: '100.25', sort: 'totalScore', ascending: false, page: 0,
    }), expect.any(AbortSignal)));
    expect(api.startUnifiedRun).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '초기화', exact: true }));
    await waitFor(() => {
      const params = api.getUnifiedItems.mock.calls.at(-1)[1];
      expect(params).not.toHaveProperty('market');
      expect(params).not.toHaveProperty('minVolume');
      expect(params).not.toHaveProperty('minTradingAmountEok');
    });
    expect(screen.getByLabelText('최소 거래량 (주)')).toHaveValue(null);
    expect(screen.getByLabelText('최소 거래대금 (억원)')).toHaveValue(null);
  });
  it('새 값이 없는 과거 결과를 0으로 표시하지 않는다', async () => {
    setup(); await screen.findByText('삼성전자');
    expect(screen.getAllByText('미저장·미확인')).toHaveLength(2);
    expect(screen.getByText(/최소값 조건에서 제외됩니다/)).toBeInTheDocument();
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
