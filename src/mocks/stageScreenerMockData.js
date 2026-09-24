// Deliberate UI fixtures, not computed market data or investment signals.
// Keep separate from the legacy dashboard fixtures.
const STOCKS = [
  ['005930', '삼성전자', 'KOSPI', 71800, 1.12, 3260],
  ['000660', 'SK하이닉스', 'KOSPI', 192500, 2.34, 4820],
  ['035420', 'NAVER', 'KOSPI', 183400, 0.82, 840],
  ['005380', '현대차', 'KOSPI', 246000, -0.61, 1260],
  ['035720', '카카오', 'KOSPI', 38450, -1.41, 560],
  ['068270', '셀트리온', 'KOSPI', 192800, -0.83, 730],
  ['247540', '에코프로비엠', 'KOSDAQ', 167500, -2.18, 690],
  ['086520', '에코프로', 'KOSDAQ', 84500, 0.24, 430],
  ['035900', 'JYP Ent.', 'KOSDAQ', 58400, 0.69, 180],
  ['042700', '한미반도체', 'KOSPI', 118600, 1.83, 1120],
  ['058470', '리노공업', 'KOSDAQ', 207500, 1.17, 260],
  ['214150', '클래시스', 'KOSDAQ', 52800, 0.76, 140],
];
const HISTORIES = [
  [5, 5, 6, 6, 6, 1, 1], [6, 6, 1, 1, 1, 1, 1], [1, 1, 2, 2, 3, 2, 2],
  [1, 1, 2, 2, 2, 2, 2], [2, 2, 2, 2, 3, 3, 3], [2, 3, 3, 3, 3, 4, 4],
  [3, 3, 4, 4, 4, 4, 4], [4, 4, 4, 4, 4, 5, 5], [4, 4, 4, 5, 5, 5, 5],
  [4, 4, 5, 5, 5, 6, 6], [5, 5, 5, 5, 5, 5, 6], [5, 6, 6, 6, 6, 6, 6],
];
const PERIODS = [5, 20, 40];
const ARRANGEMENTS = { 1: [0, 1, 2], 2: [1, 0, 2], 3: [1, 2, 0], 4: [2, 1, 0], 5: [2, 0, 1], 6: [0, 2, 1] };
const SLOPES = { 1: [1.52618, 0.74261, 0.21347], 2: [-0.65237, 0.41182, 0.20614], 3: [-1.72482, -0.48211, 0.11256], 4: [-1.65288, -0.85312, -0.38754], 5: [0.42716, -0.36483, -0.21876], 6: [1.32847, 0.21382, -0.10244] };

export function getStageScreenerSample(mode, interval = '5') {
  const intraday = mode === 'SHORT_TERM';
  const offset = intraday ? ({ 1: 2, 3: 4, 5: 6, 15: 8 }[interval] ?? 6) : 0;
  const labels = intraday
    ? Array.from({ length: 7 }, (_, index) => {
      const minutes = 14 * 60 + 30 - (6 - index) * Number(interval);
      return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
    })
    : ['09.03', '09.04', '09.07', '09.08', '09.09', '09.10', '09.11'];
  return {
    asOf: intraday ? '2026.09.11 14:30' : '2026.09.11 장 마감',
    timeframe: intraday ? `${interval}분봉` : '일봉', unit: intraday ? '봉' : '거래일',
    rows: STOCKS.map(([stockCode, stockName, market, price, changeRate, amount], index) => {
      const history = HISTORIES[(index + offset) % HISTORIES.length];
      const stage = history.at(-1);
      let barsInStage = 1;
      while (history.at(-1 - barsInStage) === stage) barsInStage += 1;
      const previousDistinctStage = history.at(-1 - barsInStage);
      const ema = [0, 0, 0];
      ARRANGEMENTS[stage].forEach((emaIndex, position) => { ema[emaIndex] = price * (1.018314 - position * 0.024128); });
      const scale = intraday ? 0.27 : 1;
      const slopes = SLOPES[stage].map((value) => value * scale);
      if (stage === 6 && index % 2 === 0) slopes[2] = 0.071829 * scale;
      return {
        stockCode, stockName, market, price, changeRate, stage, history, labels,
        previousBarStage: history.at(-2), previousDistinctStage, barsInStage,
        transitionDirection: stage === previousDistinctStage % 6 + 1 ? 'FORWARD' : 'REVERSE',
        stageStartedAt: labels[labels.length - barsInStage], ema, slopes,
        shortMiddleGap: (ema[0] - ema[1]) / ema[1] * 100,
        middleLongGap: (ema[1] - ema[2]) / ema[2] * 100,
        bandState: [1, 4].includes(stage) ? 'EXPANDING' : 'CONTRACTING',
        tradingAmount100m: amount * (intraday ? 0.7 : 1),
        volumeRatio: [1.28, 1.84, 0.76, 0.91, 1.12, 1.42, 1.67, 0.72, 0.83, 1.16, 1.31, 1.08][index],
        emaPeriods: PERIODS, observationSource: index % 3 === 0 ? '계속 관찰' : '전체 관찰 대상',
      };
    }),
  };
}
