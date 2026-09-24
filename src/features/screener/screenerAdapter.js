export const STATUS_LABELS = { READY: '실행 대기', RUNNING: '분석 중', COMPLETED: '분석 완료', COMPLETED_WITH_ERRORS: '일부 실패·범위 부족', FAILED: '실행 실패', INTERRUPTED: '실행 중단' };
export const QUALITY_LABELS = { VALID: '정상', BOUNDARY: 'EMA 경계', INSUFFICIENT_DATA: '표본 부족', FAILED: '조회 실패', SKIPPED: '분석 제외', PENDING: '분석 대기' };
export const TRANSITION_LABELS = { FORWARD: '순행', REVERSE: '역행', SKIPPED: '단계 건너뜀', SAME: '유지', UNKNOWN: '전환 미확인' };
export const formatNumber = (value, digits = 2) => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits });
export const formatTime = (value) => value ? value.replace('T', ' ').slice(0, 19) : '—';
const numeric = (value) => value == null || !Number.isFinite(Number(value)) ? null : Number(value);

// Preserve the user's decimal threshold exactly: e.g. 0.29억원 -> "29"백만원, not 28.999999999999996.
export function amountToMillionWon(value) {
  if (value === '') return null;
  const [mantissa, exponent = '0'] = value.toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.replace(/^\+/, '').split('.');
  const digits = (whole || '0') + fraction;
  const position = digits.length - fraction.length + Number(exponent) + 2;
  const decimal = position <= 0 ? '0.' + '0'.repeat(-position) + digits
    : position >= digits.length ? digits + '0'.repeat(position - digits.length)
      : digits.slice(0, position) + '.' + digits.slice(position);
  return decimal.replace(/^0+(?=\d)/, '').replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

export function adaptScreenerSummary(item, config) {
  return adaptScreenerItem({ ...item, result: {
    quality: item.quality, stage: item.stage, previousDistinctStage: item.previousDistinctStage,
    barsInStage: item.barsInStage, barsSinceTransition: item.barsSinceTransition,
    stageDurationComplete: item.stageDurationComplete, lastTransition: item.lastTransition, config,
    slopes: { shortSlope: item.shortSlope, middleSlope: item.middleSlope, longSlope: item.longSlope },
    middleLongGap: { signedPercent: item.middleLongGap, state: item.gapState },
    features: { close: item.close, tradingAmountMillionWon: item.tradingAmountMillionWon },
  } });
}

export function adaptScreenerItem(item) {
  const r = item.result;
  const history = r?.history?.slice(-7) || [];
  return {
    stockCode: item.stockCode, stockName: item.stockName, market: item.market,
    status: item.status, quality: r?.quality || item.status, sourceComplete: item.sourceComplete,
    warnings: [...new Set([...(item.warnings || []), ...(r?.warnings || [])])], errorCode: item.errorCode,
    stage: r?.stage ?? null, previousBarStage: r?.previousBarStage ?? null, previousDistinctStage: r?.previousDistinctStage ?? null,
    barsInStage: r?.barsInStage ?? null, barsSinceTransition: r?.barsSinceTransition ?? null,
    stageDurationComplete: r?.stageDurationComplete ?? false, stageChanged: r?.stageChanged ?? false,
    transitionDirection: r?.lastTransition || 'UNKNOWN', stageStartedAt: r?.stageStartedAt,
    emaPeriods: [r?.config?.shortPeriod ?? 5, r?.config?.middlePeriod ?? 20, r?.config?.longPeriod ?? 40],
    slopeLookback: r?.config?.slopeLookback ?? 3,
    ema: [r?.ema?.shortEma, r?.ema?.middleEma, r?.ema?.longEma].map(numeric),
    slopes: [r?.slopes?.shortSlope, r?.slopes?.middleSlope, r?.slopes?.longSlope].map(numeric),
    shortMiddleGap: numeric(r?.shortMiddleGap?.signedPercent), middleLongGap: numeric(r?.middleLongGap?.signedPercent),
    bandState: r?.middleLongGap?.state || 'UNKNOWN',
    price: numeric(r?.features?.close), tradingAmount100m: r?.features?.tradingAmountMillionWon == null ? null : Number(r.features.tradingAmountMillionWon) / 100,
    volumeRatio: numeric(r?.features?.volumeRatio20), high52Week: r?.features?.high52Week,
    breakout20: r?.features?.breakout20, effectiveAt: r?.effectiveAt, asOf: r?.asOf,
    history: history.map((point) => point.stage), historyQuality: history.map((point) => point.quality),
    labels: history.map((point) => r.timeframe.mode === 'SWING' ? point.at?.slice(5, 10) : point.at?.slice(11, 16)),
    historyTimes: history.map((point) => formatTime(point.at)),
    observationSource: item.observationSource === 'MARKET_UNIVERSE' ? '전체 시장 목록' : '지정 종목',
    reasons: r?.reasons || [], engineVersion: r?.engineVersion,
  };
}
