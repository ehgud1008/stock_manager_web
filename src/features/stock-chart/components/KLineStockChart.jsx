import { Box, Chip, Stack, Typography } from '@mui/material';
import { dispose, init } from 'klinecharts';
import PropTypes from 'prop-types';
import { useEffect, useMemo, useRef } from 'react';
import { getPricePeriodOption, PRICE_PERIOD } from '../../../constants/priceDataStatuses';
import {
  ensureIchimokuIndicatorRegistered,
  ICHIMOKU_COLORS,
  ICHIMOKU_DISPLACEMENT,
  ICHIMOKU_NAME,
} from '../indicators/ichimokuIndicator';

const CHART_HEIGHT = 720;
const ANALYSIS_LINE_COLORS = {
  current: '#D5D9E0',
  entry: '#71A7FF',
  stop: '#F27878',
  target: '#66D38A',
};

const isFiniteNumber = (value) => value != null
  && value !== ''
  && Number.isFinite(Number(value));

const toTimestamp = (date, index) => {
  if (typeof date === 'number' && Number.isFinite(date)) return date;

  const value = String(date ?? '').trim();
  const compactDate = value.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactDate) {
    return Date.UTC(
      Number(compactDate[1]),
      Number(compactDate[2]) - 1,
      Number(compactDate[3]),
    );
  }

  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    return Date.UTC(
      Number(isoDate[1]),
      Number(isoDate[2]) - 1,
      Number(isoDate[3]),
    );
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.UTC(2000, 0, index + 1);
};

const toKLineData = (candles) => candles
  .map((candle, index) => ({
    timestamp: toTimestamp(candle.date, index),
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
    volume: Number(candle.volume),
  }))
  .sort((left, right) => left.timestamp - right.timestamp);

const createAnalysisLevels = (analysis) => [
  isFiniteNumber(analysis?.currentPrice) && {
    key: 'current',
    label: '현재가',
    value: Number(analysis.currentPrice),
    color: ANALYSIS_LINE_COLORS.current,
  },
  isFiniteNumber(analysis?.entryFrom) && {
    key: 'entry-from',
    label: '진입 하단',
    value: Number(analysis.entryFrom),
    color: ANALYSIS_LINE_COLORS.entry,
  },
  isFiniteNumber(analysis?.entryTo) && {
    key: 'entry-to',
    label: '진입 상단',
    value: Number(analysis.entryTo),
    color: ANALYSIS_LINE_COLORS.entry,
  },
  isFiniteNumber(analysis?.stopLoss) && {
    key: 'stop',
    label: '손절',
    value: Number(analysis.stopLoss),
    color: ANALYSIS_LINE_COLORS.stop,
  },
  ...(analysis?.targets || []).map((value, index) => isFiniteNumber(value) && ({
    key: `target-${index}`,
    label: `목표 ${index + 1}`,
    value: Number(value),
    color: ANALYSIS_LINE_COLORS.target,
  })),
].filter(Boolean);

const chartStyles = {
  grid: {
    horizontal: { color: 'rgba(255,255,255,.055)', style: 'dashed' },
    vertical: { color: 'rgba(255,255,255,.04)', style: 'dashed' },
  },
  candle: {
    bar: {
      upColor: '#F27878',
      downColor: '#71A7FF',
      noChangeColor: '#929CAB',
      upBorderColor: '#F27878',
      downBorderColor: '#71A7FF',
      noChangeBorderColor: '#929CAB',
      upWickColor: '#F27878',
      downWickColor: '#71A7FF',
      noChangeWickColor: '#929CAB',
    },
    priceMark: {
      high: { color: '#D5D9E0' },
      low: { color: '#D5D9E0' },
      last: {
        upColor: '#F27878',
        downColor: '#71A7FF',
        noChangeColor: '#929CAB',
      },
    },
    tooltip: {
      title: { color: '#929CAB' },
      legend: { color: '#D5D9E0' },
    },
  },
  indicator: {
    ohlc: {
      upColor: '#F27878',
      downColor: '#71A7FF',
      noChangeColor: '#929CAB',
    },
    lines: [
      { color: '#F0B766' },
      { color: '#71A7FF' },
      { color: '#8BDA63' },
      { color: '#C491F5' },
      { color: '#F27878' },
    ],
    tooltip: {
      title: { color: '#929CAB' },
      legend: { color: '#D5D9E0' },
    },
  },
  xAxis: {
    axisLine: { color: 'rgba(255,255,255,.10)' },
    tickLine: { color: 'rgba(255,255,255,.10)' },
    tickText: { color: '#929CAB' },
  },
  yAxis: {
    axisLine: { color: 'rgba(255,255,255,.10)' },
    tickLine: { color: 'rgba(255,255,255,.10)' },
    tickText: { color: '#929CAB' },
  },
  separator: {
    color: 'rgba(255,255,255,.08)',
    activeBackgroundColor: 'rgba(139,218,99,.16)',
  },
  crosshair: {
    horizontal: {
      line: { color: 'rgba(213,217,224,.45)' },
      text: { color: '#080B12', backgroundColor: '#D5D9E0' },
    },
    vertical: {
      line: { color: 'rgba(213,217,224,.45)' },
      text: { color: '#080B12', backgroundColor: '#D5D9E0' },
    },
  },
};

const formatPrice = (value) => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 });

const KLINE_PERIOD = {
  [PRICE_PERIOD.MINUTE]: { span: 1, type: 'minute' },
  [PRICE_PERIOD.DAY]: { span: 1, type: 'day' },
  [PRICE_PERIOD.WEEK]: { span: 1, type: 'week' },
  [PRICE_PERIOD.MONTH]: { span: 1, type: 'month' },
};

const ICHIMOKU_LEGEND = [
  ['전환선 9', ICHIMOKU_COLORS.tenkan],
  ['기준선 26', ICHIMOKU_COLORS.kijun],
  ['선행스팬 A', ICHIMOKU_COLORS.spanA],
  ['선행스팬 B', ICHIMOKU_COLORS.spanB],
  ['후행스팬 26', ICHIMOKU_COLORS.chikou],
];

const BOLLINGER_LINES = [
  { label: '상단 +2σ', color: '#F0B766' },
  { label: '중심선 20', color: '#71A7FF' },
  { label: '하단 -2σ', color: '#8BDA63' },
];

const BOLLINGER_LINE_STYLES = BOLLINGER_LINES.map(({ color }) => ({
  color,
  size: 1.1,
  style: 'dashed',
  dashedValue: [5, 3],
}));

export default function KLineStockChart({
  stockCode,
  period,
  candles,
  analysis,
  ichimokuEnabled,
  bollingerEnabled,
  basic = false,
}) {
  const containerRef = useRef(null);
  const chartData = useMemo(() => toKLineData(candles), [candles]);
  const analysisLevels = useMemo(() => createAnalysisLevels(analysis), [analysis]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || chartData.length === 0) return undefined;

    const chart = init(container, {
      locale: 'en-US',
      timezone: 'Asia/Seoul',
      styles: chartStyles,
      layout: {
        yAxis: {
          scrollZoomEnabled: false,
        },
      },
    });
    if (!chart) return undefined;

    chart.setSymbol({ ticker: stockCode, pricePrecision: 0, volumePrecision: 0 });
    chart.setPeriod(KLINE_PERIOD[period] || KLINE_PERIOD[PRICE_PERIOD.DAY]);
    chart.setBarSpace(12);
    chart.setOffsetRightDistance(ichimokuEnabled
      ? (ICHIMOKU_DISPLACEMENT * 12) + 64
      : 64);
    chart.setRightMinVisibleBarCount(ichimokuEnabled ? ICHIMOKU_DISPLACEMENT : 0);
    chart.setDataLoader({
      getBars: ({ callback }) => callback(chartData, false),
    });

    if (!basic) chart.createIndicator({
      name: 'MA',
      calcParams: [5, 20, 60, 120],
      paneId: 'candle_pane',
    }, true);
    if (ichimokuEnabled) {
      ensureIchimokuIndicatorRegistered();
      chart.createIndicator({ name: ICHIMOKU_NAME, paneId: 'candle_pane' }, true);
    }
    if (bollingerEnabled) {
      chart.createIndicator({
        name: 'BOLL',
        calcParams: [20, 2],
        paneId: 'candle_pane',
        styles: { lines: BOLLINGER_LINE_STYLES },
      }, true);
    }
    const volumePaneId = chart.createIndicator(basic ? { name: 'VOL', calcParams: [] } : 'VOL');
    const rsiPaneId = !basic && chart.createIndicator({ name: 'RSI', calcParams: [14] });
    const macdPaneId = !basic && chart.createIndicator('MACD');

    [
      [volumePaneId, basic ? 80 : 115],
      [rsiPaneId, 115],
      [macdPaneId, 140],
    ].forEach(([id, height]) => {
      if (id) chart.setPaneOptions({ id, height, minHeight: 80, dragEnabled: true });
    });

    const lineTimestamp = chartData.at(-1).timestamp;
    analysisLevels.forEach((level) => {
      chart.createOverlay({
        name: 'horizontalStraightLine',
        groupId: 'analysis-levels',
        lock: true,
        points: [{ timestamp: lineTimestamp, value: level.value }],
        styles: {
          line: {
            color: level.color,
            size: level.key.startsWith('entry') ? 1 : 1.25,
            style: level.key.startsWith('entry') ? 'dashed' : 'solid',
            dashedValue: [5, 4],
          },
        },
      });
    });

    chart.scrollToRealTime();

    const handleResize = () => chart.resize();
    const resizeObserver = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(handleResize);
    resizeObserver?.observe(container);
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      dispose(chart);
    };
  }, [analysisLevels, basic, bollingerEnabled, chartData, ichimokuEnabled, period, stockCode]);

  const entryLabel = isFiniteNumber(analysis?.entryFrom) && isFiniteNumber(analysis?.entryTo)
    ? `진입 ${formatPrice(analysis.entryFrom)}–${formatPrice(analysis.entryTo)}`
    : null;
  const legendLevels = analysisLevels.filter((level) => !level.key.startsWith('entry'));

  return (
    <Stack gap={1.25}>
      {!basic && <Stack
        direction="row"
        gap={0.75}
        flexWrap="wrap"
        alignItems="center"
        aria-label="분석 가격선 범례"
      >
        <Typography variant="overline" color="text.secondary" mr={0.5}>
          분석 가격선
        </Typography>
        {entryLabel && (
          <Chip
            size="small"
            variant="outlined"
            label={entryLabel}
            sx={{ color: ANALYSIS_LINE_COLORS.entry, borderColor: `${ANALYSIS_LINE_COLORS.entry}66` }}
          />
        )}
        {legendLevels.map((level) => (
          <Chip
            key={level.key}
            size="small"
            variant="outlined"
            label={`${level.label} ${formatPrice(level.value)}`}
            sx={{ color: level.color, borderColor: `${level.color}66` }}
          />
        ))}
      </Stack>}
      {ichimokuEnabled && (
        <Stack
          direction="row"
          gap={1.25}
          flexWrap="wrap"
          alignItems="center"
          aria-label="일목균형표 범례"
        >
          <Typography variant="overline" color="text.secondary">
            일목균형표 9·26·52
          </Typography>
          {ICHIMOKU_LEGEND.map(([label, color]) => (
            <Stack key={label} direction="row" alignItems="center" gap={0.5}>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
      {bollingerEnabled && (
        <Stack
          direction="row"
          gap={1.25}
          flexWrap="wrap"
          alignItems="center"
          aria-label="볼린저밴드 범례"
        >
          <Typography variant="overline" color="text.secondary">
            볼린저밴드 20·2
          </Typography>
          {BOLLINGER_LINES.map(({ label, color }) => (
            <Stack key={label} direction="row" alignItems="center" gap={0.5}>
              <Box sx={{ width: 16, borderTop: `2px dashed ${color}` }} />
              <Typography variant="caption" color="text.secondary">{label}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
      <Box
        ref={containerRef}
        role="img"
        aria-label={basic ? `${getPricePeriodOption(period).chartLabel} 캔들·거래량 차트` : `${getPricePeriodOption(period).chartLabel} 캔들, 이동평균선${ichimokuEnabled ? ', 일목균형표' : ''}${bollingerEnabled ? ', 볼린저밴드' : ''}, 거래량, RSI, MACD 기술분석 차트`}
        sx={{
          width: '100%',
          height: basic ? { xs: 320, md: 380 } : { xs: 620, md: CHART_HEIGHT },
          minWidth: 0,
          overflow: 'hidden',
          borderRadius: 2,
          bgcolor: '#0B1018',
          border: '1px solid rgba(255,255,255,.06)',
        }}
      />
    </Stack>
  );
}

KLineStockChart.propTypes = {
  stockCode: PropTypes.string.isRequired,
  period: PropTypes.oneOf(Object.values(PRICE_PERIOD)).isRequired,
  candles: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    open: PropTypes.number.isRequired,
    high: PropTypes.number.isRequired,
    low: PropTypes.number.isRequired,
    close: PropTypes.number.isRequired,
    volume: PropTypes.number.isRequired,
  })).isRequired,
  analysis: PropTypes.object,
  basic: PropTypes.bool,
  ichimokuEnabled: PropTypes.bool.isRequired,
  bollingerEnabled: PropTypes.bool.isRequired,
};
