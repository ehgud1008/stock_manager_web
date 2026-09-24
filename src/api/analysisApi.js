import { completedAnalysisMock } from '../mocks/analysisMockData';
import { validateAnalysisResponse } from '../utils/validateAnalysisResponse';
import httpClient from './httpClient';

const useMocks = import.meta.env.VITE_USE_MOCKS === 'true';

const normalizeAnalysis = (data) => validateAnalysisResponse({
  ...data,
  timeframeScores: data?.timeframeScores || { daily: null, weekly: null, monthly: null },
  targets: data?.targets || [],
  factors: data?.factors || [],
  reasons: data?.reasons || [],
  warnings: data?.warnings || [],
});

const normalizeEnvelope = (payload) => ({
  ...payload,
  data: normalizeAnalysis(payload.data),
});

// Share only active requests (including StrictMode remounts); never cache completed analysis.
const liveRequests = new Map();
export const analyzeStockLive = (stockCode, request) => {
  const key = JSON.stringify([stockCode, request.analysisMode, request.baseDate, request.position ?? null]);
  if (liveRequests.has(key)) return liveRequests.get(key);
  const pending = httpClient.post(`/v1/stocks/${stockCode}/analysis`, {
    ...request,
    forceRecalculate: true,
  }, { timeout: 120000 }).then(({ data: payload }) => {
    if (!payload?.success) throw new Error(payload?.message || '종목 분석에 실패했습니다.');
    const result = normalizeEnvelope(payload);
    if (result.data.stockCode !== stockCode || result.data.analysisMode !== request.analysisMode
      || result.data.baseDate !== request.baseDate || result.data.status !== 'COMPLETED') {
      throw new Error('요청한 종목의 완료된 분석 결과가 아닙니다.');
    }
    return result;
  }).finally(() => liveRequests.delete(key));
  liveRequests.set(key, pending);
  return pending;
};

export const analyzeStock = async (stockCode, request) => {
  if (useMocks) {
    return {
      success: true,
      code: 'SUCCESS',
      message: '화면용 분석 결과',
      data: normalizeAnalysis({
        ...completedAnalysisMock,
        stockCode,
        analysisMode: request.analysisMode,
        baseDate: request.baseDate || completedAnalysisMock.baseDate,
      }),
    };
  }
  const response = await httpClient.post(`/v1/stocks/${stockCode}/analysis`, request);
  return normalizeEnvelope(response.data);
};

export const getStockAnalysis = async (stockCode, mode = 'SWING') => {
  if (useMocks) {
    const data = { ...completedAnalysisMock, stockCode, analysisMode: mode };
    return { success: true, code: 'SUCCESS', message: '화면용 목업 응답', data: normalizeAnalysis(data) };
  }
  const response = await httpClient.get(`/v1/stocks/${stockCode}/analysis/latest`, {
    params: { mode },
  });
  return normalizeEnvelope(response.data);
};

export const getAnalysisRun = async (analysisRunId) => {
  if (useMocks) {
    return { success: true, code: 'SUCCESS', data: normalizeAnalysis(completedAnalysisMock) };
  }
  const response = await httpClient.get(`/v1/analysis-runs/${analysisRunId}`);
  return normalizeEnvelope(response.data);
};

export const getAnalysisHistory = async (stockCode, mode = 'SWING', page = 0, size = 20) => {
  if (useMocks) {
    return {
      success: true,
      code: 'SUCCESS',
      data: {
        content: [normalizeAnalysis({ ...completedAnalysisMock, stockCode, analysisMode: mode })],
        page: 0,
        size,
        totalElements: 1,
        totalPages: 1,
      },
    };
  }
  const response = await httpClient.get(`/v1/stocks/${stockCode}/analysis/history`, {
    params: { mode, page, size },
  });
  const payload = response.data;
  return {
    ...payload,
    data: {
      ...payload.data,
      content: (payload.data?.content || []).map(normalizeAnalysis),
    },
  };
};
