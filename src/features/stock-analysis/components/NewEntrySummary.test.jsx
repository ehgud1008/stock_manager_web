import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import NewEntrySummary from './NewEntrySummary';

const assessment = {
  status: 'ELIGIBLE', selectedSignal: { type: 'PULLBACK_RECOVERY', occurredOn: '2026-10-22', ageBars: 2 },
  effectiveScenario: { entryFrom: 19800, entryTo: 19950, targets: [23000], stopLoss: 19000 },
  signals: [{ signalId: 'newer', type: 'BREAKOUT', ageBars: 0, eligible: false, reasons: ['두 진입 구간이 겹치지 않습니다.'] }],
};
describe('NewEntrySummary', () => {
  it('shows the selected signal, effective range and rejected signal reason', () => {
    render(<NewEntrySummary assessment={assessment} />);
    expect(screen.getByText(/눌림 회복 · 발생일 2026-10-22 · 경과 2봉/)).toBeInTheDocument();
    expect(screen.getByText(/유효 진입 구간: 19,800~19,950원/)).toBeInTheDocument();
    expect(screen.getByText(/두 진입 구간이 겹치지 않습니다/)).toBeInTheDocument();
    expect(screen.getByText(/리포트 추가 조건은 별도 적용/)).toBeInTheDocument();
  });
  it('does not describe a usable signal as permission to enter when data is incomplete', () => {
    render(<NewEntrySummary assessment={{ ...assessment, status: 'DEFER' }} />);
    expect(screen.getByText('공통 신규 진입 조건 미통과')).toBeInTheDocument();
    expect(screen.getByText(/신호 참고 구간 · 진입 보류/)).toBeInTheDocument();
    expect(screen.queryByText(/유효 진입 구간:/)).not.toBeInTheDocument();
  });
  it('preserves historical results without inventing a new assessment', () => {
    const { container } = render(<NewEntrySummary />);
    expect(container).toBeEmptyDOMElement();
  });
});
