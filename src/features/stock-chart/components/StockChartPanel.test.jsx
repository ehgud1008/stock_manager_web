import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispose, init } from 'klinecharts';
import { getStockPrices } from '../../../api/priceApi';
import StockChartPanel from './StockChartPanel';

vi.mock('../../../api/priceApi', () => ({ getStockPrices: vi.fn() }));

const chartMock = vi.hoisted(() => ({
  setSymbol: vi.fn(),
  setPeriod: vi.fn(),
  setBarSpace: vi.fn(),
  setOffsetRightDistance: vi.fn(),
  setRightMinVisibleBarCount: vi.fn(),
  setDataLoader: vi.fn(),
  createIndicator: vi.fn((indicator) => {
    const name = typeof indicator === 'string' ? indicator : indicator.name;
    return `${name.toLowerCase()}-pane`;
  }),
  setPaneOptions: vi.fn(),
  createOverlay: vi.fn(),
  scrollToRealTime: vi.fn(),
  resize: vi.fn(),
}));

vi.mock('klinecharts', () => ({
  init: vi.fn(() => chartMock),
  dispose: vi.fn(),
  registerIndicator: vi.fn(),
  registerOverlay: vi.fn(),
}));

const successData = {
  stockCode: '005930',
  period: 'DAY',
  status: 'SUCCESS',
  isLatest: true,
  baseDate: '2026-07-24',
  lastCollectedAt: '2026-07-24T18:10:00+09:00',
  source: 'AN_STOCK_DAILY_CANDLE',
  candles: [
    { date: '2026-07-23', open: 70000, high: 71000, low: 69500, close: 70500, volume: 1000 },
    { date: '2026-07-24', open: 70500, high: 72000, low: 70200, close: 71500, volume: 1300 },
  ],
};

describe('자동 차트 기법 표시', () => {
  beforeEach(() => vi.clearAllMocks());
  const rangeData = { ...successData, candles: Array.from({ length: 85 }, (_, i) => {
    const close = 100 + 3 * Math.sin(i * Math.PI / 4);
    return { date: new Date(Date.UTC(2025, 0, i + 1)).toISOString(), open: close,
      high: close + 1, low: close - 1, close, volume: 100 };
  }) };
  it('판정 근거와 구간을 표시하고 표시 전환 시 제거한다', async () => {
    getStockPrices.mockResolvedValue({ data: rangeData });
    render(<StockChartPanel stockCode="005930" />);
    expect(await screen.findByLabelText('자동 차트 기법 분석')).toHaveTextContent('박스권 내부');
    expect(chartMock.createOverlay).toHaveBeenCalledWith(expect.objectContaining({ name: 'techniqueZone', groupId: 'chart-techniques' }));
    chartMock.createOverlay.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '지지·저항 영역 표시' }));
    expect(dispose).toHaveBeenCalled();
    expect(chartMock.createOverlay.mock.calls.every(([overlay]) => overlay.extendData?.color === '#F0B766')).toBe(true);
    expect(screen.queryByText('보라: 지지·저항 구간 경계')).not.toBeInTheDocument();
    expect(screen.getByText('주황: 박스권 경계')).toBeInTheDocument();
    chartMock.createOverlay.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '박스권 표시' }));
    expect(chartMock.createOverlay).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('자동 기법 범례')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '지지·저항 영역 표시' }));
    expect(chartMock.createOverlay).toHaveBeenCalled();
  });
  it('주기를 바꾸면 일봉 판정선을 재사용하지 않는다', async () => {
    getStockPrices.mockResolvedValue({ data: rangeData });
    render(<StockChartPanel stockCode="005930" />);
    await screen.findByLabelText('자동 차트 기법 분석');
    chartMock.createOverlay.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '주봉 조회' }));
    expect(await screen.findByText('자동 기법 분석은 일봉에서 제공됩니다.')).toBeInTheDocument();
    expect(chartMock.createOverlay).not.toHaveBeenCalled();
    for (const name of ['지지·저항 영역 표시', '피보나치 표시', '박스권 표시']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
  });
  it('피보나치 가격선과 기준 파동을 독립적으로 켜고 끈다', async () => {
    const candles = Array.from({ length: 90 }, (_, i) => {
      const close = i < 50 ? 110 - i * 0.2 : i < 76 ? 100 + (i - 50) * 2 : 150 - (i - 75) * 1.2;
      return { date: new Date(Date.UTC(2025, 0, i + 1)).toISOString(), open: close,
        high: close + 1, low: close - 1, close, volume: 100 };
    });
    getStockPrices.mockResolvedValue({ data: { ...successData, candles } });
    render(<StockChartPanel stockCode="005930" />);
    await screen.findByLabelText('자동 차트 기법 분석');
    const hasFib = () => chartMock.createOverlay.mock.calls.some(([o]) => o.extendData?.color === '#55C9C0');
    expect(hasFib()).toBe(true);
    chartMock.createOverlay.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '지지·저항 영역 표시' }));
    expect(hasFib()).toBe(true);
    expect(chartMock.createOverlay).toHaveBeenCalledWith(expect.objectContaining({ name: 'segment' }));
    chartMock.createOverlay.mockClear();
    fireEvent.click(screen.getByRole('button', { name: '피보나치 표시' }));
    expect(hasFib()).toBe(false);
    expect(chartMock.createOverlay.mock.calls.some(([o]) => o.name === 'segment')).toBe(false);
    expect(screen.queryByText('청록: 피보나치·기준 파동')).not.toBeInTheDocument();
    expect(screen.getByLabelText('자동 차트 기법 분석')).toHaveTextContent('피보나치 적용 후보');
    fireEvent.click(screen.getByRole('button', { name: '피보나치 표시' }));
    expect(hasFib()).toBe(true);
    expect(screen.getByRole('button', { name: '지지·저항 영역 표시' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('종목 변경 후 데이터가 부족하면 이전 구간을 제거한다', async () => {
    getStockPrices.mockResolvedValueOnce({ data: rangeData }).mockResolvedValueOnce({ data: successData });
    const { rerender } = render(<StockChartPanel stockCode="005930" />);
    await screen.findByLabelText('자동 차트 기법 분석');
    chartMock.createOverlay.mockClear();
    rerender(<StockChartPanel stockCode="000660" />);
    expect(await screen.findByText('일봉 60개 이상이 필요합니다.')).toBeInTheDocument();
    expect(chartMock.createOverlay).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('자동 기법 범례')).not.toBeInTheDocument();
  });
});

describe('StockChartPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('스크리너용 기본 차트는 실제 가격으로 캔들·거래량만 표시한다', async () => {
    getStockPrices.mockResolvedValue({ success: true, data: successData });
    render(<StockChartPanel stockCode="005930" basic realData />);
    expect(await screen.findByRole('img', { name: '일봉 캔들·거래량 차트' })).toBeInTheDocument();
    await waitFor(() => expect(chartMock.createIndicator).toHaveBeenCalledTimes(1));
    expect(chartMock.createIndicator).toHaveBeenCalledWith({ name: 'VOL', calcParams: [] });
    expect(chartMock.createOverlay).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '일목균형표 표시' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '볼린저밴드 표시' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /차트 보조지표 안내/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('분석 가격선 범례')).not.toBeInTheDocument();
    expect(getStockPrices).toHaveBeenCalledWith('005930', 'DAY', 1, { realData: true });
  });

  it('늦게 도착한 이전 주기의 가격 응답을 무시한다', async () => {
    let resolveDay;
    getStockPrices.mockImplementation((_stock, period) => period === 'DAY'
      ? new Promise((resolve) => { resolveDay = resolve; })
      : Promise.resolve({ data: { ...successData, baseDate: '2026-07-25' } }));
    render(<StockChartPanel stockCode="005930" basic realData />);
    fireEvent.click(screen.getByRole('button', { name: '주봉 조회' }));
    await screen.findByText(/기준일 2026-07-25/);
    await act(async () => resolveDay({ data: successData }));
    await waitFor(() => expect(chartMock.setPeriod).toHaveBeenCalledWith({ span: 1, type: 'week' }));
    expect(screen.queryByText(/기준일 2026-07-24/)).not.toBeInTheDocument();
  });

  it('서버가 지원하는 일봉을 조회하고 분석 가격선을 표시한다', async () => {
    getStockPrices.mockResolvedValue({ success: true, data: successData });

    render(
      <StockChartPanel
        stockCode="005930"
        analysis={{ currentPrice: 71500, entryFrom: 70000, entryTo: 71000, targets: [74000], stopLoss: 68000 }}
      />,
    );

    expect(await screen.findByText('최신 데이터')).toBeInTheDocument();
    expect(screen.getByText(/기준일 2026-07-24 00:00:00/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '일봉 조회' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('진입 70,000–71,000')).toBeInTheDocument();
    expect(screen.getByText('목표 1 74,000')).toBeInTheDocument();
    expect(screen.getByText('손절 68,000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '일목균형표 표시' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '볼린저밴드 표시' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByLabelText('일목균형표 범례')).toHaveTextContent('일목균형표 9·26·52');
    expect(screen.getByRole('img', { name: /RSI, MACD 기술분석 차트/ })).toBeInTheDocument();
    expect(init).toHaveBeenCalledOnce();
    expect(init).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        layout: {
          yAxis: {
            scrollZoomEnabled: false,
          },
        },
      }),
    );
    expect(chartMock.createIndicator).toHaveBeenCalledWith(
      { name: 'MA', calcParams: [5, 20, 60, 120], paneId: 'candle_pane' },
      true,
    );
    expect(chartMock.createIndicator).toHaveBeenCalledWith(
      { name: 'ICHIMOKU', paneId: 'candle_pane' },
      true,
    );
    expect(chartMock.setOffsetRightDistance).toHaveBeenCalledWith(376);
    expect(chartMock.setRightMinVisibleBarCount).toHaveBeenCalledWith(26);
    expect(chartMock.createIndicator).toHaveBeenCalledWith('VOL');
    expect(chartMock.createIndicator).toHaveBeenCalledWith({ name: 'RSI', calcParams: [14] });
    expect(chartMock.createIndicator).toHaveBeenCalledWith('MACD');
    expect(chartMock.createOverlay).toHaveBeenCalledTimes(5);
    expect(getStockPrices).toHaveBeenCalledWith('005930', 'DAY', 1);
  });

  it('볼린저밴드를 선택하면 20기간·표준편차 2배 밴드를 가격 차트에 표시한다', async () => {
    getStockPrices.mockResolvedValue({ success: true, data: successData });
    render(<StockChartPanel stockCode="005930" />);

    await screen.findByText('최신 데이터');
    fireEvent.click(screen.getByRole('button', { name: '볼린저밴드 표시' }));

    expect(await screen.findByLabelText('볼린저밴드 범례')).toHaveTextContent('볼린저밴드 20·2');
    expect(screen.getByRole('button', { name: '볼린저밴드 표시' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('img', { name: /볼린저밴드/ })).toBeInTheDocument();
    expect(chartMock.createIndicator).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'BOLL',
        calcParams: [20, 2],
        paneId: 'candle_pane',
        styles: {
          lines: expect.arrayContaining([
            expect.objectContaining({ style: 'dashed', dashedValue: [5, 3] }),
          ]),
        },
      }),
      true,
    );
  });

  it('현재 사용하는 보조지표의 간단한 설명을 제공한다', async () => {
    getStockPrices.mockResolvedValue({ success: true, data: successData });
    render(<StockChartPanel stockCode="005930" />);

    const guideButton = await screen.findByRole('button', { name: /차트 보조지표 안내/ });
    fireEvent.click(guideButton);

    expect(await screen.findByText('이동평균선 (5·20·60·120)')).toBeInTheDocument();
    expect(screen.getByText('볼린저밴드 (20, 2)')).toBeInTheDocument();
    expect(screen.getByText('일목균형표 (9·26·52)')).toBeInTheDocument();
    expect(screen.getByText('거래량 (VOL)')).toBeInTheDocument();
    expect(screen.getByText('RSI (14)')).toBeInTheDocument();
    expect(screen.getByText('MACD (12·26·9)')).toBeInTheDocument();
    expect(screen.queryByText(/DMI|ADX|OBV|ATR|VWAP/)).not.toBeInTheDocument();
  });

  it('일목균형표를 끄면 구름 영역과 범례를 제거한다', async () => {
    getStockPrices.mockResolvedValue({ success: true, data: successData });
    render(<StockChartPanel stockCode="005930" />);

    await screen.findByLabelText('일목균형표 범례');
    fireEvent.click(screen.getByRole('button', { name: '일목균형표 표시' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '일목균형표 표시' }))
        .toHaveAttribute('aria-pressed', 'false');
    });
    expect(screen.queryByLabelText('일목균형표 범례')).not.toBeInTheDocument();
    expect(chartMock.setOffsetRightDistance).toHaveBeenLastCalledWith(64);
    expect(chartMock.setRightMinVisibleBarCount).toHaveBeenLastCalledWith(0);
    expect(dispose).toHaveBeenCalled();
    expect(chartMock.createIndicator.mock.calls.filter(
      ([indicator]) => indicator?.name === 'ICHIMOKU',
    )).toHaveLength(1);
  });

  it.each([
    ['1분봉 조회', 'MINUTE', { span: 1, type: 'minute' }],
    ['주봉 조회', 'WEEK', { span: 1, type: 'week' }],
    ['월봉 조회', 'MONTH', { span: 1, type: 'month' }],
  ])('%s 버튼으로 전문 조회 주기를 변경한다', async (buttonName, period, chartPeriod) => {
    getStockPrices.mockResolvedValue({ success: true, data: successData });
    render(<StockChartPanel stockCode="005930" />);

    await screen.findByText('최신 데이터');
    fireEvent.click(screen.getByRole('button', { name: buttonName }));

    await waitFor(() => expect(getStockPrices).toHaveBeenCalledWith('005930', period, 1));
    await waitFor(() => expect(chartMock.setPeriod).toHaveBeenCalledWith(chartPeriod));
  });

  it.each([
    ['COLLECTION_FAILED', '가격 데이터 수집 실패'],
    ['INSUFFICIENT_DATA', '가격 데이터 부족'],
  ])('%s 상태를 구분하여 표시한다', async (status, message) => {
    getStockPrices.mockResolvedValue({
      success: true,
      data: { ...successData, status, candles: [], statusMessage: message },
    });

    render(<StockChartPanel stockCode="005930" />);

    expect(await screen.findByRole('heading', { name: message })).toBeInTheDocument();
  });
});
