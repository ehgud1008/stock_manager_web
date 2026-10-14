import { Alert, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import * as api from '../../api/tradeDecisionApi';
import NewsInsightsPanel from './NewsInsightsPanel';

export default function UnifiedDecisionTab({ runId, stockCode, priceDate }) {
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  const sourceSnapshot = useRef(null);
  const snapshotKey = useRef(null);
  useEffect(() => {
    const c = new AbortController(); setState({ loading: true });
    const load = async () => {
      try {
        const capabilities = await api.getDecisionCapabilities(c.signal);
        if (c.signal.aborted) return;
        const snapshot = capabilities.enabled ? await api.findImportedSnapshot(stockCode, runId, c.signal) : null;
        if (!c.signal.aborted) { sourceSnapshot.current = snapshot; setState({ capabilities, snapshot }); }
      } catch (e) { if (!c.signal.aborted) setState({ error: e.message }); }
    };
    load(); return () => c.abort();
  }, [runId, stockCode, retry]);

  const prepare = async signal => {
    let job = sourceSnapshot.current;
    if (!job || job.status === 'FAILED') {
      const source = { source: 'UNIFIED_RUN_ITEM', runId };
      if (!snapshotKey.current) snapshotKey.current = api.requestIdentity(`popup-snapshot:${runId}:${stockCode}`, { ...source, retryOf: job?.id || null });
      job = await api.startSnapshot(stockCode, snapshotKey.current, signal, source);
      sourceSnapshot.current = job;
    }
    job = await api.waitForJob(job, api.getSnapshot, signal);
    sourceSnapshot.current = job;
    if (job.status !== 'SUCCEEDED') { snapshotKey.current = null; throw new Error(api.decisionErrorMessage(job.errorCode)); }
    return job;
  };
  return <Stack gap={2}>
    <Typography variant="body2" color="text.secondary">저장된 엔진 분석의 가격일은 {priceDate}입니다. 뉴스·업황은 요청 시점의 자료를 보강하며, 탭을 열기만 하면 기존 이력을 조회합니다.</Typography>
    {state.loading && <LinearProgress aria-label="AI 판단 조회 중" />}
    {state.error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry(n => n + 1)}>다시 조회</Button>}>{state.error}</Alert>}
    {state.capabilities && !state.capabilities.enabled && <Alert severity="info">뉴스·업황 인사이트는 서버의 저장 분석 기능을 활성화한 후 사용할 수 있습니다.</Alert>}
    {state.capabilities?.enabled && <NewsInsightsPanel key={`${runId}:${stockCode}`} embedded stockCode={stockCode}
      snapshotId={state.snapshot?.status === 'SUCCEEDED' ? state.snapshot.id : null}
      prepareSnapshot={prepare} aiConfigured={state.capabilities.aiConfigured} />}
  </Stack>;
}
