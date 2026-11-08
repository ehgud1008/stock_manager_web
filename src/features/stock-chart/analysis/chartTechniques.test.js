import { describe, expect, it } from 'vitest';
import { analyzeChartTechniques } from './chartTechniques';

const candles = (prices) => prices.map((close, i) => ({
  date: new Date(Date.UTC(2025, 0, i + 1)).toISOString(), open: close,
  high: close + 1, low: close - 1, close, volume: 100,
}));
const wave = () => candles(Array.from({ length: 90 }, (_, i) => {
  if (i < 50) return 110 - i * 0.2;
  if (i < 76) return 100 + (i - 50) * 2;
  return 150 - (i - 75) * 1.2;
}));
const box = () => candles(Array.from({ length: 85 }, (_, i) => 100 + 3 * Math.sin(i * Math.PI / 4)));

describe('chart technique selection', () => {
  it('requires daily data and a sufficient, valid, unambiguous history', () => {
    expect(analyzeChartTechniques(wave(), 'WEEK').status).toBe('UNSUPPORTED');
    expect(analyzeChartTechniques(wave().slice(0, 20)).status).toBe('INSUFFICIENT');
    const invalid = wave();
    invalid[10].high = 1;
    expect(analyzeChartTechniques(invalid).status).toBe('INVALID');
    expect(analyzeChartTechniques([...wave(), wave()[0]]).status).toBe('INVALID');
    expect(analyzeChartTechniques(wave().map((b) => ({ ...b, volume: null }))).status).toBe('INVALID');
  });
  it('identifies an upward impulse and calculates retracements from confirmed anchors', () => {
    const result = analyzeChartTechniques(wave());
    expect(result.fibonacci.status).toBe('CANDIDATE');
    expect(result.fibonacci.direction).toBe('상승 후 조정');
    expect(result.fibonacci.start.value).toBe(99);
    expect(result.fibonacci.end.value).toBe(151);
    expect(result.fibonacci.levels.find((l) => l.ratio === 0.5).value).toBe(125);
    expect(result.fibonacci.levels.find((l) => l.ratio === 0.618).value).toBeCloseTo(118.864);
  });
  it('handles a downward impulse symmetrically', () => {
    const prices = wave().map((b) => ({ ...b, open: 300 - b.open, close: 300 - b.close,
      high: 300 - b.low, low: 300 - b.high }));
    const result = analyzeChartTechniques(prices);
    expect(result.fibonacci.status).toBe('CANDIDATE');
    expect(result.fibonacci.direction).toBe('하락 후 반등');
    expect(result.fibonacci.levels.find((l) => l.ratio === 0.5).value).toBe(175);
  });
  it('invalidates a wave after an intrabar violation even if price returns', () => {
    const prices = wave();
    prices.at(-2).high = 160;
    expect(analyzeChartTechniques(prices).fibonacci.status).toBe('PENDING');
    const broken = wave();
    broken.at(-1).low = 98;
    expect(analyzeChartTechniques(broken).fibonacci.status).toBe('PENDING');
  });
  it('does not confirm the most recent high using unavailable future candles', () => {
    expect(analyzeChartTechniques(wave().slice(0, 78)).fibonacci.status).toBe('PENDING');
    const prefix = wave().slice(0, 82);
    const original = JSON.stringify(prefix);
    expect(analyzeChartTechniques(prefix)).toEqual(analyzeChartTechniques([...prefix].reverse()));
    expect(JSON.stringify(prefix)).toBe(original);
  });
  it('selects repeated zones and a box; does not force Fibonacci in a range', () => {
    const result = analyzeChartTechniques(box());
    expect(result.zones.length).toBeGreaterThan(0);
    expect(result.box.state).toBe('박스권 내부');
    expect(result.fibonacci.status).toBe('PENDING');
    expect(result.fibonacci.reason).toContain('횡보');
  });
  it('measures a provisional breakout against prior bars, excluding current volume', () => {
    const prices = box();
    prices[prices.length - 1] = { ...prices.at(-1), open: 106, close: 107, high: 108, low: 105, volume: 250 };
    const result = analyzeChartTechniques(prices);
    expect(result.box.state).toBe('상단 돌파 시도');
    expect(result.box.upper).toBe(104);
    expect(result.box.volumeRatio).toBe(2.5);
    expect(result.box.provisional).toBe(true);
    const noVolume = prices.map((b) => ({ ...b, volume: 0 }));
    expect(analyzeChartTechniques(noVolume).box.volumeRatio).toBeNull();
  });
  it('returns a safe pending result for constant prices', () => {
    const prices = wave().map((b) => ({ ...b, open: 100, high: 100, low: 100, close: 100 }));
    expect(analyzeChartTechniques(prices).status).toBe('PENDING');
  });
});
