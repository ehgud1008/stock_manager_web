import { useCallback, useEffect, useRef, useState } from 'react';
import { analyzeStock, getAnalysisRun, getStockAnalysis } from '../../../api/analysisApi';

export default function useStockAnalysis(stockCode, mode) {
  const requestSequence = useRef(0);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const runRequest = useCallback(async (loader, loadingStatus = 'loading') => {
    const sequence = ++requestSequence.current;
    setState((current) => ({ ...current, status: loadingStatus, error: null }));
    try {
      const result = await loader();
      if (requestSequence.current === sequence) {
        setState({ status: result?.data ? 'success' : 'empty', data: result?.data ?? null, error: null });
      }
      return result?.data;
    } catch (error) {
      if (requestSequence.current === sequence) {
        if (error.status === 404) {
          setState({ status: 'empty', data: null, error: null });
        } else {
          setState({ status: 'error', data: null, error });
        }
      }
      if (error.status !== 404) throw error;
      return null;
    }
  }, []);

  const reload = useCallback(
    () => runRequest(() => getStockAnalysis(stockCode, mode)),
    [mode, runRequest, stockCode],
  );

  const execute = useCallback(
    (request) => runRequest(() => analyzeStock(stockCode, request), 'running'),
    [runRequest, stockCode],
  );

  const loadRun = useCallback(
    (analysisRunId) => runRequest(() => getAnalysisRun(analysisRunId)),
    [runRequest],
  );

  useEffect(() => {
    reload().catch(() => {});
  }, [reload]);

  return { ...state, reload, execute, loadRun };
}
