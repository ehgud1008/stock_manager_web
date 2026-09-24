export function unifiedAnalysisFixture(code = '005930', name = '삼성전자') {
  return {
    collectionQuality: 'COMPLETE', collectionWarnings: [],
    result: {
      engineVersion: 'unified-swing-v1', stock: { stockCode: code, stockName: name, marketCode: 'KOSPI', currentPrice: 71000 },
      asOf: '2026-09-19T04:00:00', priceDate: '2026-09-18', dailyBarCount: 300, weeklyBarCount: 59, monthlyBarCount: 13,
      analysis: {
        engineVersion: 'analysis-v6-swing', mode: 'SWING', totalScore: 72.5,
        strategy: { strategyName: '스윙 관찰 · 시나리오 조건 검토', action: 'WATCH', reasons: ['관측 지지와 저항으로 가격 구간을 계산했습니다.'] },
        scenario: { entryFrom: 70000, entryTo: 71500, targets: [76000, 79000], stopLoss: 68000 },
        factors: [{ factorCode: 'TREND', score: 80, weight: 0.18, reason: '일봉과 주봉의 상승 구조', rawValue: 80 }],
        signalReport: { version: 'swing-signals-v1', evaluatedAt: '2026-09-18T19:00:00Z', positionScope: 'UNKNOWN', completeness: 'READY', signals: [], warnings: [] },
      },
      screener: {
        stockCode: code, timeframe: { mode: 'SWING', interval: 0 }, asOf: '2026-09-19T04:00:00', engineVersion: 'screener-ema-v1',
        quality: 'VALID', stage: 6, previousDistinctStage: 5, barsInStage: 3, stageDurationComplete: true, barsSinceTransition: 2, lastTransition: 'FORWARD',
        config: { shortPeriod: 5, middlePeriod: 20, longPeriod: 40, slopeLookback: 3 },
        ema: { shortEma: 70500, middleEma: 69100, longEma: 69500 }, slopes: { shortSlope: 1.2, middleSlope: 0.3, longSlope: 0.1 },
        shortMiddleGap: { signedPercent: 2.03, state: 'EXPANDING' }, middleLongGap: { signedPercent: -0.58, state: 'CONTRACTING' },
        history: [5, 5, 6, 6, 6].map((stage, i) => ({ at: `2026-09-${14 + i}T00:00:00`, stage, quality: 'VALID' })),
        features: { volumeRatio20: 1.3, breakout20: false, high52Week: { high: 86000, distancePercent: 17.44, coverage: 'FULL_WINDOW' } },
      }, warnings: [],
    },
  };
}
