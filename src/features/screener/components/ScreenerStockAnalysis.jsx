import { useEffect, useState } from 'react';
import { Alert, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { analyzeStockLive } from '../../../api/analysisApi';
import SectionCard from '../../../components/common/SectionCard';
import AnalysisResultPanel from '../../stock-analysis/components/AnalysisResultPanel';

const todayInSeoul = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export default function ScreenerStockAnalysis({ stockCode, mode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState(null);
  const key = `${stockCode}:${mode}:${attempt}`;
  useEffect(() => {
    let active = true;
    setState({ key, status: 'loading' });
    analyzeStockLive(stockCode, {
      analysisMode: mode, baseDate: todayInSeoul(), forceRecalculate: true,
    }).then(({ data }) => {
      if (active) setState({ key, status: 'success', data });
    }).catch((error) => {
      if (active) setState({ key, status: 'error', message: error.message });
    });
    // The server keeps executing after close; don't issue duplicate POSTs on remount.
    return () => { active = false; };
  }, [stockCode, mode, key]);
  const current = state?.key === key ? state : null;
  const loading = !current || current.status === 'loading';

  return <SectionCard >
    <Stack gap={2}>
      {loading && <><Typography role="status" variant="body2">종목을 분석하고 있습니다. 데이터 수집에 시간이 걸릴 수 있습니다.</Typography><LinearProgress aria-label="종목 분석 진행" /></>}
      {current?.status === 'error' && <Alert severity="error">{current.message || '분석 결과를 불러오지 못했습니다.'} 차트와 저장된 스크리너 결과는 별도로 확인할 수 있습니다.</Alert>}
      {current?.status === 'success' && <>
        <Typography variant="caption" color="text.secondary">분석 기준일 (KST) {current.data.baseDate} · {mode === 'SWING' ? '스윙' : '단타'} · 실행 ID {current.data.analysisRunId}</Typography>
        <AnalysisResultPanel result={current.data} />
      </>}
      <Button variant="outlined" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>{current?.status === 'error' ? '종목 분석 다시 시도' : '종목 다시 분석'}</Button>
    </Stack>
  </SectionCard>;
}
