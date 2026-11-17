import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DecisionRecheckView from './DecisionRecheckView';
import { getDecisionRecheck } from '../../api/tradeDecisionApi';
vi.mock('../../api/tradeDecisionApi', () => ({ getDecisionRecheck: vi.fn() }));
const data = {
  price: { status: 'AVAILABLE', value: 100, entryFrom: 95, entryTo: 100, entryRangeStatus: 'WITHIN', checkedAt: '2026-11-17T01:00:00Z' },
  holding: { comparison: 'CHANGED', saved: { quantity: 10 }, current: { quantity: 8, balanceDate: '2026-11-17' } },
  accountRisk: { comparison: 'UNCHANGED', saved: {}, current: {} },
  sizing: { status: 'READY', savedQuantity: 5, indicativeQuantity: 3 }, requiresNewDecision: true,
};
describe('DecisionRecheckView', () => {
  beforeEach(() => vi.clearAllMocks());
  it('reads only on explicit request and distinguishes manual inputs and incomplete checks', async () => {
    getDecisionRecheck.mockResolvedValue(data);
    render(<DecisionRecheckView decisionId="one" />);
    expect(getDecisionRecheck).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '최신 조건 다시 확인' }));
    expect(await screen.findByText(/저장 검토 수량 5주.*참고 수량 3주/)).toBeTruthy();
    expect(screen.getByText(/보유정보 \(수동 등록\).*당시 10주.*현재 등록 8주/)).toBeTruthy();
    expect(screen.getByText(/호가 단위.*확인 불가/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '최신 종합분석으로 이동' }).getAttribute('href')).toBe('/unified-analysis');
  });
  it('clears old result on failure and on switching decisions', async () => {
    getDecisionRecheck.mockResolvedValueOnce(data).mockRejectedValueOnce(new Error('network'));
    const view = render(<DecisionRecheckView decisionId="one" />);
    fireEvent.click(screen.getByRole('button', { name: '최신 조건 다시 확인' }));
    await screen.findByText(/저장 검토 수량 5주/);
    fireEvent.click(screen.getByRole('button', { name: '최신 조건 다시 확인' }));
    await screen.findByText(/최신 조건 조회 실패: network/);
    expect(screen.queryByText(/저장 검토 수량 5주/)).toBeNull();
    view.rerender(<DecisionRecheckView decisionId="two" />);
    expect(screen.queryByText(/network/)).toBeNull();
  });
  it('aborts pending lookup when decision changes and never displays a late result', async () => {
    let resolve;
    getDecisionRecheck.mockReturnValue(new Promise(done => { resolve = done; }));
    const view = render(<DecisionRecheckView decisionId="one" />);
    fireEvent.click(screen.getByRole('button', { name: '최신 조건 다시 확인' }));
    const signal = getDecisionRecheck.mock.calls[0][1];
    view.rerender(<DecisionRecheckView decisionId="two" />);
    expect(signal.aborted).toBe(true); resolve(data);
    await waitFor(() => expect(screen.queryByText(/저장 검토 수량 5주/)).toBeNull());
  });
});
