import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import TradeSignalPanel from './TradeSignalPanel';
const signal = { id: 'BREAKOUT:2026-09-18', type: 'BREAKOUT', side: 'BUY', state: 'CONFIRMED',
  occurredOn: '2026-09-18', evaluatedOn: '2026-09-18', ageBars: 0, validForBars: 5,
  triggerPrice: 130, invalidationPrice: 125, entryFrom: 130, entryTo: 135, entryStatus: 'IN_RANGE', reasons: ['저항 종가 돌파'] };
const report = { version: 'swing-signals-v1', positionScope: 'UNKNOWN', completeness: 'READY',
  evaluatedAt: '2026-09-19T00:00:00Z', signals: [signal], warnings: [] };
describe('매매 신호 표시', () => {
  it('가격은 소수점 없이 원 단위로 반올림해서 표시한다', () => {
    render(<TradeSignalPanel report={{ ...report, signals: [{ ...signal,
      triggerPrice: 12345.678, invalidationPrice: 12000.123, entryFrom: 12300.456, entryTo: 12400.789 }] }} />);
    expect(screen.getByText('패턴 발생 기준 가격 12,346원 · 신호 무효화 가격 12,000원')).toBeInTheDocument();
    expect(screen.getByText('발생 당시 진입 구간 12,300원 ~ 12,401원')).toBeInTheDocument();
  });
  it('확정과 수익 보장을 구분하고 근거와 가격을 표시한다', () => {
    render(<TradeSignalPanel report={report} />);
    expect(screen.getByText('매수 신호 발생 확인 · 돌파 확인')).toBeInTheDocument();
    expect(screen.getByText(/수익 보장·주문 실행이 아닙니다/)).toBeInTheDocument();
    expect(screen.getByText('저항 종가 돌파')).toBeInTheDocument();
    expect(screen.getByText(/무효화 가격 125원/)).toBeInTheDocument();
  });
  it.each([['UNKNOWN', '보유 시 매도'], ['HELD', '매도'], ['NOT_HELD', '신규 진입 회피']])('보유 상태 %s를 반영한다', (positionScope, label) => {
    render(<TradeSignalPanel report={{ ...report, positionScope, signals: [{ ...signal, side: 'SELL', type: 'TREND_BREAKDOWN' }] }} />);
    expect(screen.getByText(`${label} 신호 발생 확인 · 추세 훼손`)).toBeInTheDocument();
  });
  it.each([['PRELIMINARY', '매수 예비 신호'], ['ACTIVE', '매수 신호 유효 · 기존 발생'], ['INVALIDATED', '매수 신호 무효화'], ['EXPIRED', '매수 신호 만료']])('%s를 새 확정 신호로 표시하지 않는다', (state, label) => {
    render(<TradeSignalPanel report={{ ...report, signals: [{ ...signal, state }] }} />);
    if (['INVALIDATED', 'EXPIRED'].includes(state)) {
      expect(screen.queryByText(`${label} · 돌파 확인`)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /지난 신호/ }));
    }
    expect(screen.getByText(`${label} · 돌파 확인`)).toBeInTheDocument();
    expect(screen.queryByText('매수 신호 발생 확인 · 돌파 확인')).not.toBeInTheDocument();
  });
  it('추격 금지를 함께 표시한다', () => {
    render(<TradeSignalPanel report={{ ...report, signals: [{ ...signal, entryStatus: 'CHASE_BLOCKED' }] }} />);
    expect(screen.getAllByText(/진입 상한 초과 · 추격 보류/)).toHaveLength(2);
  });
  it('과거 결과에 신호 필드가 없으면 숨긴다', () => {
    const { container } = render(<TradeSignalPanel />); expect(container).toBeEmptyDOMElement();
  });
  it('표본 부족을 신호 없음과 구분한다', () => {
    render(<TradeSignalPanel report={{ ...report, completeness: 'INSUFFICIENT_DATA', signals: [] }} />);
    expect(screen.getByText(/신호 판정을 보류했습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/신호 조건에 해당하지 않습니다/)).not.toBeInTheDocument();
  });
  it('매수 확정과 추격 진입 보류를 분리해 요약한다', () => {
    render(<TradeSignalPanel report={{ ...report, signals: [{ ...signal, entryStatus: 'CHASE_BLOCKED' }] }} />);
    expect(screen.getByText('매수 신호 발생 확인')).toBeInTheDocument();
    expect(screen.getByText('매수 신호는 있으나 진입 보류')).toBeInTheDocument();
    expect(screen.queryByText('신호 가격 구간 내')).not.toBeInTheDocument();
  });
  it('진입 구간 안이어도 유효 매도 신호가 있으면 충돌을 우선 표시한다', () => {
    render(<TradeSignalPanel report={{ ...report, signals: [signal,
      { ...signal, id: 'sell', side: 'SELL', type: 'TREND_BREAKDOWN' }] }} />);
    expect(screen.getByText('신규 진입 보류')).toBeInTheDocument();
    expect(screen.getByText('보유 시 매도 신호 확정')).toBeInTheDocument();
    expect(screen.queryByText('신호 가격 구간 내')).not.toBeInTheDocument();
  });
});

it('기존 신호 유효와 추격 보류 이유를 별도 표시한다', () => {
  render(<TradeSignalPanel analysisPrice={108700} priceDate="2026-10-22" report={{ ...report, signals: [{ ...signal,
    state: 'ACTIVE', entryStatus: 'CHASE_BLOCKED', entryTo: 92639.285714285 }] }} />);
  expect(screen.getByText('매수 신호 유효 · 기존 발생 · 돌파 확인')).toBeInTheDocument();
  expect(screen.getByText(/발생 조건 전체를 지금도 충족한다는 뜻은 아닙니다/)).toBeInTheDocument();
  expect(screen.getByText(/92,639원보다 17.3% 높습니다/)).toBeInTheDocument();
  expect(screen.getByText(/가격 기준일 2026-10-22/)).toBeInTheDocument();
});
it('매수 패턴과 손절 및 목표 접촉을 구분한다', () => {
  render(<TradeSignalPanel showSummary={false} report={{ ...report, signals: [signal,
    { ...signal, id: 'stop', type: 'POSITION_STOP', side: 'SELL', entryStatus: 'NOT_APPLICABLE' },
    { ...signal, id: 'target', type: 'TARGET_REACHED', side: 'TAKE_PROFIT', entryStatus: 'NOT_APPLICABLE' }] }} />);
  expect(screen.getByRole('heading', { name: '매수 패턴 · 발생 및 신규 진입 상태' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '매도·진입 회피 및 손절 조건' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '보유 목표가 접촉 기록' })).toBeInTheDocument();
  expect(screen.getAllByText(/실제 주문이나 체결을 확인한 결과가 아닙니다/)).toHaveLength(2);
});
