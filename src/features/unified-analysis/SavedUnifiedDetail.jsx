import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Tab, Tabs } from '@mui/material';
import * as api from '../../api/unifiedAnalysisApi';
import UnifiedAnalysisResults from './UnifiedAnalysisResults';
import UnifiedDecisionTab from '../trade-decision/UnifiedDecisionTab';
const koreanTime = value => value == null ? '—' : new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });

export default function SavedUnifiedDetail({ selection, onClose, latest = false }) {
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState('stage');
  const [aiVisited, setAiVisited] = useState(false);
  const contentRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    (latest ? api.analyzeUnifiedStock(selection.code, controller.signal) : api.getUnifiedDetail(selection.runId, selection.code, controller.signal))
      .then(data => { if (!controller.signal.aborted) setState({ data }); })
      .catch(error => { if (!controller.signal.aborted) setState({ error: error.message }); });
    return () => controller.abort();
  }, [selection, retry, latest]);
  return <Dialog open fullWidth maxWidth="lg" onClose={onClose} aria-labelledby="unified-detail-title">
    <DialogTitle id="unified-detail-title">{selection.name} · {latest ? '최신 종합분석' : '종합분석 상세'}</DialogTitle>
    <Tabs value={tab} variant="scrollable" scrollButtons="auto" onChange={(_, value) => { setTab(value); if (value === 'ai') setAiVisited(true); if (contentRef.current) contentRef.current.scrollTop = 0; }} aria-label="종합분석 상세 보기" sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
      {[['stage', '스테이징'], ['analysis', '종목분석'], ['chart', '차트'], ['ai', '뉴스·업황']].filter(([value]) => !latest || value !== 'ai').map(([value, label]) => <Tab key={value} value={value} label={label} id={`unified-detail-${value}-tab`} aria-controls={`unified-detail-${value}-panel`} />)}
    </Tabs>
    <DialogContent ref={contentRef} sx={{ minHeight: 300 }}><Stack gap={2.5}>
      <Alert severity="info">{latest ? '조회 시점에 확보 가능한 최신 자료로 다시 분석합니다. 실제 가격 기준일은 결과에 표시됩니다. 성과검증의 선정 당시 기록과 목표·손절 기준은 변경되지 않습니다.' : '선택한 실행에 저장된 분석 결과입니다. 차트 탭을 선택할 때 가격을 별도로 조회하며, 저장된 분석은 다시 실행하지 않습니다.'}</Alert>
      {state.data?.eod && <Alert severity="info">가격 기준: 키움 KRX 수정 일봉 · 거래일 {state.data.eod.tradeDate}<br />
        마감 자료 확인 기준 {koreanTime(state.data.eod.priceCutoffAt)} · 실제 수집 {koreanTime(state.data.eod.collectedAt)}<br />
        마감 대기 후 두 차례 일봉 이력 일치로 확인했습니다. 제공사 확정 플래그가 없어 이후 정정될 수 있습니다.</Alert>}
      {state.loading && <LinearProgress aria-label="상세 조회 중" />}
      {state.error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry(n => n + 1)}>다시 조회</Button>}>{state.error}</Alert>}
      {['stage', 'analysis', 'chart'].map(value => <Box key={value} role="tabpanel" id={`unified-detail-${value}-panel`} aria-labelledby={`unified-detail-${value}-tab`} hidden={tab !== value}>
        {state.data && tab === value && <UnifiedAnalysisResults data={state.data} saved={!latest} section={value} />}
      </Box>)}
      <Box role="tabpanel" id="unified-detail-ai-panel" aria-labelledby="unified-detail-ai-tab" hidden={tab !== 'ai'}>
        {!latest && state.data && aiVisited && <UnifiedDecisionTab key={`${selection.runId}:${selection.code}`} runId={selection.runId} stockCode={selection.code} priceDate={state.data.result.priceDate} />}
      </Box>
    </Stack></DialogContent>
    <DialogActions>
      <Button onClick={onClose}>닫기</Button>
    </DialogActions>
  </Dialog>;
}

