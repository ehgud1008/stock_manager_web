import { getAnalysisHistory } from '../../../api/analysisApi';
import useAsyncData from '../../../hooks/useAsyncData';

export default function useAnalysisHistory(stockCode, mode) {
  return useAsyncData(
    () => getAnalysisHistory(stockCode, mode),
    [stockCode, mode],
  );
}
