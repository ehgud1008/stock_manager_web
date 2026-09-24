import httpClient from './httpClient';

const runsPath = '/v1/unified-analysis/runs';
const unwrap = ({ data }) => {
  if (!data?.success) throw new Error(data?.message || '종합분석 요청을 완료하지 못했습니다.');
  return data.data;
};
export const listUnifiedRuns = signal => httpClient.get(runsPath, { signal }).then(unwrap);
export const startUnifiedRun = (request, key) => httpClient.post(runsPath, request, { headers: { 'Idempotency-Key': key } }).then(unwrap);
export const resumeUnifiedRun = id => httpClient.post(`${runsPath}/${id}/resume`).then(unwrap);
export const recoverUnifiedRun = id => httpClient.post(`${runsPath}/${id}/recover`).then(unwrap);
export const getUnifiedItems = (id, params, signal) => httpClient.get(`${runsPath}/${id}/items`, { params, signal }).then(unwrap);
export const getUnifiedDetail = (id, code, signal) => httpClient.get(`${runsPath}/${id}/items/${code}`, { signal }).then(unwrap);

// This page always calls the unified engine; single-stock mock settings do not apply.
export async function analyzeUnifiedStock(stockCode, signal) {
  const { data: payload } = await httpClient.post(`/v1/stocks/${stockCode}/unified-analysis`, {}, { signal, timeout: 120000 });
  if (!payload?.success) throw new Error(payload?.message || '종합분석을 완료하지 못했습니다.');
  const data = payload.data;
  const result = data?.result;
  if (result?.stock?.stockCode !== stockCode || result?.screener?.stockCode !== stockCode
    || result?.analysis?.mode !== 'SWING' || result?.screener?.timeframe?.mode !== 'SWING'
    || !result.priceDate || !result.asOf || !result.analysis.strategy || !result.screener.config
    || !result.analysis.signalReport || !Array.isArray(result.analysis.signalReport.signals)
    || !Array.isArray(result.analysis.factors) || !Array.isArray(result.warnings)
    || !Array.isArray(result.screener.history) || !Array.isArray(data.collectionWarnings)) {
    throw new Error('요청한 종목의 종합분석 결과를 확인할 수 없습니다. 다시 실행해 주세요.');
  }
  return data;
}
