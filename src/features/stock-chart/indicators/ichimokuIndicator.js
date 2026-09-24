import { registerIndicator } from 'klinecharts';

export const ICHIMOKU_NAME = 'ICHIMOKU';
export const ICHIMOKU_PARAMS = [9, 26, 52];
export const ICHIMOKU_DISPLACEMENT = 26;

export const ICHIMOKU_COLORS = {
  tenkan: '#F0B766',
  kijun: '#71A7FF',
  spanA: '#66D38A',
  spanB: '#C491F5',
  chikou: '#F27878',
  bullishCloud: 'rgba(102, 211, 138, .14)',
  bearishCloud: 'rgba(242, 120, 120, .12)',
};

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const midpoint = (dataList, index, period) => {
  if (index < period - 1) return undefined;

  let highest = Number.NEGATIVE_INFINITY;
  let lowest = Number.POSITIVE_INFINITY;
  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    highest = Math.max(highest, Number(dataList[cursor].high));
    lowest = Math.min(lowest, Number(dataList[cursor].low));
  }
  return (highest + lowest) / 2;
};

export const calculateIchimoku = (
  dataList,
  params = ICHIMOKU_PARAMS,
) => {
  const [tenkanPeriod, kijunPeriod, spanBPeriod] = params;
  const raw = dataList.map((_, index) => {
    const tenkan = midpoint(dataList, index, tenkanPeriod);
    const kijun = midpoint(dataList, index, kijunPeriod);
    return {
      tenkan,
      kijun,
      rawSpanA: isFiniteNumber(tenkan) && isFiniteNumber(kijun)
        ? (tenkan + kijun) / 2
        : undefined,
      rawSpanB: midpoint(dataList, index, spanBPeriod),
    };
  });

  return dataList.map((item, index) => {
    const displacedSource = raw[index - ICHIMOKU_DISPLACEMENT];
    return {
      ...raw[index],
      spanA: displacedSource?.rawSpanA,
      spanB: displacedSource?.rawSpanB,
      chikou: dataList[index + ICHIMOKU_DISPLACEMENT]?.close,
      close: item.close,
    };
  });
};

const point = (xAxis, yAxis, index, value) => {
  if (!isFiniteNumber(value)) return null;
  return {
    x: xAxis.convertToPixel(index),
    y: yAxis.convertToPixel(Number(value)),
  };
};

const drawLine = (ctx, points, color, width = 1) => {
  let started = false;
  ctx.beginPath();
  points.forEach((current) => {
    if (!current) {
      started = false;
      return;
    }
    if (started) ctx.lineTo(current.x, current.y);
    else ctx.moveTo(current.x, current.y);
    started = true;
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
};

const fillCloud = (ctx, left, right) => {
  const bullish = ((left.spanA + right.spanA) / 2)
    >= ((left.spanB + right.spanB) / 2);
  ctx.beginPath();
  ctx.moveTo(left.a.x, left.a.y);
  ctx.lineTo(right.a.x, right.a.y);
  ctx.lineTo(right.b.x, right.b.y);
  ctx.lineTo(left.b.x, left.b.y);
  ctx.closePath();
  ctx.fillStyle = bullish
    ? ICHIMOKU_COLORS.bullishCloud
    : ICHIMOKU_COLORS.bearishCloud;
  ctx.fill();
};

export const drawIchimoku = ({ ctx, indicator, bounding, xAxis, yAxis }) => {
  const result = indicator.result || [];
  if (result.length === 0) return true;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, bounding.width, bounding.height);
  ctx.clip();

  const lastIndex = result.length - 1;
  let previousCloudPoint = null;
  for (let displayIndex = 0;
    displayIndex <= lastIndex + ICHIMOKU_DISPLACEMENT;
    displayIndex += 1) {
    const source = result[displayIndex - ICHIMOKU_DISPLACEMENT];
    const spanA = source?.rawSpanA;
    const spanB = source?.rawSpanB;
    const a = point(xAxis, yAxis, displayIndex, spanA);
    const b = point(xAxis, yAxis, displayIndex, spanB);
    const currentCloudPoint = a && b ? { a, b, spanA, spanB } : null;
    if (previousCloudPoint && currentCloudPoint) {
      const leftX = previousCloudPoint.a.x;
      const rightX = currentCloudPoint.a.x;
      if (rightX >= 0 && leftX <= bounding.width) {
        fillCloud(ctx, previousCloudPoint, currentCloudPoint);
      }
    }
    previousCloudPoint = currentCloudPoint;
  }

  const baseIndexes = result.map((_, index) => index);
  drawLine(
    ctx,
    baseIndexes.map((index) => point(xAxis, yAxis, index, result[index].tenkan)),
    ICHIMOKU_COLORS.tenkan,
    1.15,
  );
  drawLine(
    ctx,
    baseIndexes.map((index) => point(xAxis, yAxis, index, result[index].kijun)),
    ICHIMOKU_COLORS.kijun,
    1.15,
  );
  drawLine(
    ctx,
    baseIndexes.map((index) => point(xAxis, yAxis, index, result[index].chikou)),
    ICHIMOKU_COLORS.chikou,
    1,
  );

  const spanIndexes = Array.from(
    { length: result.length + ICHIMOKU_DISPLACEMENT },
    (_, index) => index,
  );
  drawLine(
    ctx,
    spanIndexes.map((displayIndex) => point(
      xAxis,
      yAxis,
      displayIndex,
      result[displayIndex - ICHIMOKU_DISPLACEMENT]?.rawSpanA,
    )),
    ICHIMOKU_COLORS.spanA,
    1.1,
  );
  drawLine(
    ctx,
    spanIndexes.map((displayIndex) => point(
      xAxis,
      yAxis,
      displayIndex,
      result[displayIndex - ICHIMOKU_DISPLACEMENT]?.rawSpanB,
    )),
    ICHIMOKU_COLORS.spanB,
    1.1,
  );

  ctx.restore();
  return true;
};

export const ICHIMOKU_INDICATOR = {
  name: ICHIMOKU_NAME,
  shortName: '일목',
  series: 'price',
  precision: 0,
  shouldOhlc: true,
  calcParams: ICHIMOKU_PARAMS,
  figures: [
    { key: 'tenkan', title: '전환선: ', type: 'line' },
    { key: 'kijun', title: '기준선: ', type: 'line' },
    { key: 'spanA', title: '선행A: ', type: 'line' },
    { key: 'spanB', title: '선행B: ', type: 'line' },
    { key: 'chikou', title: '후행: ', type: 'line' },
  ],
  styles: {
    lines: [
      { color: ICHIMOKU_COLORS.tenkan, size: 1.15 },
      { color: ICHIMOKU_COLORS.kijun, size: 1.15 },
      { color: ICHIMOKU_COLORS.spanA, size: 1.1 },
      { color: ICHIMOKU_COLORS.spanB, size: 1.1 },
      { color: ICHIMOKU_COLORS.chikou, size: 1 },
    ],
  },
  calc: (dataList, indicator) => calculateIchimoku(dataList, indicator.calcParams),
  draw: drawIchimoku,
};

let registered = false;

export const ensureIchimokuIndicatorRegistered = () => {
  if (registered) return;
  registerIndicator(ICHIMOKU_INDICATOR);
  registered = true;
};
