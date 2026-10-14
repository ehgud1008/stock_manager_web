import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SignalInterpretationView from './SignalInterpretationView';
import NewsInsightView from './NewsInsightView';

function result() {
  const condition = { text: '계약 정정 공시와 엔진 추세 훼손을 확인합니다.', sourceIds: ['S1'], engineEvidenceIds: ['ANALYSIS'] };
  return {
    engine: { priceDate: '2026-10-09', evidence: { ANALYSIS: { strategy: { action: 'WAIT' }, scenario: { entryFrom: 1000, entryTo: 1100, targets: [1300], stopLoss: 900 }, signalReport: { signals: [{ id: 'old', side: 'BUY', state: 'EXPIRED', evaluatedOn: '2026-10-09' }] } } } },
    signalContext: { status: 'WITHIN_WINDOW', calendarDayGap: 3, collectedAt: '2026-10-12T00:00:00Z' },
    evidence: { sources: [{ id: 'S1', title: '계약 원문', url: 'https://example.com/filing', topics: ['DISCLOSURE'], depth: 'OFFICIAL_DOCUMENT', passages: [] }], coverage: [], collectedAt: '2026-10-12T00:00:00Z' },
    report: { summary: '외부 근거 요약', events: [], nextChecks: [], limitations: ['범위 제한'], signalInterpretation: { stance: 'SUPPORTED', reason: '대기 신호를 뒷받침합니다.', sourceIds: ['S1'], engineEvidenceIds: ['ANALYSIS'], conflicts: [], nonHolderChecks: [condition], holderChecks: [{ ...condition, text: '유지 판단의 전제를 다시 확인합니다.' }], invalidationConditions: [{ ...condition, text: '계약이 철회되면 이번 해석을 재검토합니다.' }], missingInformation: ['실제 수익성은 미확인입니다.'] } },
  };
}
describe('매매 신호 종합 해석', () => {
  it('대기 신호를 매수로 바꾸지 않고 엔진 원래 가격과 상황별 근거를 표시한다', () => {
    render(<SignalInterpretationView result={result()} />);
    expect(screen.getByText('엔진 전략: 대기')).toBeInTheDocument();expect(screen.getByText('엔진 신호 뒷받침')).toBeInTheDocument();
    expect(screen.getByText('매수 · 만료 · 2026-10-09')).toBeInTheDocument();
    expect(screen.getByText('저장된 엔진 진입 구간: 1,000원 ~ 1,100원')).toBeInTheDocument();expect(screen.getByText('목표가: 1,300원 · 손절가: 900원')).toBeInTheDocument();
    expect(screen.getByText('미보유 · 진입 검토 전 확인')).toBeInTheDocument();expect(screen.getByText('보유 · 유지 판단 재검토 조건')).toBeInTheDocument();
    expect(screen.getByText('실제 수익성은 미확인입니다.')).toBeInTheDocument();expect(screen.getAllByRole('link')[0]).toHaveAttribute('href', 'https://example.com/filing');
  });
  it('오래된 자료·가격 미산출과 충돌을 표시하고 외부 텍스트를 실행하지 않는다', () => {
    const saved = result();saved.signalContext.status = 'REFRESH_REQUIRED';saved.engine.evidence.ANALYSIS.scenario = null;
    saved.report.signalInterpretation.stance = 'CHECK_REQUIRED';saved.report.signalInterpretation.conflicts = [{ text: '<script>unsafe</script>', sourceIds: ['S1'], engineEvidenceIds: ['ANALYSIS'] }];saved.evidence.sources[0].url = 'javascript:alert(1)';
    render(<SignalInterpretationView result={saved} />);
    expect(screen.getByText(/엔진 기준일이 오래되었거나/)).toBeInTheDocument();expect(screen.getByText('저장된 엔진 가격 계획이 없어 가격을 표시하지 않습니다.')).toBeInTheDocument();
    expect(screen.getByText('<script>unsafe</script>')).toBeInTheDocument();expect(screen.queryByRole('link')).not.toBeInTheDocument();expect(document.querySelector('script')).toBeNull();
  });
  it('구버전 리포트에 종합 결론을 만들어 붙이지 않는다', () => {
    const saved = result();delete saved.report.signalInterpretation;render(<SignalInterpretationView result={saved} />);
    expect(screen.getByText(/이전 형식의 리포트입니다/)).toBeInTheDocument();expect(screen.queryByText('엔진 신호 뒷받침')).not.toBeInTheDocument();
  });
  it('뉴스 상세에서 요약보다 먼저 종합 해석을 표시한다', () => {
    render(<NewsInsightView result={result()} />);
    const section = screen.getByRole('region', { name: '매매 신호 종합 해석' });
    expect(within(section).getByText('대기 신호를 뒷받침합니다.')).toBeInTheDocument();
    expect(section.compareDocumentPosition(screen.getByText('외부 근거 요약')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
