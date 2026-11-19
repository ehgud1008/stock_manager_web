import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Tab, Tabs } from '@mui/material';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import AnalysisResultPanel from '../stock-analysis/components/AnalysisResultPanel';
import AnalysisNarrativePanel from '../stock-analysis/components/AnalysisNarrativePanel';
import StockChartPanel from '../stock-chart/components/StockChartPanel';
import * as api from '../../api/unifiedAnalysisApi';
import UnifiedAnalysisResults from './UnifiedAnalysisResults';
import UnifiedDecisionTab from '../trade-decision/UnifiedDecisionTab';
const koreanTime = value => value == null ? '—' : new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });

export default function SavedUnifiedDetail({ selection, onClose, latest = false }) {
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  const archived = !!selection.archived;
  const [tab, setTab] = useState(archived ? 'analysis' : 'stage');
  const [aiVisited, setAiVisited] = useState(false);
  const [continuity, setContinuity] = useState(null);
  const contentRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    setContinuity(null);
    const request = latest ? api.analyzeUnifiedStock(selection.code, controller.signal)
      : (archived ? api.getUnifiedArchiveDetail : api.getUnifiedDetail)(selection.runId, selection.code, controller.signal);
    request
      .then(async data => {
        if (controller.signal.aborted) return;
        setState({ data });
        if (latest || archived) return;
        try {
          const history = await api.getUnifiedScoreHistory(selection.runId, selection.code, controller.signal);
          if (controller.signal.aborted) return;
          const selected = history.find(row => row.runId === selection.runId);
          const older = history.find(item => item.priceDate < data.result.priceDate
            && item.engineVersion === selected?.engineVersion
            && item.priceBasis === selected?.priceBasis);
          const previous = older ? await api.getUnifiedDetail(older.runId, selection.code, controller.signal) : null;
          if (!controller.signal.aborted) setContinuity({ history, selected, older, previous });
        } catch {
          if (!controller.signal.aborted) setContinuity({ unavailable: true });
        }
      })
      .catch(error => { if (!controller.signal.aborted) setState({ error: error.message }); });
    return () => controller.abort();
  }, [selection, retry, latest, archived]);
  const tabs = archived ? [['analysis', '종목분석'], ['chart', '차트']]
    : [['stage', '스테이징'], ['analysis', '종목분석'], ['chart', '차트'], ...(!latest ? [['ai', 'AI 판단 · 뉴스']] : [])];
  return <Dialog open fullWidth maxWidth="lg" onClose={onClose} aria-labelledby="unified-detail-title">
    <DialogTitle id="unified-detail-title">{selection.name} · {latest ? '최신 종합분석' : archived ? '통합 전 종목분석 상세' : '종합분석 상세'}</DialogTitle>
    <Tabs value={tab} variant="scrollable" scrollButtons="auto" onChange={(_, value) => { setTab(value); if (value === 'ai') setAiVisited(true); if (contentRef.current) contentRef.current.scrollTop = 0; }} aria-label="종합분석 상세 보기" sx={{ px: 3, borderBottom: 1, borderColor: 'divider' }}>
      {tabs.map(([value, label]) => <Tab key={value} value={value} label={label} id={`unified-detail-${value}-tab`} aria-controls={`unified-detail-${value}-panel`} />)}
    </Tabs>
    <DialogContent ref={contentRef} sx={{ minHeight: 300 }}><Stack gap={2.5}>
      <Alert severity="info">{latest ? '조회 시점에 확보 가능한 최신 자료로 다시 분석합니다. 실제 가격 기준일은 결과에 표시됩니다. 성과검증의 선정 당시 기록과 목표·손절 기준은 변경되지 않습니다.' : '선택한 실행에 저장된 분석 결과입니다. 차트 탭을 선택할 때 가격을 별도로 조회하며, 저장된 분석은 다시 실행하지 않습니다.'}</Alert>
      {state.data?.eod && <Alert severity="info">가격 기준: 키움 KRX 수정 일봉 · 거래일 {state.data.eod.tradeDate}<br />
        마감 자료 확인 기준 {koreanTime(state.data.eod.priceCutoffAt)} · 실제 수집 {koreanTime(state.data.eod.collectedAt)}<br />
        마감 대기 후 두 차례 일봉 이력 일치로 확인했습니다. 제공사 확정 플래그가 없어 이후 정정될 수 있습니다.</Alert>}
      {state.loading && <LinearProgress aria-label="상세 조회 중" />}
      {state.error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry(n => n + 1)}>다시 조회</Button>}>{state.error}</Alert>}
      {tabs.filter(([value]) => value !== 'ai').map(([value]) => <Box key={value} role="tabpanel" id={`unified-detail-${value}-panel`} aria-labelledby={`unified-detail-${value}-tab`} hidden={tab !== value}>
        {tab === value && (archived
          ? value === 'chart' ? <Stack gap={2}>
            <Alert severity="info">차트는 조회 시점 가격이며 진입·목표·손절선은 저장된 분석{selection.priceDate ? ` (가격일 ${selection.priceDate})` : ''} 기준입니다.</Alert>
            <StockChartPanel stockCode={selection.code} analysis={state.data} refreshKey={selection.runId} realData />
          </Stack> : state.data && <Stack gap={2}><AnalysisResultPanel result={state.data} /><AnalysisNarrativePanel reasons={state.data.reasons} warnings={state.data.warnings} /></Stack>
          : state.data && <UnifiedAnalysisResults data={state.data} saved={!latest} section={value} continuity={continuity} />)}
      </Box>)}
      {!archived && !latest && <Box role="tabpanel" id="unified-detail-ai-panel" aria-labelledby="unified-detail-ai-tab" hidden={tab !== 'ai'}>
        {state.data && aiVisited && <UnifiedDecisionTab key={`${selection.runId}:${selection.code}`} runId={selection.runId} stockCode={selection.code} priceDate={state.data.result.priceDate} holdingAnalysis={state.data.holdingAnalysis} />}
      </Box>}
    </Stack></DialogContent>
    <DialogActions>
      {!latest && <Button href={`/analysis/${selection.code}`} target="_blank" rel="noopener noreferrer" endIcon={<OpenInNewRoundedIcon />}>개별 분석 화면 (새 탭)</Button>}
      <Button onClick={onClose}>닫기</Button>
    </DialogActions>
  </Dialog>;
}

