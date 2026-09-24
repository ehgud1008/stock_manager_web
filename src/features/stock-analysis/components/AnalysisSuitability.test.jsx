import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AnalysisResultPanel from './AnalysisResultPanel';
import FactorScorePanel from './FactorScorePanel';
import TimeframeScorePanel from './TimeframeScorePanel';

const result = {
  analysisMode: 'SWING', engineVersion: 'analysis-v4-swing', totalScore: 76.2,
  strategyAction: 'WATCH', strategyName: '스윙 관찰', targets: [], historicalSampleCount: 100,
  dataQualityStatus: 'PARTIAL', timeframeScores: { daily: 90, weekly: 80, monthly: 20 },
  suitabilityScores: { status: 'PROVISIONAL', rise: 90, entry: 60, risk: 42, availableFactors: 8, totalFactors: 9 },
};

describe('swing suitability display', () => {
  it('가격의 소수점만 제거하고 점수 소수점은 유지한다', () => {
    render(<AnalysisResultPanel result={{ ...result, currentPrice: 70000.123, entryFrom: 69000.456,
      entryTo: 70000.789, targets: [75000.678], stopLoss: 68000.123 }} />);
    expect(screen.getByText('70,000원')).toBeInTheDocument();
    expect(screen.getByText('69,000원 – 70,001원')).toBeInTheDocument();
    expect(screen.getByText('75,001원')).toBeInTheDocument();
    expect(screen.getByText('68,000원')).toBeInTheDocument();
    expect(screen.getByText('76.2')).toBeInTheDocument();
  });
  it('shows representative score, three groups, provisional coverage and missing scenario', () => {
    render(<AnalysisResultPanel result={result} />);
    expect(screen.getByText('스윙 매매 적합도')).toBeInTheDocument();
    expect(screen.getByText('76.2')).toBeInTheDocument();
    expect(screen.getByText(/잠정 점수/)).toHaveTextContent('8/9');
    expect(screen.getByText('상승 조건 · 60%')).toBeInTheDocument();
    expect(screen.getByText('진입 조건 · 30%')).toBeInTheDocument();
    expect(screen.getAllByText('유효 시나리오 없음')).toHaveLength(2);
  });
  it('does not display unavailable scores as zero', () => {
    render(<AnalysisResultPanel result={{ ...result, totalScore: null,
      suitabilityScores: { status: 'UNAVAILABLE', availableFactors: 0, totalFactors: 9 } }} />);
    expect(screen.getByText('분석 보류')).toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });
  it('distinguishes unavailable factors from reference-only scores', () => {
    render(<FactorScorePanel factors={[
      { factorCode: 'RELATIVE_STRENGTH', score: null, contribution: null, weight: 0, reason: '비교 데이터 없음' },
      { factorCode: 'VALUE_QUALITY', score: 60, contribution: 0, weight: 0, reason: '참고' },
    ]} />);
    expect(screen.getByText('산출 불가')).toBeInTheDocument();
    expect(screen.getByText('참고 · 미합산')).toBeInTheDocument();
  });
  it('does not explain v4 avoidance as a monthly veto', () => {
    render(<TimeframeScorePanel result={{ ...result, strategyAction: 'AVOID' }} />);
    expect(screen.queryByText(/신규 진입을 회피합니다/)).not.toBeInTheDocument();
    expect(screen.getByText(/월봉은 단독 회피 조건이 아닙니다/)).toBeInTheDocument();
  });
  it('distinguishes unavailable scenario from missing core data in v5', () => {
    render(<AnalysisResultPanel result={{ ...result, engineVersion: 'analysis-v5-swing', totalScore: null,
      suitabilityScores: { status: 'UNAVAILABLE', rise: 80, entry: null, risk: 60, availableFactors: 7, totalFactors: 10 },
      swingAssessment: { setupType: 'BREAKOUT', setupLabel: '돌파형', detailCode: 'SCENARIO_UNAVAILABLE',
        detailLabel: '목표 시나리오 산출 불가', scenarioStatus: 'UNAVAILABLE' } }} />);
    expect(screen.getByText('돌파형')).toBeInTheDocument();
    expect(screen.getByText(/목표 시나리오 산출 불가 · 대표점수 산출 보류/)).toBeInTheDocument();
    expect(screen.queryByText(/핵심 데이터 부족/)).not.toBeInTheDocument();
    expect(screen.getByText('80.0')).toBeInTheDocument();
  });
  it('shows specific v5 wait reason without changing representative action', () => {
    render(<AnalysisResultPanel result={{ ...result, strategyAction: 'WAIT',
      swingAssessment: { setupType: 'PULLBACK', setupLabel: '눌림목형', detailCode: 'LOW_REWARD_RISK',
        detailLabel: '손익비 부족', scenarioStatus: 'AVAILABLE' } }} />);
    expect(screen.getByText('진입 대기')).toBeInTheDocument();
    expect(screen.getByText('손익비 부족')).toBeInTheDocument();
  });
});
