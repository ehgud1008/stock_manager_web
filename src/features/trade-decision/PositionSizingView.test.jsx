import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PositionSizingView from './PositionSizingView';
const sizing = { status: 'READY', maxBuyQuantity: 47, cashLimitQuantity: 99, riskLimitQuantity: 47, weightLimitQuantity: 49,
  reasons: ['LOSS_LIMIT'], estimatedPurchaseAmount: 4712.22, estimatedLossAtStop: 493.03, unitPurchaseCost: 100.26, netStopReference: 89.77,
  unitRisk: 10.49, accountRevision: 2, balanceDate: '2026-11-17', holdingRevision: 4, roundTripFeeBps: 30, slippageBps: 10 };
describe('PositionSizingView', () => {
  it('shows additional purchase capacity after accounting for held risk', () => {
    render(<PositionSizingView result={{ decisionAction: 'ADD', quantity: 37, riskSizing: { ...sizing, policyVersion: 'position-sizing-v2-held', action: 'ADD', heldQuantity: 10, maxBuyQuantity: 37, existingExposure: 1000, existingStopRisk: 102.3, remainingLossBudget: 397.7, remainingPositionBudget: 4000 } }} />);
    expect(screen.getByText('조건 충족 시 추가매수 수량 상한: 37주')).toBeInTheDocument();
    expect(screen.getByText('저장 당시 추가매수 검토 수량: 37주')).toBeInTheDocument();
    expect(screen.getByText(/기존 보유 평가액 1,000원/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '보유 정보 확인' })).toBeInTheDocument();
  });
  it('distinguishes excess-only reduction from arbitrary profit taking and full exit review', () => {
    const risk = { ...sizing, policyVersion: 'position-sizing-v2-held', action: 'REDUCE', heldQuantity: 60, tradeQuantity: 12, remainingQuantity: 48 };
    const view = render(<PositionSizingView result={{ decisionAction: 'REDUCE', quantity: 12, riskSizing: risk }} />);
    expect(screen.getByText('저장 당시 부분 매도 검토 수량: 12주 · 계획상 잔여 48주')).toBeInTheDocument();
    expect(screen.queryByText(/조건 충족 시 신규 매수/)).toBeNull();
    view.rerender(<PositionSizingView result={{ quantity: null, riskSizing: { ...risk, status: 'FULL_EXIT_REVIEW_REQUIRED' } }} />);
    expect(screen.getByText(/전량 축소가 필요합니다/)).toBeInTheDocument();
    expect(screen.queryByText(/검토 수량: 12주/)).toBeNull();
  });
  it('distinguishes a conditional ceiling from a non-buy final opinion', () => {
    render(<PositionSizingView result={{ riskSizing: sizing, quantity: null }} />);
    expect(screen.getByText('조건 충족 시 신규 매수 수량 상한: 47주')).toBeInTheDocument();
    expect(screen.getByText(/최종 의견이 신규 매수가 아니므로/)).toBeInTheDocument();
    expect(screen.getByText(/계좌 설정 버전 2/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '계좌 위험 설정' })).toHaveAttribute('href', '/settings#account-risk');
  });
  it('shows the saved buy quantity and preserves legacy results without invented sizing', () => {
    const view = render(<PositionSizingView result={{ riskSizing: sizing, quantity: 47 }} />);
    expect(screen.getByText('저장 당시 신규 매수 검토 수량: 47주')).toBeInTheDocument();
    view.rerender(<PositionSizingView result={{}} />);
    expect(screen.getByText(/이 저장 결과에는 계좌 위험 계산이 없습니다/)).toBeInTheDocument();
  });
  it('distinguishes stale or unconfirmed holdings from a computed zero capacity', () => {
    const view = render(<PositionSizingView result={{ riskSizing: { ...sizing, status: 'POSITION_UNCONFIRMED' } }} />);
    expect(screen.getByText(/명시적인 미보유 등록이 필요/)).toBeInTheDocument();
    expect(screen.queryByText(/조건 충족 시 신규 매수 수량 상한/)).toBeNull();
    view.rerender(<PositionSizingView result={{ riskSizing: { ...sizing, status: 'ZERO_CAPACITY', maxBuyQuantity: 0 } }} />);
    expect(screen.getByText('조건 충족 시 신규 매수 수량 상한: 0주')).toBeInTheDocument();
  });
});
