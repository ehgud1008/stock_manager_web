import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import httpClient from '../../api/httpClient';
import MarketResearch from './MarketResearch';

vi.mock('../../api/httpClient', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const url = '/v1/swing-backtests/market-runs';
const spec = { market: 'ALL', strategy: 'BREAKOUT', from: '2024-01-02', to: '2025-12-30',
  capital: 1000000, positions: 3, hold: 5, feeBps: 10, slipBps: 5, minTurnover: 0 };
const base = { id: '11111111', state: 'COMPLETE', spec, metrics: { winRate: 55, returnPct: 5 } };
const variant = { ...base, id: '22222222', spec: { ...spec, strategy: 'VOLUME_BREAKOUT' }, metrics: { winRate: 61 } };
const result = { spec, metrics: base.metrics, trades: [], unconfirmedEmptyDates: [],
  days: [{ date: '2024-01-02', universe: 2000, equity: 1050000 }] };

it('opens a saved run, compares another strategy and submits a market-wide request', async () => {
  httpClient.get.mockImplementation(async path => ({ data: { data: path === url ? [base, variant] : result } }));
  httpClient.put.mockResolvedValue({ data: {} });
  const user = userEvent.setup();
  render(<MarketResearch />);
  expect(await screen.findByText('1,050,000원')).toBeInTheDocument();
  await user.click(screen.getByRole('combobox', { name: '비교할 실행' }));
  await user.click(screen.getByRole('option', { name: /22222222/ }));
  expect(screen.getByText('55%')).toBeInTheDocument();
  expect(screen.getByText('61%')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: '시장 백테스트 실행' }));
  expect(httpClient.put).toHaveBeenCalledWith(expect.stringContaining(url + '/'),
    expect.objectContaining({ market: 'ALL', strategy: 'BREAKOUT', hold: 5 }));
});
