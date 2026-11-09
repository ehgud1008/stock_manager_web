import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TradeJudgmentPanel from './TradeJudgmentPanel';

describe('TradeJudgmentPanel', () => {
  it('distinguishes a missing historical judgment from a current hold', () => {
    render(<TradeJudgmentPanel />);
    expect(screen.getByText(/매매판단이 저장되어 있지 않습니다/)).toBeInTheDocument();
    expect(screen.queryByText('보유 유지')).not.toBeInTheDocument();
  });
  it('renders only new entry judgment for an unregistered stock', () => {
    render(<TradeJudgmentPanel judgment={{ policyVersion: 'trade-judgment-v1', positionScope: 'UNKNOWN',
      asOf: '2026-10-22T15:00:00Z', priceDate: '2026-10-22',
      notHeld: { action: 'WATCH', reasons: ['진입 구간 초과'], reviewConditions: ['구간 복귀'] },
      held: { action: 'HOLD', reasons: ['추세 유지'], reviewConditions: ['손절 조건 발생'] }, limitations: ['조건부 판단'] }} />);
    expect(screen.getByText('관망')).toBeInTheDocument();
    expect(screen.queryByText('보유 유지')).not.toBeInTheDocument();
    expect(screen.getByText('진입 구간 초과')).toBeInTheDocument();
    expect(screen.getByText('재검토 조건: 구간 복귀')).toBeInTheDocument();
    expect(screen.getByText(/미보유 기준/)).toBeInTheDocument();
    expect(screen.getByText(/한국시간/)).toBeInTheDocument();
  });
  it('does not label incomplete data as hold', () => {
    render(<TradeJudgmentPanel judgment={{ notHeld: { action: 'DEFER' }, held: { action: 'DEFER' } }} />);
    expect(screen.getAllByText('판단 보류')).toHaveLength(1);
    expect(screen.queryByText('보유 유지')).not.toBeInTheDocument();
  });
  it('shows concrete collection warnings beside the judgment', () => {
    render(<TradeJudgmentPanel judgment={{ positionScope: 'NOT_HELD', notHeld: { action: 'DEFER' } }} warnings={['월봉 참고 점수 표본 부족: 20개 필요']} />);
    expect(screen.getByText('월봉 참고 점수 표본 부족: 20개 필요')).toBeInTheDocument();
    expect(screen.queryByText('보유 시')).not.toBeInTheDocument();
  });
});
