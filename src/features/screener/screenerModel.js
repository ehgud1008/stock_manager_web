export const STAGES = [
  { id: 1, label: '상승 추세', order: '단기 › 중기 › 장기', color: '#8BDA63', lines: [0, 1, 2] },
  { id: 2, label: '상승 둔화', order: '중기 › 단기 › 장기', color: '#D1C276', lines: [1, 0, 2] },
  { id: 3, label: '하락 전환', order: '중기 › 장기 › 단기', color: '#EBAB7D', lines: [2, 0, 1] },
  { id: 4, label: '하락 추세', order: '장기 › 중기 › 단기', color: '#EF8585', lines: [2, 1, 0] },
  { id: 5, label: '하락 둔화', order: '장기 › 단기 › 중기', color: '#A7A0EA', lines: [1, 2, 0] },
  { id: 6, label: '상승 전환', order: '단기 › 장기 › 중기', color: '#78BEDE', lines: [0, 2, 1] },
];

export const DEFAULT_FILTERS = {
  stage: 'ALL', market: 'ALL', transition: 'ALL', slope: 'ALL', gap: 'ALL',
  search: '', minAmount: '', watchOnly: false,
};

export const GAP_LABELS = { EXPANDING: '확대', CONTRACTING: '축소', FLAT: '유지', CROSSING: '교차', UNKNOWN: '미확인' };
export const signed = (value, digits = 2) => value == null || !Number.isFinite(Number(value)) ? '—' : `${value > 0 ? '+' : ''}${Number(value).toFixed(digits)}`;
export const watchKey = (mode, stockCode) => `${mode}:${stockCode}`;

export function filterScreenerRows(rows, filters, watched, mode) {
  const query = filters.search.trim().toLocaleLowerCase('ko-KR');
  return rows.filter((row) => {
    if (filters.stage !== 'ALL' && row.stage !== Number(filters.stage)) return false;
    if (filters.market !== 'ALL' && row.market !== filters.market) return false;
    if (query && !`${row.stockName} ${row.stockCode}`.toLocaleLowerCase('ko-KR').includes(query)) return false;
    if (filters.minAmount !== '' && (row.tradingAmount100m == null || row.tradingAmount100m < Number(filters.minAmount))) return false;
    if (filters.watchOnly && !watched.includes(watchKey(mode, row.stockCode))) return false;
    if (filters.slope === 'ALL_UP' && !row.slopes.every((value) => value > 0)) return false;
    if (filters.slope === 'MID_LONG_UP' && !(row.slopes[1] > 0 && row.slopes[2] > 0)) return false;
    if (filters.gap !== 'ALL' && row.bandState !== filters.gap) return false;
    const recent = row.barsSinceTransition != null && row.barsSinceTransition < 3;
    if (filters.transition === 'RECENT' && !recent) return false;
    if (filters.transition === 'REVERSE' && row.transitionDirection !== 'REVERSE') return false;
    if (filters.transition === '5_6' && !(row.previousDistinctStage === 5 && row.stage === 6 && recent)) return false;
    if (filters.transition === '6_1' && !(row.previousDistinctStage === 6 && row.stage === 1 && recent)) return false;
    if (filters.transition === 'HOLD_1' && !(row.stage === 1 && row.barsInStage >= 4)) return false;
    return true;
  });
}
