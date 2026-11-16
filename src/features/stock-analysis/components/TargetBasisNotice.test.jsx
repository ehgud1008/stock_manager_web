import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TargetBasisNotice from './TargetBasisNotice';

describe('target basis disclosure', () => {
  it('distinguishes risk projections, observed levels and missing historical metadata', () => {
    const view = render(<TargetBasisNotice scenario={{ targets: [120], targetBasis: 'STRUCTURAL_RISK_MULTIPLE' }} />);
    expect(screen.getByText('신고가 가정 목표 · 2R / 3.5R')).toBeInTheDocument();
    expect(screen.getByText(/관측 저항이나 도달 예측이 아닙니다/)).toBeInTheDocument();
    view.rerender(<TargetBasisNotice scenario={{ targets: [120], targetBasis: 'OBSERVED_RESISTANCE' }} />);
    expect(screen.getByText('관측 저항 목표')).toBeInTheDocument();
    view.rerender(<TargetBasisNotice scenario={{ targets: [120] }} />);
    expect(screen.getByText('목표 근거 미기록')).toBeInTheDocument();
    expect(screen.queryByText('관측 저항 목표')).not.toBeInTheDocument();
    view.rerender(<TargetBasisNotice />);
    expect(view.container).toBeEmptyDOMElement();
  });
});
