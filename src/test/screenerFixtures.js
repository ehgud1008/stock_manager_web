// Backend-shaped fixtures for tests only. Production screens never import these.
import { adaptScreenerItem } from '../features/screener/screenerAdapter';
import { DEFAULT_FILTERS, filterScreenerRows } from '../features/screener/screenerModel';
export function runFixture(mode = 'SWING', interval = 0, overrides = {}) {
  return { runId: `run-${mode}-${interval}`, request: { mode, interval, market: 'ALL', stockCodes: [] },
    cutoff: '2026-09-13T10:00:00', finishedAt: '2026-09-13T01:05:00Z', status: 'COMPLETED',
    totalCount: 3, completedCount: 3, failedCount: 0, skippedCount: 0,
    config: { shortPeriod: 5, middlePeriod: 20, longPeriod: 40 }, ...overrides };
}
export function itemFixture(code = '005930', name = '삼성전자', stage = 1, overrides = {}) {
  return { stockCode: code, stockName: name, market: 'KOSPI', status: 'ANALYZED', sourceComplete: true, observationSource: 'MARKET_UNIVERSE', warnings: [],
    result: { stage, quality: 'VALID', previousBarStage: stage, previousDistinctStage: stage === 1 ? 6 : 5,
      barsInStage: 2, barsSinceTransition: 1, stageDurationComplete: true, stageChanged: false,
      stageStartedAt: '2026-09-10T00:00:00', lastTransition: 'FORWARD',
      config: { shortPeriod: 5, middlePeriod: 20, longPeriod: 40, slopeLookback: 3 }, timeframe: { mode: 'SWING', interval: 0 },
      ema: { shortEma: 70300.123456, middleEma: 70000, longEma: 69000 }, slopes: { shortSlope: 1.234567, middleSlope: 0.5, longSlope: 0.2 },
      shortMiddleGap: { signedPercent: 0.4, state: 'EXPANDING' }, middleLongGap: { signedPercent: 1.4, state: 'EXPANDING' },
      history: [null, 5, 6, stage, stage].map((s, i) => ({ at: `2026-09-${String(8+i).padStart(2,'0')}T00:00:00`, stage: s, quality: s ? 'VALID' : 'BOUNDARY' })),
      features: { close: 70500, tradingAmountMillionWon: 12345, volumeRatio20: 1.5, breakout20: false,
        high52Week: { high: 90000, distancePercent: 21.66666, coverage: 'FULL_WINDOW', breakout: false, referenceDate: '2026-09-12', inclusiveWindowStart: '2025-09-14' } },
      effectiveAt: '2026-09-13T00:00:00', warnings: [], ...overrides } };
}
export function fullItemsFixture() {
  return [itemFixture(), itemFixture('000660', 'SK하이닉스', 6),
    { stockCode: '000001', stockName: '조회실패종목', market: 'KOSDAQ', status: 'FAILED', sourceComplete: false, result: null, warnings: [], errorCode: 'SOURCE_OR_ANALYSIS_FAILED' }];
}
export function summaryFixture(item) {
  const r = item.result;
  return { stockCode: item.stockCode, stockName: item.stockName, market: item.market, status: item.status, sourceComplete: item.sourceComplete,
    quality: r?.quality ?? null, stage: r?.stage ?? null, previousDistinctStage: r?.previousDistinctStage ?? null,
    barsInStage: r?.barsInStage ?? null, barsSinceTransition: r?.barsSinceTransition ?? null, stageDurationComplete: r?.stageDurationComplete ?? false,
    lastTransition: r?.lastTransition ?? null, shortSlope: r?.slopes?.shortSlope ?? null, middleSlope: r?.slopes?.middleSlope ?? null, longSlope: r?.slopes?.longSlope ?? null,
    middleLongGap: r?.middleLongGap?.signedPercent ?? null, gapState: r?.middleLongGap?.state ?? null,
    close: r?.features?.close ?? null, tradingAmountMillionWon: r?.features?.tradingAmountMillionWon ?? null };
}
export function pageFixture(mode = 'SWING', interval = 0, query = {}, items = fullItemsFixture()) {
  const page = query.page ?? 0, size = query.size ?? 20;
  const filters = { ...DEFAULT_FILTERS, market: query.market ?? 'ALL', stage: query.stage == null ? 'ALL' : String(query.stage),
    transition: query.transitionFilter ?? 'ALL', slope: query.slope ?? 'ALL', gap: query.middleLongGap ?? 'ALL',
    search: query.search ?? '', minAmount: query.minTradingAmountMillionWon == null ? '' : String(query.minTradingAmountMillionWon / 100), watchOnly: query.watchOnly ?? false };
  const watched = (query.watchedCodes ?? []).map((code) => `${mode}:${code}`);
  const rows = items.map(adaptScreenerItem);
  const matching = filterScreenerRows(rows, filters, watched, mode);
  const broad = filterScreenerRows(rows, { ...filters, stage: 'ALL' }, watched, mode);
  const codes = new Set(matching.map((row) => row.stockCode));
  return { run: runFixture(mode, interval), storageMode: 'DATABASE', page, size,
    content: items.filter((item) => codes.has(item.stockCode)).slice(page * size, (page + 1) * size).map(summaryFixture), totalElements: matching.length,
    stageCounts: Object.fromEntries([1,2,3,4,5,6].map((stage) => [stage, broad.filter((row) => row.stage === stage).length])),
    recentCount: rows.filter((row) => row.barsSinceTransition != null && row.barsSinceTransition < 3).length,
    watchCount: items.filter((item) => (query.watchedCodes ?? []).includes(item.stockCode)).length };
}
