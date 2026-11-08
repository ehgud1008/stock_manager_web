// Rules describe observable price structure, not probabilities or trading signals.
export const RULES = Object.freeze({ minBars: 60, lookback: 120, pivotWing: 3,
  zoneAtr: 0.5, boxBars: 20, boxMaxAtr: 6, impulseAtr: 4, efficiency: 0.55 });
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const ratios = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
const pending = (reason) => ({ status: 'PENDING', reason, levels: [] });
const time = (date) => {
  const value = String(date);
  return /^\d{8}$/.test(value)
    ? Date.parse(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`)
    : typeof date === 'number' ? date : Date.parse(value);
};

export function analyzeChartTechniques(input, period = 'DAY') {
  const empty = (status, reason) => ({ status, reason, zones: [], box: null,
    fibonacci: pending(reason), observations: [], version: '1.0' });
  if (period !== 'DAY') return empty('UNSUPPORTED', '자동 기법 분석은 일봉에서 제공됩니다.');
  if (!Array.isArray(input) || input.length < RULES.minBars) {
    return empty('INSUFFICIENT', `일봉 ${RULES.minBars}개 이상이 필요합니다.`);
  }
  const bars = input.map((bar) => ({ ...bar, timestamp: time(bar.date) }));
  if (bars.some((b) => !Number.isFinite(b.timestamp)
    || ['open', 'high', 'low', 'close', 'volume'].some((key) => typeof b[key] !== 'number' || !Number.isFinite(b[key]))
    || b.low <= 0 || b.volume < 0 || b.high < Math.max(b.open, b.close, b.low)
    || b.low > Math.min(b.open, b.close))) return empty('INVALID', '가격·거래량 데이터에 이상이 있어 판정을 보류합니다.');
  bars.sort((a, b) => a.timestamp - b.timestamp);
  if (bars.some((b, i) => i > 0 && b.timestamp === bars[i - 1].timestamp)) {
    return empty('INVALID', '중복된 날짜가 있어 판정을 보류합니다.');
  }
  // The last bar may still be open. It never participates in reference construction.
  const history = bars.slice(0, -1).slice(-RULES.lookback);
  const last = bars.at(-1);
  const ranges = history.slice(1).map((b, i) => Math.max(b.high - b.low,
    Math.abs(b.high - history[i].close), Math.abs(b.low - history[i].close)));
  const atr = mean(ranges.slice(-14));
  if (!(atr > 0)) return empty('PENDING', '가격 변동이 부족해 기준 구간을 정할 수 없습니다.');
  const tolerance = atr * RULES.zoneAtr;
  const pivots = [];
  const wing = RULES.pivotWing;
  for (let i = wing; i < history.length - wing; i += 1) {
    const neighbors = history.slice(i - wing, i + wing + 1).filter((_, j) => j !== wing);
    const b = history[i];
    const high = neighbors.every((n) => b.high > n.high);
    const low = neighbors.every((n) => b.low < n.low);
    // An outside bar has no observable intrabar ordering; do not use it as two anchors.
    if (high !== low) pivots.push({ index: i, date: b.date, timestamp: b.timestamp,
      type: high ? 'HIGH' : 'LOW', value: high ? b.high : b.low });
  }
  const clusters = [];
  pivots.forEach((point) => {
    const cluster = clusters.find((c) => Math.abs(c.center - point.value) <= tolerance
      && Math.max(...c.values, point.value) - Math.min(...c.values, point.value) <= tolerance * 2);
    if (cluster) {
      cluster.values.push(point.value);
      cluster.center = mean(cluster.values);
    } else clusters.push({ center: point.value, values: [point.value] });
  });
  const zones = clusters.filter((c) => c.values.length >= 2)
    .sort((a, b) => Math.abs(a.center - last.close) - Math.abs(b.center - last.close))
    .slice(0, 4).map((c) => ({ lower: Math.min(...c.values) - tolerance / 2,
      upper: Math.max(...c.values) + tolerance / 2, touches: c.values.length,
      role: last.close > c.center + tolerance / 2 ? '지지 후보' : last.close < c.center - tolerance / 2 ? '저항 후보' : '현재가 인접 구간' }));

  const recent = history.slice(-RULES.boxBars);
  const upper = Math.max(...recent.map((b) => b.high));
  const lower = Math.min(...recent.map((b) => b.low));
  const touches = (key, boundary) => recent.reduce((acc, b, i) => {
    if (Math.abs(b[key] - boundary) <= tolerance && (acc.length === 0 || i - acc.at(-1) >= wing)) acc.push(i);
    return acc;
  }, []).length;
  const travel = recent.slice(1).reduce((sum, b, i) => sum + Math.abs(b.close - recent[i].close), 0);
  const efficiency = travel ? Math.abs(recent.at(-1).close - recent[0].close) / travel : 0;
  const volumeAverage = mean(recent.map((b) => b.volume));
  const volumeRatio = volumeAverage > 0 ? last.volume / volumeAverage : null;
  const box = upper - lower <= atr * RULES.boxMaxAtr && upper - lower > tolerance * 2
    && touches('high', upper) >= 2 && touches('low', lower) >= 2 && efficiency < 0.3
    ? { upper, lower, from: recent[0].date, volumeRatio,
      state: last.close > upper ? '상단 돌파 시도' : last.close < lower ? '하단 이탈 시도' : '박스권 내부',
      provisional: true } : null;

  let fibonacci = pending('확인된 파동과 유효한 되돌림이 부족합니다.');
  // Collapse consecutive same-side pivots into the more extreme anchor.
  const swings = [];
  pivots.forEach((p) => {
    const previous = swings.at(-1);
    if (previous?.type !== p.type) swings.push(p);
    else if (p.type === 'HIGH' ? p.value > previous.value : p.value < previous.value) swings[swings.length - 1] = p;
  });
  const start = swings.at(-2);
  const end = swings.at(-1);
  if (box) fibonacci = pending('횡보 구간에서는 박스권 분석을 우선합니다.');
  else if (start && end) {
    const magnitude = Math.abs(end.value - start.value);
    const segment = history.slice(start.index, end.index + 1);
    const path = segment.slice(1).reduce((sum, b, i) => sum + Math.abs(b.close - segment[i].close), 0);
    const directionalEfficiency = path ? Math.abs(segment.at(-1).close - segment[0].close) / path : 0;
    const up = end.type === 'HIGH';
    const after = [...history.slice(end.index + 1), last];
    const invalid = after.some((b) => up ? b.high > end.value || b.low <= start.value
      : b.low < end.value || b.high >= start.value);
    const retracement = magnitude ? (up ? end.value - last.close : last.close - end.value) / magnitude : 0;
    if (invalid) fibonacci = pending('기준 파동을 벗어난 가격이 있어 새 기준점 확인이 필요합니다.');
    else if (end.index - start.index < wing || magnitude < atr * RULES.impulseAtr
      || directionalEfficiency < RULES.efficiency) fibonacci = pending('파동의 크기 또는 방향성이 충분하지 않습니다.');
    else if (retracement < 0.05 || retracement >= 1) fibonacci = pending('되돌림 진행 여부가 명확하지 않습니다.');
    else fibonacci = { status: 'CANDIDATE', reason: '확인된 방향성 파동 이후 되돌림이 진행 중입니다.',
      direction: up ? '상승 후 조정' : '하락 후 반등', start, end, retracement,
      levels: ratios.map((ratio) => ({ ratio, value: end.value + (up ? -1 : 1) * magnitude * ratio })) };
  }
  const closes = history.map((b) => b.close);
  const ma20 = mean(closes.slice(-20));
  const ma60 = closes.length >= 60 ? mean(closes.slice(-60)) : null;
  const previousMa20 = mean(closes.slice(-25, -5));
  const trend = ma60 && ma20 > ma60 && ma20 > previousMa20 ? '상승 추세 후보'
    : ma60 && ma20 < ma60 && ma20 < previousMa20 ? '하락 추세 후보' : '추세 혼재';
  const widths = Array.from({ length: 20 }, (_, i) => {
    const window = closes.slice(closes.length - 39 + i, closes.length - 19 + i);
    const average = mean(window);
    return 4 * Math.sqrt(mean(window.map((v) => (v - average) ** 2))) / average;
  });
  const width = widths.at(-1);
  const volatility = width < mean(widths.slice(0, -1)) * 0.75 ? '최근 볼린저밴드 폭 수축'
    : width > mean(widths.slice(0, -1)) * 1.25 ? '최근 볼린저밴드 폭 확장' : '최근 변동성 변화 제한적';
  return { status: 'READY', reason: box ? box.state : trend, zones, box, fibonacci,
    observations: [trend, volatility], asOf: last.date, version: '1.0',
    referenceFrom: history[0].date, referenceTo: history.at(-1).date };
}
