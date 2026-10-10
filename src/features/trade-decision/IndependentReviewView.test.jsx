import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import IndependentReviewView from './IndependentReviewView';

const explain = text => ({ text, evidenceIds: ['MARKET_DATA'], metricIds: [] });
const level = (value, kind, adjustmentPct) => ({ value, kind, adjustmentPct, sourcePath: '/metrics/CURRENT/value', basis: '추세 유지 가정을 적용했습니다.' });
function result() {
  return { finalAction: 'BUY', context: { positionStatus: 'NOT_HELD' }, policy: { engineAssessment: 'WAIT', priceDate: '2026-10-09',
    metrics: { CURRENT: { label: '분석 종가', value: 100, unit: '원' } }, marketData: { candles: [['2026-10-09', 99, 102, 97, 100, 1000]] } },
  strategyCalculations: [{ strategyId: 'MAIN', referencePrice: 100, referenceKind: 'ENTRY_UPPER', lossPct: 5, targets: [{ price: 110, upsidePct: 10, rewardRisk: 2 }] }],
  aiReview: { planId: 'MAIN', detail: { conclusion: explain('엔진 신호 전에도 조건부 진입을 검토합니다.') }, independent: { strength: 'CONDITIONAL', alignment: 'DISAGREE', engineComparison: explain('엔진은 확인을 기다리지만 가격 회복 가능성을 별도로 평가했습니다.'),
    strategies: [{ id: 'MAIN', horizonTradingDays: 10, entryLow: level(98, 'CALCULATED', -2), entryHigh: level(100, 'OBSERVED', null), stop: level(95, 'CALCULATED', -5),
      targets: [level(110, 'PROJECTION', 10)], rationale: '거래량 회복을 확인하는 전략입니다.', evidenceIds: ['MARKET_DATA'], assumptions: ['수급이 유지된다고 가정합니다.'], invalidation: '지지를 이탈하면 취소합니다.', timeCondition: '신호 만료 전에 재검토합니다.' }] },
    scenarios: [{ conditionId: 'UPSIDE', strategyId: 'MAIN', trigger: '저항 돌파를 확인합니다.', development: '추세가 이어진다고 가정합니다.', response: '조건 충족 후 대응합니다.', newInvestorAction: '진입을 검토합니다.', holderAction: '지지 유지 시 보유합니다.', invalidation: '돌파 실패 시 취소합니다.', timeCondition: '신호 만료 전에 확인합니다.', metricIds: [] }],
    supportingReasons: [{ evidenceId: 'MARKET_DATA', explanation: '가격 회복이 관측됩니다.' }], opposingReasons: [{ evidenceId: 'MARKET_DATA', explanation: '반등 실패 가능성이 있습니다.' }],
    missingInformation: ['최근 공시 자료가 없습니다.'], reviewConditionIds: ['UPSIDE'] } };
}
describe('IndependentReviewView', () => {
  it('엔진 대기와 AI 매수를 구분하고 전망 가격·재계산 손익비·각 보유자 대응을 표시한다', () => {
    render(<IndependentReviewView result={result()} />);
    expect(screen.getByText('엔진: 진입 대기 · AI: 매수 검토')).toBeInTheDocument();
    expect(screen.getByText('엔진과 다른 판단')).toBeInTheDocument();expect(screen.getByText('가정한 전망')).toBeInTheDocument();
    expect(screen.getByText('1차 목표 110원')).toBeInTheDocument();expect(screen.getByText('1차 목표 상승 여력 10% · 손익비 2배')).toBeInTheDocument();
    expect(screen.getByText('신규 진입자: 진입을 검토합니다.')).toBeInTheDocument();expect(screen.getByText('보유자: 지지 유지 시 보유합니다.')).toBeInTheDocument();
    expect(screen.getByText(/누락 정보: 최근 공시 자료가 없습니다/)).toBeInTheDocument();
  });
  it('관측 가격의 일봉 출처와 종가 기준 손익을 보여주고 전망과 구별한다', () => {
    const saved = result();saved.context.positionStatus = 'HELD';saved.strategyCalculations[0].referenceKind = 'CURRENT_PRICE';saved.strategyCalculations[0].costBasisReturnPct = 25;
    saved.aiReview.independent.strategies[0].entryHigh = { value: 100, kind: 'OBSERVED', sourcePath: '/marketData/candles/0/4', adjustmentPct: null, basis: '확정 종가입니다.' };
    render(<IndependentReviewView result={saved} />);
    expect(screen.getByText('엔진: 진입 대기 · AI: 추가 매수 검토')).toBeInTheDocument();
    expect(screen.getByText(/기준: 2026-10-09 종가 100원/)).toBeInTheDocument();
    expect(screen.getByText('매수가 대비 평가손익 25%')).toBeInTheDocument();
  });
  it('가격 전략이 없으면 산출 불가를 표시하고 엔진 목표를 AI 목표로 대체하지 않는다', () => {
    const saved = result();saved.aiReview.independent.strategies = [];saved.strategyCalculations = [];saved.aiReview.planId = null;
    render(<IndependentReviewView result={saved} />);
    expect(screen.getByText(/AI 가격 전략 미제시/)).toBeInTheDocument();
    expect(screen.queryByText('1차 목표 110원')).not.toBeInTheDocument();
  });
});
