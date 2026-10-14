import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useCallback, useEffect, useRef, useState } from 'react';
import SectionCard from '../../components/common/SectionCard';
import * as api from '../../api/tradeDecisionApi';
import IndependentReviewView from './IndependentReviewView';
import NewsInsightView from './NewsInsightView';

export default function NewsInsightsPanel({ snapshotId, stockCode, aiConfigured, embedded = false, prepareSnapshot }) {
  const snapshot = useRef(snapshotId); const active = useRef(null); const pending = useRef(null);
  const [currentSnapshot, setCurrentSnapshot] = useState(snapshotId);
  const [days, setDays] = useState(14); const [sector, setSector] = useState('');
  const [job, setJob] = useState(null); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [history, setHistory] = useState({ items: [], hasMore: false }); const [page, setPage] = useState(0); const [historyError, setHistoryError] = useState('');
  const refresh = useCallback(async signal => {
    if (!snapshot.current) return;
    try { const result = await api.listDecisions(stockCode, signal, page, snapshot.current); if (!signal.aborted) {setHistory(result);setHistoryError('');} }
    catch (e) { if (!signal.aborted) setHistoryError(e.message); }
  }, [stockCode, page]);
  useEffect(() => { const c = new AbortController(); refresh(c.signal); return () => c.abort(); }, [refresh, currentSnapshot]);
  const track = useCallback(async (initial, signal) => {
    if (initial.snapshotId !== snapshot.current) throw new Error('다른 종합분석에 속한 리포트입니다. 해당 분석에서 확인하세요.');
    if (!signal.aborted) setJob(initial);
    if (!embedded) api.updateDecisionLocation(snapshot.current, initial.id);
    const done = await api.waitForJob(initial, api.getDecision, signal, value => {if (!signal.aborted) setJob(value);});
    if (!signal.aborted) {setJob(done);await refresh(signal);}
  }, [embedded, refresh]);
  useEffect(() => {
    if (!snapshotId) return;
    const c = new AbortController();active.current = c;setBusy(true);
    const id = embedded ? null : new URLSearchParams(window.location.search).get('decision');
    const restored = id ? api.getDecision(id, c.signal) : api.listDecisions(stockCode, c.signal, 0, snapshotId).then(list => list.items[0] ? api.getDecision(list.items[0].id, c.signal) : null);
    restored.then(saved => {
      if (!saved || c.signal.aborted) return;
      if (saved.context?.lookbackDays) {setDays(saved.context.lookbackDays);setSector(saved.context.sectorQuery || '');}
      return track(saved, c.signal);
    }).catch(e => { if (!c.signal.aborted) setError(e.message); }).finally(() => {if (active.current === c) {active.current = null;setBusy(false);}});
    return () => {c.abort();if (active.current === c) active.current = null;};
    // A history page change must not restart restoration or the active job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId]);
  useEffect(() => () => active.current?.abort(), []);
  const execute = async id => {
    if (active.current) return;
    const c = new AbortController();active.current = c;setBusy(true);setError('');
    try {
      let initial;
      if (id) initial = await api.getDecision(id, c.signal);
      else {
        if (!snapshot.current) {const prepared = await prepareSnapshot(c.signal);if (c.signal.aborted) return;snapshot.current = prepared.id;setCurrentSnapshot(prepared.id);}
        const body = { lookbackDays: days, sectorQuery: sector.trim() };
        const signature = JSON.stringify({ snapshotId: snapshot.current, body });
        if (pending.current?.signature !== signature) pending.current = { signature, key: api.requestIdentity(`news-insights:${snapshot.current}`, body) };
        initial = await api.startNewsInsights(snapshot.current, body, pending.current.key, c.signal);
      }
      if (!c.signal.aborted) {
        await track(initial, c.signal);
        if (initial.context?.lookbackDays) {setDays(initial.context.lookbackDays);setSector(initial.context.sectorQuery || '');}
      }
    } catch (e) {if (!c.signal.aborted) setError(e.message);}
    finally {if (active.current === c) {active.current = null;setBusy(false);}}
  };
  const fresh = () => {pending.current = null;try {sessionStorage.removeItem(`news-insights:${snapshot.current}`);} catch { /* Storage may be unavailable. */ }execute();};
  const result = job?.result;
  return <SectionCard title="뉴스·업황 인사이트" caption="뉴스·공시·관련 업황에서 엔진 분석에 추가되는 근거를 찾습니다. 가격과 기술적 시나리오는 엔진 결과를 사용합니다.">
    <Stack gap={2}>
      {!aiConfigured && <Alert severity="info">AI 모델 또는 API 키가 설정되지 않았습니다. 저장된 리포트는 조회할 수 있습니다.</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField select label="자료 검색 기간" value={days} onChange={e => setDays(Number(e.target.value))} disabled={busy} sx={{ minWidth: 150 }}>{[7,14,30].map(value => <MenuItem key={value} value={value}>최근 {value}일</MenuItem>)}</TextField>
        <TextField label="관련 업종 검색어 (선택)" placeholder="예: 반도체" helperText="비워두면 종목명으로 관련 업황을 검색합니다." value={sector} onChange={e => setSector(e.target.value)} disabled={busy} inputProps={{ maxLength: 50 }} sx={{ flex: 1 }} />
        <Button variant="contained" disabled={busy || !aiConfigured || !/^[\p{L}\p{N} &·/()-]*$/u.test(sector)} onClick={() => execute()}>뉴스·업황 분석</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary">버튼을 눌렀을 때 외부 자료를 수집하고 AI가 해석합니다. 같은 요청은 저장 결과를 재사용하며, 최신 자료 재수집은 별도로 실행합니다. 제목·검색 요약만 확보한 경우 원문 확인 필요 상태로 표시합니다.</Typography>
      {busy && <Stack role="status" gap={1}><LinearProgress /><Typography variant="body2">자료 수집·분석 작업을 확인하고 있습니다. 창을 닫아도 서버 작업은 유지됩니다.</Typography></Stack>}
      {error && <Alert severity="error">{error}</Alert>}
      {job?.status === 'FAILED' && <Alert severity="error">{api.decisionErrorMessage(job.errorCode)}</Alert>}
      {job?.status === 'RETRYABLE_FAILED' && <Alert severity="warning">일시적 오류로 재시도를 기다립니다. 저장된 수집 자료를 재사용합니다.</Alert>}
      {result?.generationMode === 'NEWS_INSIGHTS' && <>
        {(result.context.lookbackDays !== days || result.context.sectorQuery !== sector.trim()) && <Alert severity="info">검색 조건이 바뀌었습니다. 아래는 기존 조건으로 저장된 리포트입니다.</Alert>}
        <NewsInsightView result={result} />
      </>}
      {result && result.generationMode !== 'NEWS_INSIGHTS' && <Accordion disableGutters><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography>이전 AI 매매 판단 결과</Typography></AccordionSummary><AccordionDetails>
        <Alert severity="info">기존 결과를 이력으로 보존했습니다. 새 분석부터 뉴스·업황 근거를 보강합니다.</Alert>
        {result.aiReview?.independent ? <IndependentReviewView result={result} /> : <Typography>저장된 판단: {({BUY:'매수 검토',SELL:'매도 검토',HOLD:'보유 유지',WAIT:'신규 진입 대기'})[result.finalAction] || '판단 보류'}</Typography>}
      </AccordionDetails></Accordion>}
      {job && ['SUCCEEDED','FAILED'].includes(job.status) && <Button variant="outlined" disabled={busy || !aiConfigured} onClick={fresh}>최신 자료 재수집·새 분석</Button>}
      <Accordion disableGutters><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography>저장된 분석 이력</Typography></AccordionSummary><AccordionDetails><Stack gap={1}>
        {historyError && <Alert severity="warning">이력 조회 실패: {historyError}</Alert>}
        {!history.items.length && <Typography variant="body2">저장된 분석 이력이 없습니다.</Typography>}
        {history.items.map(item => <Stack key={item.id} direction="row" gap={1} justifyContent="space-between"><Typography variant="body2">{new Date(item.createdAt).toLocaleString('ko-KR')} · {item.action ? '이전 매매 판단' : '분석 리포트'} · {({SUCCEEDED:'완료',FAILED:'실패',RETRYABLE_FAILED:'재시도 대기'})[item.status] || '진행 중'}</Typography><Button disabled={busy} onClick={() => execute(item.id)}>조회</Button></Stack>)}
        <Stack direction="row"><Button disabled={busy || page === 0} onClick={() => setPage(value => value - 1)}>이전</Button><Button disabled={busy || !history.hasMore} onClick={() => setPage(value => value + 1)}>다음</Button></Stack>
      </Stack></AccordionDetails></Accordion>
    </Stack>
  </SectionCard>;
}
