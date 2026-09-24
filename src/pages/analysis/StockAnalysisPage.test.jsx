import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeStock,
  getAnalysisHistory,
  getStockAnalysis,
} from '../../api/analysisApi';
import { getStockPrices } from '../../api/priceApi';
import { completedAnalysisMock } from '../../mocks/analysisMockData';
import StockAnalysisPage from './StockAnalysisPage';

vi.mock('../../api/analysisApi', () => ({
  analyzeStock: vi.fn(),
  getAnalysisHistory: vi.fn(),
  getAnalysisRun: vi.fn(),
  getStockAnalysis: vi.fn(),
}));
vi.mock('../../api/priceApi', () => ({ getStockPrices: vi.fn() }));

const emptyHistory = {
  success: true,
  data: {
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 0,
  },
};

const renderPage = () => render(
  <MemoryRouter initialEntries={['/analysis/005930']}>
    <Link to="/analysis/000660">테스트 다른 종목</Link>
    <Link to="/analysis/005930">테스트 원래 종목</Link>
    <Routes>
      <Route path="/analysis/:stockCode" element={<StockAnalysisPage />} />
    </Routes>
  </MemoryRouter>,
);

describe('StockAnalysisPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAnalysisHistory.mockResolvedValue(emptyHistory);
    getStockPrices.mockResolvedValue({
      success: true,
      data: {
        stockCode: '005930',
        period: 'DAY',
        status: 'INSUFFICIENT_DATA',
        statusMessage: '가격 데이터가 부족합니다.',
        isLatest: true,
        baseDate: null,
        lastCollectedAt: null,
        source: 'AN_STOCK_DAILY_CANDLE',
        candles: [],
      },
    });
  });

  it('최신 분석의 점수, 전략, 팩터와 근거를 표시한다', async () => {
    getStockAnalysis.mockResolvedValue({ success: true, data: completedAnalysisMock });
    renderPage();

    expect(await screen.findByText('72.5')).toBeInTheDocument();
    expect(screen.getByText(/결과 기준일 2026-07-19 00:00:00/)).toBeInTheDocument();
    expect(screen.getByText('스윙 눌림목 대기')).toBeInTheDocument();
    expect(screen.getByText('스윙 시간대 점수')).toBeInTheDocument();
    expect(screen.getAllByText('58.4')).not.toHaveLength(0);
    expect(screen.getAllByText('76.8')).not.toHaveLength(0);
    expect(screen.getAllByText('69.2')).not.toHaveLength(0);
    expect(screen.getByText(/눌림목 확인 후 진입을 기다립니다/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '단타 · 준비 중' })).toBeDisabled();
    expect(screen.getByText('팩터별 점수')).toBeInTheDocument();
    expect(screen.getByText('일봉 기술점수')).toBeInTheDocument();
    expect(screen.getByText('주봉 기술점수')).toBeInTheDocument();
    expect(screen.getByText('월봉 기술점수')).toBeInTheDocument();
    expect(screen.getByText('분석 근거와 확인 사항')).toBeInTheDocument();
    expect(screen.getByText('과거 표본 220건')).toBeInTheDocument();
  });

  it('저장된 분석이 없으면 첫 분석 실행을 안내한다', async () => {
    const notFound = new Error('분석 결과가 없습니다.');
    notFound.status = 404;
    getStockAnalysis.mockRejectedValue(notFound);
    renderPage();

    expect(await screen.findByText('아직 분석 결과가 없습니다')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '첫 분석 실행' })).toBeInTheDocument();
  });

  it('분석 실행 결과를 즉시 반영하고 이력을 다시 조회한다', async () => {
    const notFound = new Error('분석 결과가 없습니다.');
    notFound.status = 404;
    getStockAnalysis.mockRejectedValue(notFound);
    analyzeStock.mockResolvedValue({ success: true, data: completedAnalysisMock });
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '종목분석 실행' }));

    await waitFor(() => expect(analyzeStock).toHaveBeenCalledWith(
      '005930',
      expect.objectContaining({ analysisMode: 'SWING', forceRecalculate: false }),
    ));
    expect(await screen.findByText('72.5')).toBeInTheDocument();
    await waitFor(() => expect(getAnalysisHistory).toHaveBeenCalledTimes(2));
  });

  it('API 오류 시 오류 메시지를 표시한다', async () => {
    getStockAnalysis.mockRejectedValue(new Error('분석 서버에 연결할 수 없습니다.'));
    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent('분석 서버에 연결할 수 없습니다.');
  });

  it('명시적 미보유를 전달하고 종목 왕복 이동 시 보유 입력을 초기화한다', async () => {
    getStockAnalysis.mockResolvedValue({ success: true, data: completedAnalysisMock });
    analyzeStock.mockResolvedValue({ success: true, data: completedAnalysisMock });
    renderPage();
    await screen.findByText('72.5');
    fireEvent.mouseDown(screen.getByLabelText('보유 상태'));
    fireEvent.click(await screen.findByRole('option', { name: '미보유' }));
    fireEvent.click(screen.getByRole('button', { name: '종목분석 실행' }));
    await waitFor(() => expect(analyzeStock).toHaveBeenLastCalledWith('005930', expect.objectContaining({ position: { held: false } })));
    await screen.findByText('72.5');
    fireEvent.click(screen.getByText('테스트 다른 종목'));
    await screen.findByText('미확인 · 종목 신호만 분석');
    fireEvent.click(screen.getByText('테스트 원래 종목'));
    await screen.findByText('72.5');
    fireEvent.click(screen.getByRole('button', { name: '종목분석 실행' }));
    await waitFor(() => expect(analyzeStock).toHaveBeenCalledTimes(2));
    expect(analyzeStock.mock.calls[1][1]).not.toHaveProperty('position');
  });
});
