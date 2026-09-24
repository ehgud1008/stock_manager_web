import httpClient from './httpClient';

function unwrap(response) {
  if (response.data?.success !== true) throw new Error(response.data?.message || '스크리너 응답을 확인할 수 없습니다.');
  return response.data.data;
}

export const getScreenerResults = async (params, signal) => unwrap(await httpClient.get('/v1/screener', { params, signal }));
export const searchScreenerResults = async (query, signal) => unwrap(await httpClient.post('/v1/screener/search', query, { signal }));
export const getScreenerItem = async (id, code, signal) => unwrap(await httpClient.get(`/v1/screener/runs/${encodeURIComponent(id)}/stocks/${encodeURIComponent(code)}`, { signal }));
export const getScreenerRun = async (id, signal) => unwrap(await httpClient.get(`/v1/screener/runs/${encodeURIComponent(id)}`, { signal }));
export const recoverScreenerRun = async (id) => unwrap(await httpClient.post(`/v1/screener/runs/${encodeURIComponent(id)}/recover`));
export const startScreenerRun = async (request, key) => unwrap(await httpClient.post('/v1/screener/runs', request, { headers: { 'Idempotency-Key': key } }));
export const resumeScreenerRun = async (id) => unwrap(await httpClient.post(`/v1/screener/runs/${encodeURIComponent(id)}/resume`));

// One bounded page per call. The caller pins subsequent requests to the returned run ID.
export async function loadScreenerSnapshot(mode, interval, runId, signal, options = {}) {
  const query = { page: 0, size: 20, ...options, mode, interval, ...(runId ? { runId } : {}) };
  const data = await searchScreenerResults(query, signal);
  if (!data.run) return { ...data, content: [] };
  if (data.run.request.mode !== mode || data.run.request.interval !== interval) throw new Error('요청한 봉 주기와 실행 결과가 다릅니다.');
  if (runId && data.run.runId !== runId) throw new Error('요청한 실행 결과와 다릅니다.');
  if (!Number.isInteger(data.totalElements) || data.totalElements < 0 || data.page !== query.page || data.size !== query.size) throw new Error('조회 페이지를 확인할 수 없습니다.');
  const expected = Math.min(query.size, Math.max(0, data.totalElements - query.page * query.size));
  if (!Array.isArray(data.content) || data.content.length !== expected || new Set(data.content.map((item) => item.stockCode)).size !== data.content.length) throw new Error('일부 결과가 누락되었습니다. 다시 조회해 주세요.');
  return data;
}
