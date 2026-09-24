import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UnifiedAnalysisPage from './UnifiedSingleAnalysisPage';
import { analyzeUnifiedStock } from '../../api/unifiedAnalysisApi';
import { unifiedAnalysisFixture } from '../../test/unifiedAnalysisFixtures';
import StockChartPanel from '../../features/stock-chart/components/StockChartPanel';

vi.mock('../../api/unifiedAnalysisApi', () => ({ analyzeUnifiedStock: vi.fn() }));
vi.mock('../../features/stock-chart/components/StockChartPanel', () => ({ default: vi.fn(() => <div>가격 차트 영역</div>) }));
vi.mock('../../features/stock-search/hooks/useStockMaster', () => ({ default: () => ({ status: 'success', stocks: [
  { stockCode: '005930', stockName: '삼성전자', marketType: 'KOSPI', stockType: 'ST' },
  { stockCode: '000660', stockName: 'SK하이닉스', marketType: 'KOSPI', stockType: 'ST' },
  { stockCode: '069500', stockName: '제외 ETF', marketType: 'KOSPI', stockType: 'ETF' },
] }) }));

async function choose(name) {
  fireEvent.focus(screen.getByRole('combobox'));
  fireEvent.change(screen.getByRole('combobox'), { target: { value: name } });
  fireEvent.click(await screen.findByRole('option', { name: new RegExp(name) }));
}

describe('UnifiedAnalysisPage', () => {
  beforeEach(() => vi.clearAllMocks());
  it('실행 전 빈 화면과 종목 선택을 제공하고 자동 수집하지 않는다', () => {
    render(<UnifiedAnalysisPage />);
    expect(screen.getByRole('heading', { name: '종합분석' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '종합분석 실행' })).toBeDisabled();
    expect(analyzeUnifiedStock).not.toHaveBeenCalled();
  });
  it('선택한 종목의 추세, 점수, 신호와 가격 구간을 함께 표시한다', async () => {
    analyzeUnifiedStock.mockResolvedValue(unifiedAnalysisFixture());
    render(<UnifiedAnalysisPage />);
    await choose('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '종합분석 실행' }));
    expect(await screen.findByText('72.5')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '추세 구조' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '매수·매도 시그널' })).toBeInTheDocument();
    expect(screen.getByText('70,000원 ~ 71,500원')).toBeInTheDocument();
    expect(screen.getByText(/005930 · 가격일 2026-09-18/)).toBeInTheDocument();
    expect(screen.getByRole('table', { name: '종합분석 EMA' })).toBeInTheDocument();
    expect(StockChartPanel).toHaveBeenCalledWith(expect.objectContaining({
      stockCode: '005930', realData: true, analysis: unifiedAnalysisFixture().result.analysis.scenario,
    }), undefined);
  });
  it('표본 부족을 0점이나 매수 신호로 바꾸지 않는다', async () => {
    const data = unifiedAnalysisFixture();
    data.result.analysis.totalScore = null;
    data.result.analysis.scenario = null;
    data.result.analysis.signalReport.completeness = 'INSUFFICIENT_DATA';
    data.result.screener.stage = null;
    data.result.screener.quality = 'INSUFFICIENT_DATA';
    analyzeUnifiedStock.mockResolvedValue(data);
    render(<UnifiedAnalysisPage />); await choose('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '종합분석 실행' }));
    expect(await screen.findByText('대표점수 산출 보류')).toBeInTheDocument();
    expect(screen.getByText('유효 시나리오 없음')).toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    expect(StockChartPanel).toHaveBeenCalledWith(expect.objectContaining({ stockCode: '005930', analysis: undefined, realData: true }), undefined);
  });
  it('종목 변경 시 이전 요청을 취소하고 늦은 응답을 무시한다', async () => {
    let finish;
    analyzeUnifiedStock.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<UnifiedAnalysisPage />); await choose('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '종합분석 실행' }));
    const signal = analyzeUnifiedStock.mock.calls[0][1];
    await choose('SK하이닉스');
    expect(signal.aborted).toBe(true);
    await act(async () => finish(unifiedAnalysisFixture()));
    expect(screen.queryByText('72.5')).not.toBeInTheDocument();
    analyzeUnifiedStock.mockResolvedValueOnce(unifiedAnalysisFixture('000660', 'SK하이닉스'));
    fireEvent.click(screen.getByRole('button', { name: '종합분석 실행' }));
    expect(await screen.findByRole('heading', { name: 'SK하이닉스' })).toBeInTheDocument();
  });
  it('수집 실패 후 다시 실행할 수 있다', async () => {
    analyzeUnifiedStock.mockRejectedValueOnce(new Error('수집 실패'));
    render(<UnifiedAnalysisPage />); await choose('삼성전자');
    fireEvent.click(screen.getByRole('button', { name: '종합분석 실행' }));
    expect(await screen.findByText('수집 실패')).toBeInTheDocument();
    analyzeUnifiedStock.mockResolvedValueOnce(unifiedAnalysisFixture());
    fireEvent.click(screen.getByRole('button', { name: '다시 실행' }));
    await waitFor(() => expect(screen.getByText('72.5')).toBeInTheDocument());
  });
});
