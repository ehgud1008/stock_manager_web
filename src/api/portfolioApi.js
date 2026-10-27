import httpClient from './httpClient';

const base = '/v1/unified-analysis';
const unwrap = ({ data }) => {
  if (!data?.success) throw new Error(data?.message || '누적 성과 요청을 완료하지 못했습니다.');
  return data.data;
};
export const listPortfolios = signal => httpClient.get(`${base}/portfolios`, { signal }).then(unwrap);
export const getPortfolio = (id, signal) => httpClient.get(`${base}/portfolios/${encodeURIComponent(id)}`, { signal }).then(unwrap);
export const createPortfolio = (request, key) => httpClient.post(`${base}/portfolios`, request, { headers: { 'Idempotency-Key': key } }).then(unwrap);
export const getRevision = (id, revision, signal) => httpClient.get(`${base}/portfolios/${encodeURIComponent(id)}/revisions/${revision}`, { signal }).then(unwrap);
export const getSelectionAudit = (id, signal) => httpClient.get(`${base}/portfolios/reports/${encodeURIComponent(id)}/selection-audit`, { signal }).then(unwrap);
export const getOperations = signal => httpClient.get(`${base}/operations`, { signal }).then(unwrap);
export const previewReport = (id, signal) => httpClient.get(`${base}/operations/reports/${encodeURIComponent(id)}/preview`, { signal }).then(unwrap);
export const sendTelegramTest = (request, key) => httpClient.post(`${base}/operations/telegram-tests`, request, { headers: { 'Idempotency-Key': key } }).then(unwrap);

export const checkTelegramConnection = signal => httpClient.post(`${base}/operations/telegram-connection`, {}, { signal, timeout: 25000 }).then(unwrap);
