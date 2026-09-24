import { render, screen } from '@testing-library/react';
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
    expect(screen.getByText('기준 가격 12,346원 · 무효화 가격 12,000원')).toBeInTheDocument();
    expect(screen.getByText('발생 당시 진입 구간 12,300원 ~ 12,401원')).toBeInTheDocument();
  });
  it('확정과 수익 보장을 구분하고 근거와 가격을 표시한다', () => {
    render(<TradeSignalPanel report={report} />);
    expect(screen.getByText('매수 시그널 확정 · 돌파 확인')).toBeInTheDocument();
    expect(screen.getByText(/수익 보장·주문 실행이 아닙니다/)).toBeInTheDocument();
    expect(screen.getByText('저항 종가 돌파')).toBeInTheDocument();
    expect(screen.getByText(/무효화 가격 125원/)).toBeInTheDocument();
  });
  it.each([['UNKNOWN', '보유 시 매도'], ['HELD', '매도'], ['NOT_HELD', '신규 진입 회피']])('보유 상태 %s를 반영한다', (positionScope, label) => {
    render(<TradeSignalPanel report={{ ...report, positionScope, signals: [{ ...signal, side: 'SELL', type: 'TREND_BREAKDOWN' }] }} />);
    expect(screen.getByText(`${label} 시그널 확정 · 추세 훼손`)).toBeInTheDocument();
  });
  it.each([['PRELIMINARY', '매수 예비 신호'], ['ACTIVE', '매수 시그널 유지 중'], ['INVALIDATED', '매수 신호 무효화'], ['EXPIRED', '매수 신호 만료']])('%s를 새 확정 신호로 표시하지 않는다', (state, label) => {
    render(<TradeSignalPanel report={{ ...report, signals: [{ ...signal, state }] }} />);
    expect(screen.getByText(`${label} · 돌파 확인`)).toBeInTheDocument();
    expect(screen.queryByText('매수 시그널 확정 · 돌파 확인')).not.toBeInTheDocument();
  });
  it('추격 금지를 함께 표시한다', () => {
    render(<TradeSignalPanel report={{ ...report, signals: [{ ...signal, entryStatus: 'CHASE_BLOCKED' }] }} />);
    expect(screen.getByText('현재 추격 진입 보류')).toBeInTheDocument();
  });
  it('과거 결과에 신호 필드가 없으면 숨긴다', () => {
    const { container } = render(<TradeSignalPanel />); expect(container).toBeEmptyDOMElement();
  });
  it('표본 부족을 신호 없음과 구분한다', () => {
    render(<TradeSignalPanel report={{ ...report, completeness: 'INSUFFICIENT_DATA', signals: [] }} />);
    expect(screen.getByText(/신호 판정을 보류했습니다/)).toBeInTheDocument();
    expect(screen.queryByText(/신호 조건에 해당하지 않습니다/)).not.toBeInTheDocument();
  });
});
