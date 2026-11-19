import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import DecisionBasketPage from './DecisionBasketPage';
import { listDecisionBasketCandidates, previewDecisionBasket } from '../../api/tradeDecisionApi';

vi.mock('../../api/tradeDecisionApi', () => ({
  listDecisionBasketCandidates: vi.fn(),
  previewDecisionBasket: vi.fn(),
}));

it('keeps choices across pages, locks duplicate symbols, and only previews explicitly', async () => {
  const completedAt = Date.parse('2026-11-18T00:00:00Z');
  listDecisionBasketCandidates.mockImplementation(async page => page === 0
    ? { items: [{ id: 'first', stockCode: '005930', completedAt }, { id: 'revision', stockCode: '005930', completedAt }], hasMore: true }
    : { items: [{ id: 'second', stockCode: '000660', completedAt }], hasMore: false });
  previewDecisionBasket.mockResolvedValue({
    includedCount: 1, purchaseAmount: 1000, totalRisk: 45, additionalRisk: 25, existingRisk: 20,
    cashStatus: 'AVAILABLE', balanceDate: '2026-11-18', checkedAt: '2026-11-18T01:00:00Z',
    cash: { status: 'EXCEEDED', amount: 900, remaining: -100 }, risk: { status: 'INCOMPLETE', amount: 100 },
    items: [
      { id: 'first', stockCode: '005930', status: 'INCLUDED', quantity: 5, action: 'ADD' },
      { id: 'second', stockCode: '000660', status: 'ACCOUNT_CHANGED', action: 'BUY' },
    ],
  });
  render(<DecisionBasketPage />);
  const choices = await screen.findAllByRole('checkbox', { name: /005930/ });
  fireEvent.click(choices[0]);
  expect(choices[1]).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '다음' }));
  fireEvent.click(await screen.findByRole('checkbox', { name: /000660/ }));
  const input = screen.getByRole('textbox', { name: /총위험 한도/ });
  fireEvent.change(input, { target: { value: '100.00' } });
  expect(previewDecisionBasket).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '현금·위험 합산 검토' }));
  const result = within(await screen.findByLabelText('합산 검토 결과'));
  expect(previewDecisionBasket).toHaveBeenCalledWith({ decisionIds: ['first', 'second'], totalRiskLimit: '100.00' }, expect.any(AbortSignal));
  expect(result.getByText(/가용 현금 · 한도 초과/)).toBeInTheDocument();
  expect(result.getByText(/일부 판단 제외로 판정 보류/)).toBeInTheDocument();
  expect(result.getByText(/계좌 설정이 변경되어/)).toBeInTheDocument();
  fireEvent.change(input, { target: { value: '0' } });
  expect(screen.queryByLabelText('합산 검토 결과')).toBeNull();
});
