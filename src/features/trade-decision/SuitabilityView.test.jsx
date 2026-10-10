import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SuitabilityView from './SuitabilityView';
import { defaultPreferences } from './decisionPreferences';

const period = { minTradingDays: 6, maxTradingDays: 15, reason: '반등 지속을 확인할 기간입니다.', earlyExit: '추세 훼손 시 재검토합니다.', expiryAction: '목표 미도달이면 신호를 다시 확인합니다.' };
const fragility = { strongestReason: '지지가 유지됩니다.', strongestCounter: '거래량이 약합니다.', decisiveUnknown: '새 공시가 필요합니다.', avoidIf: '저항 돌파에 실패하는 경우' };
const result = () => ({ policy: { preferences: { ...defaultPreferences, monitoring: 'OCCASIONAL' } }, marketAssessment: {
  recommendedStyle: 'SWING', requiredMonitoring: 'DAILY', holdingPeriod: period, fragility,
  styles: [{ style: 'SWING', status: 'CONDITIONAL', reason: '반등을 확인할 수 있습니다.' }, { style: 'LONG_TERM', status: 'INSUFFICIENT', reason: '장기 재무 자료가 부족합니다.' }],
}, aiReview: { personalization: { fit: 'MISMATCH', reason: '필요한 확인 빈도가 사용자 여건보다 높습니다.', selectedStyle: 'SWING', holdingPeriod: period, requiredMonitoring: 'DAILY', fragility,
  perspectives: [{ profile: 'AGGRESSIVE', entryRule: '초기 신호를 확인합니다.', exitRule: '실패 시 빠르게 재검토합니다.', tradeoff: '빠른 진입에는 불확실성이 있습니다.' }],
  nextAction: { action: 'WAIT_FOR_CONDITION', instruction: '종가 돌파 확인 전에는 대기하세요.', transitionId: 'T1' }, transitions: [
    { id: 'T1', fromAction: 'WAIT', toAction: 'BUY', trigger: '종가가 저항을 넘는 경우', invalidation: '지지를 이탈하면 취소', assessmentMode: 'PRICE_CHECK', priceCondition: { price: 110, operator: 'ABOVE' } },
    { id: 'T2', fromAction: 'BUY', toAction: 'UNDETERMINED', trigger: '추세와 거래량이 충돌하는 경우', invalidation: '추세가 회복되면 재검토', assessmentMode: 'AI_REVIEW', priceCondition: null },
  ] } } });

describe('SuitabilityView', () => {
  it('종목 자체와 사용자 적합성·기간 범위·대응 여건의 충돌을 분리한다', () => {
    render(<SuitabilityView result={result()} />);
    expect(screen.getByText('종목 자체의 투자 적합성')).toBeInTheDocument();expect(screen.getByText('내 성향을 반영한 전략')).toBeInTheDocument();
    expect(screen.getByText('현재 성향·여건과 맞지 않음')).toBeInTheDocument();expect(screen.getAllByText(/6~15거래일/)).toHaveLength(2);
    expect(screen.getByText('장기 재무 자료가 부족합니다.')).toBeInTheDocument();expect(screen.getByText(/가끔 확인/)).toBeInTheDocument();
    expect(screen.getByText(/기간 경과 후 대응: 목표 미도달/)).toBeInTheDocument();
  });
  it('가장 가까운 행동과 가격 확인·추가 해석 조건을 구분하고 자동 감시로 표시하지 않는다', () => {
    render(<SuitabilityView result={result()} />);
    expect(screen.getByText('종가 돌파 확인 전에는 대기하세요.')).toBeInTheDocument();expect(screen.getByText('대기 → 매수 검토 · 우선 확인')).toBeInTheDocument();
    expect(screen.getByText('가격으로 확인 가능')).toBeInTheDocument();expect(screen.getByText('추가 AI 해석 필요')).toBeInTheDocument();
    expect(screen.getByText(/확정 종가가 110원 초과/)).toBeInTheDocument();expect(screen.getByText(/자동 감시·알림·주문은 실행하지 않습니다/)).toBeInTheDocument();
    expect(screen.getByText('결론을 바꿀 미확인 정보: 새 공시가 필요합니다.')).toBeInTheDocument();
  });
  it('유보된 보유기간을 영 거래일로 표시하지 않고 이전 결과도 안내한다', () => {
    const saved=result();saved.aiReview.personalization.holdingPeriod={ ...period, minTradingDays: null, maxTradingDays: null };
    const { rerender } = render(<SuitabilityView result={saved} />);expect(screen.getByText(/기간 제안 유보/)).toBeInTheDocument();
    rerender(<SuitabilityView result={{ aiReview: {} }} />);expect(screen.getByText(/이전 형식의 분석입니다/)).toBeInTheDocument();
  });
});
