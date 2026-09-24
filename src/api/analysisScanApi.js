import httpClient from './httpClient';

const unwrap = ({ data }) => {
  if (!data?.success) throw new Error(data?.message || '전체 종목분석 요청에 실패했습니다.');
  return data.data;
};
// Scans always use the real server, regardless of single-stock mock settings.
export const listAnalysisScans = (signal) => httpClient.get('/v1/analysis-scans', { signal }).then(unwrap);
export const startAnalysisScan = (request, key) => httpClient.post('/v1/analysis-scans', request, { headers: { 'Idempotency-Key': key } }).then(unwrap);
export const resumeAnalysisScan = (id) => httpClient.post(`/v1/analysis-scans/${id}/resume`).then(unwrap);
export const recoverAnalysisScan = (id) => httpClient.post(`/v1/analysis-scans/${id}/recover`).then(unwrap);
export const getAnalysisScanItems = (id, params, signal) => httpClient.get(`/v1/analysis-scans/${id}/items`, { params, signal }).then(unwrap);
export const getAnalysisScanDetail = (id, code, signal) => httpClient.get(`/v1/analysis-scans/${id}/items/${code}`, { signal }).then(unwrap);
