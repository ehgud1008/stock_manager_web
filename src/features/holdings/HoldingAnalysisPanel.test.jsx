import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import HoldingAnalysisPanel from './HoldingAnalysisPanel';
it('가격이 잔고보다 과거이면 보유 상태만 표시하고 손익을 만들지 않는다', () => {
  render(<MemoryRouter><HoldingAnalysisPanel analysis={{ positionStatus: 'HELD', availability: 'PRICE_BEFORE_BALANCE', checkedAt: '2026-11-08T00:00:00Z',
    holding: { quantity: 100, averageBuyPrice: 50000, balanceDate: '2026-11-08' }, priceDate: '2026-11-06', action: 'DEFER', pnlAmount: null,
    reasons: ['잔고 기준일보다 과거 가격입니다. 손익과 개인 판단을 보류합니다.'] }} /></MemoryRouter>);
  expect(screen.getByText('보유 중')).toBeInTheDocument();
  expect(screen.getByText(/손익과 개인 판단을 보류/)).toBeInTheDocument();
  expect(screen.queryByText(/평가손익/)).not.toBeInTheDocument();
});
