import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, MenuItem,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as api from '../../api/unifiedAnalysisApi';
import SectionCard from '../../components/common/SectionCard';
import UnifiedAnalysisResults from '../../features/unified-analysis/UnifiedAnalysisResults';
import { STAGES } from '../../features/screener/screenerModel';

const STATUS = { READY: '실행 대기', RUNNING: '분석 중', COMPLETED: '완료', COMPLETED_WITH_ERRORS: '일부 실패', FAILED: '실패', INTERRUPTED: '중단', PENDING: '미처리', SKIPPED: '제외' };
const SIGNAL = { BUY: '매수 확정·유지', SELL: '보유 시 매도 확정·유지', BREAKOUT: '돌파', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '돌파 재지지', TREND_BREAKDOWN: '추세 훼손', BREAKOUT_FAILURE: '돌파 실패' };
const ENTRY = { IN_RANGE: '진입 구간 내', CHASE_BLOCKED: '추격 보류', OUTSIDE_ENTRY_ZONE: '진입 구간 이탈', SCENARIO_UNAVAILABLE: '시나리오 없음', SELL_SIGNAL_CONFLICT: '매도 신호 충돌', NONE: '유효 매수 신호 없음' };
const QUALITY = { COMPLETE: '정상', PARTIAL: '일부 확인 필요', INVALID: '판정 불가' };
const initialFilters = { search: '', stage: '', transition: '', allSlopesUp: '', maxBarsSinceTransition: '', signal: '', entryStatus: '', quality: '', status: '', minScore: '', maxScore: '', minRewardRisk: '', sort: 'totalScore', ascending: false };
const running = run => ['READY', 'RUNNING'].includes(run?.status);
const number = (value, digits = 1) => value == null ? '—' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits });

function SavedDetail({ selection, onClose }) {
  const [state, setState] = useState({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    api.getUnifiedDetail(selection.runId, selection.code, controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ data }); })
      .catch(error => { if (!controller.signal.aborted) setState({ error: error.message }); });
    return () => controller.abort();
  }, [selection, retry]);
  return <Dialog open fullWidth maxWidth="lg" onClose={onClose}>
    <DialogTitle>{selection.name} · 종합분석 상세</DialogTitle>
    <DialogContent><Stack gap={2.5}>
      <Alert severity="info">선택한 실행에 저장된 분석 결과입니다. 차트 가격은 별도로 조회하며, 저장된 분석은 다시 실행하지 않습니다.</Alert>
      {state.loading && <LinearProgress aria-label="상세 조회 중" />}
      {state.error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRetry(n => n + 1)}>다시 조회</Button>}>{state.error}</Alert>}
      {state.data && <UnifiedAnalysisResults data={state.data} saved />}
    </Stack></DialogContent>
    <DialogActions><Button onClick={onClose}>닫기</Button></DialogActions>
  </Dialog>;
}

export default function UnifiedAnalysisPage() {
  const [runs, setRuns] = useState([]);
  const [runId, setRunId] = useState('');
  const [market, setMarket] = useState('ALL');
  const [draft, setDraft] = useState(initialFilters);
  const [filters, setFilters] = useState(initialFilters);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selection, setSelection] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const requestKey = useRef(null);
  const actionBusy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.listUnifiedRuns(controller.signal).then(data => {
      if (!controller.signal.aborted) { setRuns(data); setRunId(id => id || data[0]?.runId || ''); }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    if (!runId) return undefined;
    const controller = new AbortController(); let timer;
    setResult(null); setLoading(true); setError('');
    const load = async () => {
      try {
        const params = Object.fromEntries(Object.entries({ ...filters, page, size }).filter(([, value]) => value !== ''));
        const data = await api.getUnifiedItems(runId, params, controller.signal);
        if (controller.signal.aborted) return;
        setResult(data); setLoading(false);
        setRuns(old => old.map(run => run.runId === data.run.runId ? data.run : run));
        if (running(data.run)) timer = setTimeout(load, 3000);
      } catch (e) { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } }
    };
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [runId, filters, page, size, refresh]);

  const run = result?.run || runs.find(item => item.runId === runId);
  const activeRun = runs.some(running) || running(run);
  const execute = async () => {
    if (actionBusy.current) return;
    actionBusy.current = true; setBusy(true); setError('');
    const action = confirm; setConfirm(null);
    try {
      let next;
      if (action === 'start') {
        if (!requestKey.current || requestKey.current.market !== market) requestKey.current = { market, key: crypto.randomUUID() };
        next = await api.startUnifiedRun({ market }, requestKey.current.key);
        requestKey.current = null;
      } else next = await (action === 'resume' ? api.resumeUnifiedRun(runId) : api.recoverUnifiedRun(runId));
      if (!mounted.current) return;
      setRuns(old => [next, ...old.filter(item => item.runId !== next.runId)]);
      setRunId(next.runId); setPage(0); setSelection(null); setRefresh(n => n + 1);
    } catch (e) { if (mounted.current) setError(e.message); }
    finally { actionBusy.current = false; if (mounted.current) setBusy(false); }
  };
  const change = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const select = (key, label, options) => <TextField select size="small" label={label} value={draft[key]} onChange={e => change(key, e.target.value)} sx={{ minWidth: 150, flexGrow: 1 }}>
    <MenuItem value="">전체</MenuItem>{Object.entries(options).map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}
  </TextField>;

  return <Stack gap={2.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
      <Box><Typography variant="overline" color="primary.main">UNIFIED ANALYSIS</Typography><Typography variant="h1" mt={0.5}>종합분석</Typography>
        <Typography color="text.secondary" mt={1}>시장 전체의 추세와 매매 조건을 함께 분석하고, 원하는 종목을 찾아보세요.</Typography></Box>
      <Button component={Link} to="/unified-analysis/stock" sx={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>개별 종합분석</Button>
    </Stack>
    <SectionCard title="시장 전체 분석" caption="전일까지의 확정 일봉을 기준으로 국내 일반주식을 분석합니다.">
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField select size="small" label="분석 대상 시장" value={market} disabled={busy} onChange={e => setMarket(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="ALL">코스피 + 코스닥</MenuItem><MenuItem value="KOSPI">코스피</MenuItem><MenuItem value="KOSDAQ">코스닥</MenuItem>
        </TextField>
        <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} disabled={busy || activeRun} onClick={() => setConfirm('start')}>전체 종합분석 실행</Button>
        <Button startIcon={<RefreshRoundedIcon />} disabled={busy} onClick={() => { setError(''); setRefresh(n => n + 1); }}>새로고침</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>완료된 종목부터 결과를 확인할 수 있습니다. 브라우저를 닫아도 서버에서 계속 실행됩니다.</Typography>
    </SectionCard>
    {error && <Alert severity="error">{error}</Alert>}
    <TextField select label="분석 실행 이력" value={runId} disabled={busy} onChange={e => { setRunId(e.target.value); setPage(0); setSelection(null); }}>
      {!runs.length && <MenuItem value="">저장된 실행 없음</MenuItem>}
      {runs.map(item => <MenuItem key={item.runId} value={item.runId}>{item.baseDate} · {item.market === 'ALL' ? '전체 시장' : item.market} · {STATUS[item.status]} · {item.runId.slice(0, 8)}</MenuItem>)}
    </TextField>
    {run && <SectionCard title="실행 현황" action={<Chip size="small" label={STATUS[run.status]} variant="outlined" color={run.failed ? 'warning' : running(run) ? 'primary' : 'default'} />}>
      <Grid container spacing={2}>{[['대상 종목', run.total], ['분석 완료', run.completed], ['실패', run.failed], ['제외', run.skipped]].map(([label, value]) => <Grid key={label} size={3}>
        <Typography color="text.secondary" variant="caption">{label}</Typography><Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 650 }}>{number(value, 0)}</Typography>
      </Grid>)}</Grid>
      <LinearProgress sx={{ my: 2, height: 5, borderRadius: 4 }} aria-label="종합분석 진행률" variant={run.total ? 'determinate' : running(run) ? 'indeterminate' : 'determinate'} value={run.total ? 100 * (run.completed + run.failed + run.skipped) / run.total : 0} />
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center"><Typography variant="caption" color="text.secondary">기준일 {run.baseDate} · 실제 가격일은 종목별로 확인하세요.</Typography>
        {!running(run) && run.status !== 'COMPLETED' && <Button size="small" disabled={busy || activeRun} onClick={() => setConfirm('resume')}>실패·미처리 재개</Button>}
        {running(run) && <Button size="small" disabled={busy} onClick={() => setConfirm('recover')}>중단 상태 정리</Button>}
      </Stack>
      {run.errorCode && <Alert severity="warning" sx={{ mt: 1 }}>실행이 중단되었습니다. 실패·미처리 재개를 이용하거나 새로 실행하세요. ({run.errorCode})</Alert>}
    </SectionCard>}
    <SectionCard title="결과 검색" caption="스테이지와 점수·신호 조건을 함께 적용합니다.">
      <Box component="form" onSubmit={e => { e.preventDefault(); setFilters({ ...draft }); setPage(0); }}><Stack gap={1.5}>
        <Stack direction="row" gap={1.5} flexWrap="wrap">
          <TextField size="small" label="종목명·코드" value={draft.search} onChange={e => change('search', e.target.value)} sx={{ flexGrow: 1, minWidth: 180 }} />
          {select('stage', '스테이지', Object.fromEntries(STAGES.map(item => [item.id, `S${item.id} · ${item.label}`])))}
          {select('signal', '매매 신호', SIGNAL)}
          {select('entryStatus', '진입 상태', ENTRY)}
          {select('transition', '전환 방향', { FORWARD: '순행', REVERSE: '역행', SKIPPED: '단계 건너뜀', UNKNOWN: '미확인' })}
          {select('allSlopesUp', 'EMA 기울기', { true: '모두 상승', false: '모두 상승 아님' })}
        </Stack>
        <Stack direction="row" gap={1.5} flexWrap="wrap">
          {['minScore', 'maxScore', 'minRewardRisk', 'maxBarsSinceTransition'].map((key, i) => <TextField key={key} size="small" type="number" label={['최소 점수', '최대 점수', '최소 손익비', '전환 후 최대 봉 수'][i]} value={draft[key]} onChange={e => change(key, e.target.value)} sx={{ width: 140, flexGrow: 1 }} slotProps={{ htmlInput: { min: 0, max: i < 2 ? 100 : undefined, step: i === 3 ? 1 : 'any' } }} />)}
          {select('status', '처리 상태', { COMPLETED: '완료', FAILED: '실패', PENDING: '미처리', SKIPPED: '제외' })}
          {select('quality', '데이터 상태', QUALITY)}
        </Stack>
        <Stack direction="row" gap={1.5} flexWrap="wrap">
          <TextField select size="small" label="정렬 기준" value={draft.sort} onChange={e => change('sort', e.target.value)} sx={{ minWidth: 160 }}>
            {Object.entries({ totalScore: '스윙 적합도', stage: '스테이지', rewardRisk: '손익비', barsSinceTransition: '전환 후 봉 수', stockCode: '종목 코드' }).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="정렬 방향" value={String(draft.ascending)} onChange={e => change('ascending', e.target.value === 'true')} sx={{ minWidth: 120 }}><MenuItem value="false">높은 순</MenuItem><MenuItem value="true">낮은 순</MenuItem></TextField>
          <Box flex={1} /><Button onClick={() => { setDraft(initialFilters); setFilters(initialFilters); setPage(0); }}>초기화</Button>
          <Button type="submit" variant="outlined" startIcon={<SearchRoundedIcon />} disabled={!runId}>검색</Button>
        </Stack>
      </Stack></Box>
    </SectionCard>
    <SectionCard title="종합분석 결과" caption={run ? `${run.baseDate} 기준 · 검색 결과 ${number(result?.totalElements || 0, 0)}종목` : '저장된 실행을 선택하거나 새 분석을 시작하세요.'}>
      {loading && <LinearProgress aria-label="결과 조회 중" />}
      <TableContainer><Table size="small" aria-label="종합분석 결과 목록" sx={{ minWidth: 1080 }}><TableHead><TableRow>
        {['종목', '스테이지 / 전환', '적합도', '매수 신호', '보유 시 매도', '진입 상태', '기준 종가 / 가격일', '손익비', '처리 / 데이터', '상세'].map(label => <TableCell key={label} sx={{ whiteSpace: 'nowrap' }}>{label}</TableCell>)}
      </TableRow></TableHead><TableBody>
        {(result?.content || []).map(item => { const stage = STAGES[(item.stage || 0) - 1]; return <TableRow key={item.stockCode} hover>
          <TableCell><Typography variant="body2" fontWeight={650}>{item.stockName}</Typography><Typography variant="caption" color="text.secondary">{item.stockCode} · {item.market}</Typography></TableCell>
          <TableCell><Chip size="small" variant="outlined" label={stage ? `S${stage.id} · ${stage.label}` : '미판정'} sx={{ color: stage?.color }} /><Typography variant="caption" display="block" mt={0.5}>{item.previousStage == null ? '—' : `S${item.previousStage}`} → {item.stage == null ? '—' : `S${item.stage}`}{item.barsSinceTransition == null ? '' : ` · ${item.barsSinceTransition}봉`}</Typography></TableCell>
          <TableCell><Typography fontWeight={700}>{number(item.totalScore)}</Typography></TableCell>
          <TableCell>{SIGNAL[item.buySignal] || '—'}</TableCell><TableCell>{SIGNAL[item.sellSignal] || '—'}</TableCell>
          <TableCell>{ENTRY[item.entryStatus] || '—'}</TableCell>
          <TableCell>{number(item.currentPrice, 0)}<Typography variant="caption" display="block" color="text.secondary">{item.priceDate || '—'}</Typography></TableCell>
          <TableCell>{item.rewardRisk == null ? '—' : `${number(item.rewardRisk, 2)}배`}</TableCell>
          <TableCell>{STATUS[item.status]}<Typography variant="caption" display="block" color="text.secondary">{QUALITY[item.quality] || ({ STOCK_STATE_EXCLUDED: '거래 상태 제외', COLLECTION_OR_ANALYSIS_FAILED: '수집·분석 실패' }[item.errorCode]) || '—'}</Typography></TableCell>
          <TableCell><Button size="small" disabled={item.status !== 'COMPLETED'} onClick={() => setSelection({ runId, code: item.stockCode, name: item.stockName })}>상세</Button></TableCell>
        </TableRow>; })}
        {!loading && !result?.content?.length && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 6, color: 'text.secondary' }}>{error ? '결과를 조회하지 못했습니다. 오류를 확인한 뒤 새로고침하세요.' : runId ? '조건에 해당하는 결과가 없습니다.' : '전체 종합분석을 실행하면 종목별 결과가 여기에 표시됩니다.'}</TableCell></TableRow>}
      </TableBody></Table></TableContainer>
      <TablePagination component="div" count={result?.totalElements || 0} page={page} rowsPerPage={size} rowsPerPageOptions={[20, 50, 100]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={e => { setSize(Number(e.target.value)); setPage(0); }} labelRowsPerPage="표시 개수" />
    </SectionCard>
    {confirm && <Dialog open onClose={() => setConfirm(null)}><DialogTitle>{confirm === 'start' ? '시장 전체 종합분석 실행' : confirm === 'resume' ? '종합분석 재개' : '중단 상태 정리'}</DialogTitle>
      <DialogContent>{confirm === 'start' ? `${market === 'ALL' ? '코스피·코스닥' : market} 일반주식의 추세·점수·신호를 함께 분석합니다. 수집에 시간이 걸리며 서버에서 계속 실행됩니다.` : confirm === 'resume' ? '실패·미처리 종목만 다시 분석합니다. 완료 결과와 대상 목록·기준일은 유지합니다.' : '서버 재시작 후 남은 실행 상태를 정리합니다. 실제 실행 중인 작업은 정리할 수 없습니다.'}</DialogContent>
      <DialogActions><Button onClick={() => setConfirm(null)}>취소</Button><Button onClick={execute}>확인</Button></DialogActions>
    </Dialog>}
    {selection && <SavedDetail selection={selection} onClose={() => setSelection(null)} />}
  </Stack>;
}
