import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { runHistoricalBacktest } from '../../api/swingBacktestApi';
import SwingBacktestPage from './SwingBacktestPage';

vi.mock('../../api/httpClient', () => ({ default: { get: vi.fn().mockResolvedValue({ data: { data: [] } }) } }));

vi.mock('../../api/swingBacktestApi', () => ({
  runHistoricalBacktest: vi.fn(),
  listSwingPaperRuns: vi.fn(),
  getSwingPaperRun: vi.fn(),
  startSwingPaperRun: vi.fn(),
}));

it('runs the configured strategy and shows win rate with its trade count', async () => {
  runHistoricalBacktest.mockImplementation(async (settings) => ({
    run: { settings, sessions: ['2026-11-10'] },
    mode: 'HISTORICAL', status: 'COMPLETE', settledSessions: 1, capturedSessions: 1,
    summary: { selected: 4, entered: 3, closed: 2, wins: 1, open: 1, winRate: 50,
      averageNetPnl: 10000, returnPercent: 1.2, drawdownPercent: 0.2 },
    equity: [{ date: '2026-11-10', value: 10120000 }],
    trades: [], followUpTrades: [], coverage: [],
  }));
  const user = userEvent.setup();
  render(<SwingBacktestPage />, { wrapper: MemoryRouter });
  await user.click(screen.getByRole('tab', { name: '지정 종목 백테스트' }));
  await user.click(screen.getByRole('button', { name: '백테스트 실행' }));
  expect(await screen.findByText('50.00%')).toBeInTheDocument();
  expect(screen.getByText('이익 1 / 청산 2건')).toBeInTheDocument();
  expect(runHistoricalBacktest).toHaveBeenCalledWith(expect.objectContaining({
    stockCodes: ['005930', '000660'], holdingDays: 5, feeBps: 15, slippageBps: 5,
  }));
});
