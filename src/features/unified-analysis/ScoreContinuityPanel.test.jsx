import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import ScoreContinuityPanel from './ScoreContinuityPanel';

const factor = (factorCode, score, weight) => ({ factorCode, score, weight });
const analysis = (totalScore, trend) => ({ totalScore, factors: [factor('TREND', trend, 0.6), factor('ENTRY_LOCATION', 60, 0.4)],
  signalReport: { signals: [{ type: 'BREAKOUT', state: 'ACTIVE' }] } });
const data = { collectionQuality: 'COMPLETE', result: { priceDate: '2026-11-16', analysis: analysis(72, 80) } };
const continuity = { selected: { engineVersion: 'v1', priceBasis: 'KRX' }, older: { priceDate: '2026-11-13', quality: 'COMPLETE' },
  previous: { result: { analysis: analysis(66, 70) } }, history: [
    { priceDate: '2026-11-16', totalScore: 72, engineVersion: 'v1', priceBasis: 'KRX' },
    { priceDate: '2026-11-13', totalScore: 66, engineVersion: 'v1', priceBasis: 'KRX' },
  ] };

it('이전 거래일과 점수 기여도를 연결한다', () => {
  render(<ScoreContinuityPanel data={data} continuity={continuity} />);
  expect(screen.getByText(/이전 분석 2026-11-13 → 현재 2026-11-16 · \+6점/)).toBeInTheDocument();
  expect(screen.getByText(/TREND \+6/)).toBeInTheDocument();
  expect(screen.getByText(/유지 BREAKOUT/)).toBeInTheDocument();
});

it('자료 상태가 다르면 점수 차이를 해석하지 않는다', () => {
  render(<ScoreContinuityPanel data={data} continuity={{ ...continuity, older: { ...continuity.older, quality: 'PARTIAL' } }} />);
  expect(screen.getByText(/점수 직접 비교 보류/)).toBeInTheDocument();
  expect(screen.queryByText(/TREND \+6/)).not.toBeInTheDocument();
});
