import { describe, expect, it } from 'vitest';
import { completedAnalysisMock } from '../mocks/analysisMockData';
import { validateAnalysisResponse } from './validateAnalysisResponse';

describe('validateAnalysisResponse', () => {
  it('일봉·주봉·월봉 점수가 있는 분석 응답을 허용한다', () => {
    expect(validateAnalysisResponse(completedAnalysisMock)).toBe(completedAnalysisMock);
  });

  it('시간대 점수 계약이 누락되면 오류를 반환한다', () => {
    const invalid = { ...completedAnalysisMock };
    delete invalid.timeframeScores;

    expect(() => validateAnalysisResponse(invalid))
      .toThrow('분석 응답에 필수 필드가 없습니다: timeframeScores');
  });

  it('일봉·주봉·월봉 중 일부가 누락되면 오류를 반환한다', () => {
    const invalid = { ...completedAnalysisMock, timeframeScores: { daily: 50, weekly: 60 } };

    expect(() => validateAnalysisResponse(invalid))
      .toThrow('분석 응답의 시간대별 점수 형식이 올바르지 않습니다.');
  });
});
