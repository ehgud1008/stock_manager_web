import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzeStockLive } from '../../../api/analysisApi';
import { completedAnalysisMock } from '../../../mocks/analysisMockData';
import ScreenerStockAnalysis from './ScreenerStockAnalysis';

vi.mock('../../../api/analysisApi', () => ({ analyzeStockLive: vi.fn() }));
const result = (name) => ({ data: { ...completedAnalysisMock, strategyName: name } });

describe('상세 종목 분석', () => {
  beforeEach(() => vi.resetAllMocks());
  it('실제 실행을 요청하고 분석 요약·전략·가격을 표시한다', async () => {
    analyzeStockLive.mockResolvedValue(result('새로 분석한 전략'));
    render(<ScreenerStockAnalysis stockCode="005930" mode="SWING" />);
    expect(screen.getByRole('status')).toHaveTextContent('종목을 분석');
    expect(screen.getByRole('button', { name: '종목 다시 분석' })).toBeDisabled();
    expect(await screen.findByText('새로 분석한 전략')).toBeInTheDocument();
    expect(screen.getByText('STRATEGY')).toBeInTheDocument();
    expect(screen.getByText('72.5')).toBeInTheDocument();
    expect(screen.getByText('74,000원')).toBeInTheDocument();
    expect(analyzeStockLive).toHaveBeenCalledWith('005930', {
      analysisMode: 'SWING', baseDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), forceRecalculate: true,
    });
  });
  it('실패 시 목업으로 대체하지 않고 명시적인 재시도를 제공한다', async () => {
    analyzeStockLive.mockRejectedValueOnce(new Error('수집 실패')).mockResolvedValue(result('재시도 결과'));
    render(<ScreenerStockAnalysis stockCode="005930" mode="SHORT_TERM" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('수집 실패');
    expect(screen.queryByText('STRATEGY')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '종목 분석 다시 시도' }));
    expect(await screen.findByText('재시도 결과')).toBeInTheDocument();
    expect(analyzeStockLive).toHaveBeenCalledTimes(2);
  });
  it('다른 종목으로 이동하면 이전 종목의 늦은 분석을 무시한다', async () => {
    let resolveOld;
    analyzeStockLive.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve; }))
      .mockResolvedValue(result('현재 종목 전략'));
    const view = render(<ScreenerStockAnalysis stockCode="005930" mode="SWING" />);
    view.rerender(<ScreenerStockAnalysis stockCode="000660" mode="SWING" />);
    await screen.findByText('현재 종목 전략');
    await act(async () => resolveOld(result('이전 종목 전략')));
    expect(screen.queryByText('이전 종목 전략')).not.toBeInTheDocument();
    expect(screen.getByText('현재 종목 전략')).toBeInTheDocument();
  });
});
