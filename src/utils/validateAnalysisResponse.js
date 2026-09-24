const requiredFields = [
  'analysisRunId', 'stockCode', 'stockName', 'analysisMode', 'status',
  'dataQualityStatus', 'baseDate', 'totalScore', 'scoreGrade',
  'timeframeScores', 'strategyName', 'strategyAction', 'entryFrom', 'entryTo', 'targets',
  'stopLoss', 'historicalSampleCount', 'factors', 'reasons', 'warnings',
];

export const validateAnalysisResponse = (data) => {
  if (!data || typeof data !== 'object') {
    throw new Error('분석 응답 형식이 올바르지 않습니다.');
  }

  const missingField = requiredFields.find((field) => !(field in data));
  if (missingField) {
    throw new Error(`분석 응답에 필수 필드가 없습니다: ${missingField}`);
  }

  if (!Array.isArray(data.targets)
    || !Array.isArray(data.factors)
    || !Array.isArray(data.reasons)
    || !Array.isArray(data.warnings)) {
    throw new Error('분석 응답의 목록 형식이 올바르지 않습니다.');
  }

  if (!data.timeframeScores || typeof data.timeframeScores !== 'object'
    || !['daily', 'weekly', 'monthly'].every((field) => field in data.timeframeScores)) {
    throw new Error('분석 응답의 시간대별 점수 형식이 올바르지 않습니다.');
  }

  return data;
};
