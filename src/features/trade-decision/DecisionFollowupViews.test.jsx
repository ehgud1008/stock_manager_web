import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import TakeProfitPlanView from './TakeProfitPlanView';
import DecisionStatisticsPage from '../../pages/analysis/DecisionStatisticsPage';
import BrokerAccountPage from '../../pages/holdings/BrokerAccountPage';
import { getBrokerAccount, getDecisionStatistics, previewTakeProfit } from '../../api/tradeDecisionApi';

vi.mock('../../api/tradeDecisionApi', () => ({
  getBrokerAccount: vi.fn(), getDecisionStatistics: vi.fn(), previewTakeProfit: vi.fn(),
}));

it('submits only user-entered per-target percentages and displays integer remainder', async () => {
  previewTakeProfit.mockResolvedValue({
    heldQuantity: 7, plannedQuantity: 3, remaining: 4, balanceDate: '2026-11-18', holdingRevision: 2,
    targets: [{ price: 100, percent: 25, quantity: 1 }, { price: 200, percent: 25, quantity: 2 }],
  });
  render(<TakeProfitPlanView decisionId="job-one" targets={[100, 200]} />);
  fireEvent.click(screen.getByRole('button', { name: '익절 분할 매도 수량 계산' }));
  const inputs = screen.getAllByRole('textbox');
  expect(inputs[0]).toHaveValue('');
  fireEvent.change(inputs[0], { target: { value: '70' } });
  fireEvent.change(inputs[1], { target: { value: '40' } });
  expect(screen.getByRole('button', { name: '익절 수량 확인' })).toBeDisabled();
  fireEvent.change(inputs[0], { target: { value: '25' } });
  fireEvent.change(inputs[1], { target: { value: '25' } });
  fireEvent.click(screen.getByRole('button', { name: '익절 수량 확인' }));
  expect(await screen.findByText(/남길 수량 4주/)).toBeInTheDocument();
  expect(previewTakeProfit).toHaveBeenCalledWith('job-one', ['25', '25'], expect.any(AbortSignal));
});

it('shows paired comparison coverage and links to the separate account screen', async () => {
  getDecisionStatistics.mockResolvedValue({ from: '2026-11-18', to: '2026-11-18', groupBy: 'STOCK', policies: [], models: [],
    totals: { opportunities: 3, comparable: 1, aiPnl: 100 }, rows: [] });
  render(<DecisionStatisticsPage />);
  fireEvent.change(screen.getByRole('textbox', { name: '종목코드' }), { target: { value: '005930' } });
  fireEvent.click(screen.getByRole('button', { name: '모의 성과 조회' }));
  expect(await screen.findByText(/기회 3건 중 1건 비교 가능/)).toBeInTheDocument();
  expect(getDecisionStatistics).toHaveBeenCalledWith(expect.objectContaining({ stock: '005930', groupBy: 'STOCK' }), expect.any(AbortSignal));
  expect(screen.getByRole('link', { name: '키움 계좌 성과로 이동' })).toHaveAttribute('href', '/holdings/broker');
});

it('starts account inquiries explicitly, labels broker mock data, and clears results when access key changes', async () => {
  getBrokerAccount.mockResolvedValue({ environment: 'BROKER_MOCK', checkedAt: '2026-11-18T00:00:00Z',
    deposit: 1000, cashOnlyOrderAmount: 900, brokerOrderAmount: 1300, manualAvailableCash: 800 });
  render(<BrokerAccountPage />);
  const button = screen.getByRole('button', { name: '예수금·주문 가능 금액 조회' });
  expect(button).toBeDisabled();
  const key = screen.getByLabelText('계좌 조회 접근 키');
  fireEvent.change(key, { target: { value: 'local-test-key' } });
  expect(getBrokerAccount).not.toHaveBeenCalled();
  fireEvent.click(button);
  expect(await screen.findByText(/키움 모의투자 계좌/)).toBeInTheDocument();
  expect(screen.getByText(/100% 증거금 주문가능금액 900원/)).toBeInTheDocument();
  expect(getBrokerAccount).toHaveBeenCalledWith('cash', 'local-test-key', {}, expect.any(AbortSignal));
  fireEvent.change(key, { target: { value: 'new-key' } });
  expect(screen.queryByText(/키움 모의투자 계좌/)).toBeNull();
});
