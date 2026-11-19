import httpClient from './httpClient';

const unwrap = ({ data }) => {
  if (!data?.success) throw new Error(data?.message || '저장 분석 요청에 실패했습니다.');
  return data.data;
};
const post = (path, body, key, signal) => httpClient.post(`/v1/${path}`, body, { signal, headers: { 'Idempotency-Key': key } }).then(unwrap);
export const getDecisionCapabilities = signal => httpClient.get('/v1/trade-decisions/capabilities', { signal }).then(unwrap);
export const startSnapshot = (code, key, signal, source = { source: 'COLLECT' }) => post(`stocks/${code}/analysis-snapshots`, source, key, signal);
export const getSnapshot = (id, signal) => httpClient.get(`/v1/analysis-snapshots/${id}`, { signal }).then(unwrap);
export const previewDecisionPlan = (id, body, signal) => httpClient.post(`/v1/analysis-snapshots/${id}/decision-plan`, body, { signal }).then(unwrap);
export const previewSourcePlan = (code, sourceRunId, body, signal) => httpClient.post(`/v1/stocks/${code}/decision-plan`, body, { signal, params: { sourceRunId } }).then(unwrap);
export const findImportedSnapshot = (code, sourceRunId, signal) => httpClient.get(`/v1/stocks/${code}/analysis-snapshots`, { signal, params: { sourceRunId } }).then(unwrap);
export const startDecision = (id, body, key, signal) => post(`analysis-snapshots/${id}/decisions`, body, key, signal);
export const startIntegratedDecision = (id, body, key, signal) => post(`analysis-snapshots/${id}/integrated-decisions`, body, key, signal);
export const getDecisionOutcome = (id, signal) => httpClient.get(`/v1/trade-decisions/${id}/outcome`, { signal }).then(unwrap);
export const getDecisionComparison = (id, signal) => httpClient.get(`/v1/trade-decisions/${id}/comparison`, { signal }).then(unwrap);
export const getDecisionValidity = (id, signal) => httpClient.get(`/v1/trade-decisions/${id}/validity`, { signal }).then(unwrap);
export const getDecisionRecheck = (id, signal) => httpClient.get(`/v1/trade-decisions/${id}/recheck`, { signal }).then(unwrap);
export const getDecisionStatistics = (params, signal) => httpClient.get('/v1/trade-decisions/statistics', { params, signal }).then(unwrap);
export const previewTakeProfit = (id, percentages, signal) => httpClient.post(`/v1/trade-decisions/${id}/take-profit-preview`, { percentages }, { signal }).then(unwrap);
export async function getBrokerAccount(section, key, params, signal) {
  const configured = import.meta.env.VITE_BROKER_API_BASE_URL;
  if (!configured) throw new Error('계좌 조회 전용 HTTPS API 주소가 설정되지 않았습니다.');
  const apiUrl = new URL(configured);
  const secure = url => url.protocol === 'https:' ||
    (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  if (!secure(new URL(window.location.origin)) || !secure(apiUrl) || apiUrl.origin === window.location.origin ||
      apiUrl.username || apiUrl.password || apiUrl.search || apiUrl.hash) {
    throw new Error('계좌 조회는 HTTPS 또는 로컬 연결에서 사용하세요.');
  }
  return httpClient.get(`/v1/broker-account/${section}`, { baseURL: apiUrl.href, params, signal,
    headers: { 'X-Broker-Access-Key': key } }).then(unwrap);
}
export const listDecisionBasketCandidates = (page, signal) => httpClient.get('/v1/trade-decisions/basket/candidates', { params: { page }, signal }).then(unwrap);
export const previewDecisionBasket = (body, signal) => httpClient.post('/v1/trade-decisions/basket/preview', body, { signal }).then(unwrap);
export const startNewsInsights = (id, body, key, signal) => post(`analysis-snapshots/${id}/news-insights`, body, key, signal);
export const getDecision = (id, signal) => httpClient.get(`/v1/trade-decisions/${id}`, { signal }).then(unwrap);
export const reviseDecision = (id, key, signal) => post(`trade-decisions/${id}/revisions`, {}, key, signal);
export const retryDecision = (id, key, signal) => post(`trade-decisions/${id}/retry`, {}, key, signal);
export const listDecisions = (code, signal, page = 0, snapshotId = null) => httpClient.get(`/v1/stocks/${code}/trade-decisions`, { signal, params: { page, size: 20, ...(snapshotId ? { snapshotId } : {}) } }).then(unwrap);

export const isJobPending = job => ['PENDING', 'RUNNING', 'RETRYABLE_FAILED'].includes(job?.status);
export function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException('Aborted', 'AbortError')); return; }
    const abort = () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}
export async function waitForJob(job, read, signal, onProgress = () => {}) {
  let errors = 0;
  while (isJobPending(job)) {
    onProgress(job);
    await pause(Math.min(15000, 2000 * 2 ** errors), signal);
    try { job = await read(job.id, signal); errors = 0; }
    catch (error) { if (signal?.aborted || ++errors >= 4 || error.status === 404) throw error; }
  }
  return job;
}

export function updateDecisionLocation(snapshotId, decisionId = null) {
  const url = new URL(window.location.href);
  url.searchParams.delete('sourceRun'); url.searchParams.delete('stock');
  if (snapshotId) url.searchParams.set('snapshot', snapshotId); else url.searchParams.delete('snapshot');
  if (decisionId) url.searchParams.set('decision', decisionId); else url.searchParams.delete('decision');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
}

// Persist request identity before transmission; a lost response must not generate a fresh key.
export function requestIdentity(storageKey, body, fresh = false) {
  const serialized = JSON.stringify(body);
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (!fresh && saved?.body === serialized && typeof saved.key === 'string') return saved.key;
  } catch { /* Recover corrupted local metadata. */ }
  const key = crypto.randomUUID();
  try { sessionStorage.setItem(storageKey, JSON.stringify({ body: serialized, key })); } catch { /* Component still retains this key for its retries. */ }
  return key;
}

export const decisionErrorMessage = code => ({
  AI_NOT_CONFIGURED: 'AI 모델 또는 API 키가 설정되지 않았습니다. 설정 후 새 평가를 실행하세요.',
  AI_PROVIDER_CHANGED: '이전 AI 공급자로 만든 작업입니다. 현재 설정으로 새 평가를 실행하세요.',
  AI_MODEL_INVALID: 'Gemini 모델 ID 설정을 확인한 후 새 평가를 실행하세요.',
  AI_DAILY_LIMIT: '오늘의 AI 호출 또는 토큰 한도에 도달했습니다.',
  AI_INPUT_TOO_LARGE: '분석 입력이 AI 요청 크기 제한을 초과했습니다.',
  AI_INVALID_RESPONSE: 'AI 응답의 근거 또는 형식을 검증하지 못했습니다. 새 평가가 필요합니다.',
  AI_INCOMPLETE: 'AI 응답이 완성되지 않았습니다. 출력 한도를 확인한 후 새 평가를 실행하세요.',
  AI_REFUSAL: 'AI가 해당 요청에 답변하지 않았습니다.',
  ENGINE_VERSION_CHANGED: '분석 엔진 버전이 바뀌었습니다. 새 분석을 실행하세요.',
  POLICY_VERSION_CHANGED: '판단 정책 버전이 바뀌었습니다. 새 평가를 실행하세요.',
  ATTEMPTS_EXHAUSTED: '재시도 횟수를 초과했습니다. 새 분석 또는 평가가 필요합니다.',
}[code] || `판단을 완료하지 못했습니다. 오류 코드: ${code || 'UNKNOWN'}`);
