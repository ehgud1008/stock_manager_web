import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BusinessResearchView, EventResearchView } from './NewsResearchView';

const event = () => ({ title: '공급계약', importance: { level: 'HIGH', basis: 'QUANTITATIVE', reason: '공시 기재 규모를 참고했습니다.', metricIds: ['M1'] }, evidenceQuality: { level: 'ORIGINAL', publisherCount: 1 },
  conflict: { explanation: '계약은 확인했으나 수익성은 확인하지 못했습니다.', supportingSourceIds: ['S1'], opposingSourceIds: [] },
  criticalQuestion: { question: '이익으로 이어지는가?', known: '계약 총액', unknown: '이익률', nextEvidence: '후속 실적', positiveCondition: '이익률 개선', negativeCondition: '공급 지연' },
  changeType: 'STRENGTHENED', changeReason: '제목 대신 공시 원문을 확보했습니다.', previousInterpretation: '계약 내용 미확인', interpretation: '계약 금액 확인', linkStatus: 'AI_PROPOSED_LINK', documentChange: 'DIFFERENT_DOCUMENTS' });
const evidence = { materialityMetrics: [{ id: 'M1', ratioPct: 25, amount: 250000, revenue: 1000000, period: '공시 기재 최근매출액 · 기간 미확인', scope: '공시 자체 비교', sourceId: 'S1', limitation: '연간 매출 기여가 아닙니다.' }] };
describe('2차 리서치 표시', () => {
  it('중요도와 근거 확보 수준을 분리하고 계산 기준과 핵심 질문을 표시한다', () => {
    render(<EventResearchView event={event()} evidence={evidence} />);
    expect(screen.getByText('기업 영향 중요도: 높음')).toBeInTheDocument();expect(screen.getByText('근거: 공식 자료 확보')).toBeInTheDocument();
    expect(screen.getByText('공시 기재 규모 비교 · 25%')).toBeInTheDocument();expect(screen.getByText(/공시 기재 최근매출액 · 기간 미확인/)).toBeInTheDocument();
    expect(screen.getByText(/판단을 바꿀 핵심 질문 · 이익으로 이어지는가/)).toBeInTheDocument();expect(screen.getByText('아직 모르는 것: 이익률')).toBeInTheDocument();
    expect(screen.getByText(/반대 자료: 미확보/)).toBeInTheDocument();expect(screen.getByText(/같은 사건 후보로 연결/)).toBeInTheDocument();
    const table=within(screen.getByRole('table',{name:'공급계약 이전 해석 비교'}));expect(table.getByText('계약 내용 미확인')).toBeInTheDocument();expect(table.getByText('계약 금액 확인')).toBeInTheDocument();
  });
  it('본문 없는 결과는 수치와 중요도 높음을 임의로 채우지 않는다', () => {
    const saved=event();saved.importance={level:'UNDETERMINED',basis:'INSUFFICIENT',reason:'원문 미확보',metricIds:[]};saved.evidenceQuality={level:'TITLE_ONLY',publisherCount:1};saved.documentChange='SAME_CONTENT';
    render(<EventResearchView event={saved} evidence={evidence} />);expect(screen.getByText('기업 영향 중요도: 판단 유보')).toBeInTheDocument();expect(screen.queryByText(/공시 기재 규모 비교/)).not.toBeInTheDocument();expect(screen.getByText(/연결된 문서 내용은 동일/)).toBeInTheDocument();
  });
  it('공식 사업 기준과 다른 엔진 입력으로 인한 변화를 명시한다', () => {
    render(<BusinessResearchView result={{ report:{ businessContext:{status:'OFFICIAL_EVIDENCE',description:'전력기기를 생산합니다.',sourceIds:['S1']},engineChanged:true },evidence:{ companyProfile:{status:'OFFICIAL_API',corpName:'예시기업',industryCode:'281',source:'OpenDART'},productSearch:'전력기기',annualRevenue:{value:1000000,period:'2025 사업연도',periodDetail:'연간',scope:'별도 재무제표',sourceId:'S1'} } }} />);
    expect(screen.getByText(/별도 매출액 1,000,000원/)).toBeInTheDocument();expect(screen.getByText(/엔진 입력도 달라졌습니다/)).toBeInTheDocument();expect(screen.getByText(/추출한 제품명으로 추가 검색: 전력기기/)).toBeInTheDocument();
  });
  it('큰 원화 금액을 자바스크립트 숫자 반올림 없이 표시한다', () => {
    const exact={materialityMetrics:[{...evidence.materialityMetrics[0],amount:'9007199254740993',revenue:'18014398509481986',ratioPct:50}]};
    render(<EventResearchView event={event()} evidence={exact} />);
    expect(screen.getByText('계약금액 9,007,199,254,740,993원 ÷ 최근매출액 18,014,398,509,481,986원 × 100')).toBeInTheDocument();
  });
});
