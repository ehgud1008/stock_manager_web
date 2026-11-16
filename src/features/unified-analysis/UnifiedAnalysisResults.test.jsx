import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import UnifiedAnalysisResults from './UnifiedAnalysisResults';
import StockChartPanel from '../stock-chart/components/StockChartPanel';
import { unifiedAnalysisFixture } from '../../test/unifiedAnalysisFixtures';

vi.mock('../stock-chart/components/StockChartPanel', () => ({ default: vi.fn(() => <div>차트</div>) }));

describe('analysis target disclosure', () => {
  it('passes the explicit historical synthetic marker to the card and chart without changing saved data', () => {
    const data = unifiedAnalysisFixture();
    data.result.analysis.warnings = ['SYNTHETIC_TARGET: saved projection'];
    render(<UnifiedAnalysisResults data={data} />);
    expect(screen.getByText('가정 목표가')).toBeInTheDocument();
    expect(screen.getByText('신고가 가정 목표 · 2R / 3.5R')).toBeInTheDocument();
    expect(StockChartPanel).toHaveBeenCalledWith(expect.objectContaining({ analysis: expect.objectContaining({ targetBasis: 'STRUCTURAL_RISK_MULTIPLE' }) }), undefined);
    expect(data.result.analysis.scenario.targetBasis).toBeUndefined();
  });
  it('labels recorded resistance targets and identifies the reward/risk as before costs', () => {
    const data = unifiedAnalysisFixture();
    data.result.analysis.scenario.targetBasis = 'OBSERVED_RESISTANCE';
    render(<UnifiedAnalysisResults data={data} section="analysis" />);
    expect(screen.getByText('관측 저항 목표가')).toBeInTheDocument();
    expect(screen.getByText(/손익비는 비용 차감 전·분석 시나리오 진입 상단 기준/)).toBeInTheDocument();
    expect(screen.getByText(/점수 기준 종목 평가 · 신규 진입 자격/)).toBeInTheDocument();
  });
});
