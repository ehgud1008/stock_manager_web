import SavedUnifiedDetail from '../../features/unified-analysis/SavedUnifiedDetail';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, MenuItem,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography, useMediaQuery, useTheme } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import * as api from '../../api/unifiedAnalysisApi';
import SectionCard from '../../components/common/SectionCard';

import { STAGES } from '../../features/screener/screenerModel';

const STATUS = { READY: '실행 대기', WAITING_DATA: '마감 자료 대기', RETRY_WAIT: '확인·재시도 대기', DATA_UNAVAILABLE: '당일 자료 부족', RUNNING: '분석 중', COMPLETED: '완료', COMPLETED_WITH_ERRORS: '일부 확인 실패', FAILED: '실패', INTERRUPTED: '복구 대기', PENDING: '미처리', SKIPPED: '제외' };
const SIGNAL = { BUY: '매수 확정·유지', SELL: '보유 시 매도 확정·유지', BREAKOUT: '돌파', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '돌파 재지지', TREND_BREAKDOWN: '추세 훼손', BREAKOUT_FAILURE: '돌파 실패' };
const SIGNAL_FILTER = { ...SIGNAL, BUY_PRELIMINARY: '매수 예비', SELL_PRELIMINARY: '매도 예비' };
const SIGNAL_STATE = { CONFIRMED: '확정', ACTIVE: '유지', PRELIMINARY: '예비' };
const SETUP = { PULLBACK: '눌림목', BREAKOUT: '돌파', CONTINUATION: '추세 지속', RANGE: '구간', UNCLASSIFIED: '미분류' };
const SORT = { totalScore: '스윙 적합도', entryScore: '진입점수', stage: '스테이지', rewardRisk: '손익비', barsSinceTransition: '전환 후 봉 수', stockCode: '종목 코드' };
const ENTRY = { IN_RANGE: '진입 구간 내', CHASE_BLOCKED: '추격 보류', OUTSIDE_ENTRY_ZONE: '진입 구간 이탈', SCENARIO_UNAVAILABLE: '시나리오 없음', SELL_SIGNAL_CONFLICT: '매도 신호 충돌', NONE: '유효 매수 신호 없음' };
const QUALITY = { COMPLETE: '정상', PARTIAL: '일부 확인 필요', INVALID: '판정 불가' };
const initialFilters = { search: '', market: '', minVolume: '', minTradingAmountEok: '', stage: '', transition: '', allSlopesUp: '', maxBarsSinceTransition: '', signal: '', setup: '', entryStatus: '', quality: '', status: '', minScore: '', maxScore: '', minRewardRisk: '', sort: 'totalScore', ascending: false };
const running = run => ['READY', 'RUNNING', 'WAITING_DATA', 'RETRY_WAIT'].includes(run?.status) || (run?.eod && run.status === 'INTERRUPTED');
const previousClose = run => run?.engineVersion?.startsWith('previous-close/');
const signalLabel = (signal, state) => signal ? [SIGNAL[signal] || signal, SIGNAL_STATE[state]].filter(Boolean).join(' · ') : '—';
const activeBuys = item => (item.activeSignals || '').split('|').filter(signal => ['BREAKOUT', 'PULLBACK_RECOVERY', 'BREAKOUT_RETEST'].includes(signal)).map(signal => SIGNAL[signal]).join(' · ');
const koreanTime = value => value == null ? '—' : new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false });
const number = (value, digits = 1) => value == null ? '—' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits });

export default function UnifiedAnalysisPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [advanced, setAdvanced] = useState(false);
  const [columns, setColumns] = useState(false);
  const [operations, setOperations] = useState(false);
  const [searchParams] = useSearchParams();
  const [archived, setArchived] = useState(() => searchParams.get('archived') === 'true');
  const [priceMode, setPriceMode] = useState('EOD');
  const [runs, setRuns] = useState([]);
  const [runsLoaded, setRunsLoaded] = useState(false);
  const [runId, setRunId] = useState(() => /^[0-9a-f-]{36}$/i.test(searchParams.get('runId') || '') ? searchParams.get('runId') : '');
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
    const request = archived ? api.listUnifiedRuns(controller.signal, true) : api.listUnifiedRuns(controller.signal);
    request.then(data => {
      if (!controller.signal.aborted) { setRuns(data); setRunId(id => id || data[0]?.runId || ''); }
    }).catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setRunsLoaded(true); });
    return () => controller.abort();
  }, [refresh, archived]);
  useEffect(() => {
    if (!runId) return undefined;
    const controller = new AbortController(); let timer;
    setResult(null); setLoading(true); setError('');
    const load = async () => {
      try {
        const params = Object.fromEntries(Object.entries({ ...filters, page, size, ...(archived ? { archived: true } : {}) }).filter(([, value]) => value !== ''));
        const data = await api.getUnifiedItems(runId, params, controller.signal);
        if (controller.signal.aborted) return;
        setResult(data); setLoading(false);
        setRuns(old => old.some(run => run.runId === data.run.runId) ? old.map(run => run.runId === data.run.runId ? data.run : run) : [data.run, ...old]);
        if (!archived && running(data.run)) timer = setTimeout(load, 3000);
      } catch (e) { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } }
    };
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [runId, filters, page, size, refresh, archived]);

  const run = result?.run || runs.find(item => item.runId === runId);
  const activeInMode = mode => !archived && runs.some(item => running(item) && (mode === 'PREVIOUS_CLOSE' ? previousClose(item) : !previousClose(item)));
  const runIsActive = !archived && running(run);
  const selectHistory = () => {
    setRuns([]);
    setRunsLoaded(false);
    setRunId('');
    setResult(null);
    setError('');
    setLoading(false);
    setSelection(null);
    setDraft(initialFilters);
    setFilters(initialFilters);
    setPage(0);
    setArchived(value => !value);
  };
  const selectDetail = item => setSelection({ runId, code: item.stockCode, name: item.stockName, priceDate: item.priceDate, archived });
  const headers = ['종목', ...(!archived ? ['스테이지 / 전환'] : []), '적합도',
    ...(columns ? ['상승 / 진입 / 위험', '시나리오 유형'] : []), '매수 신호', ...(columns ? ['보유 시 매도'] : []),
    '진입 상태', '기준 종가 / 가격일', ...(columns ? ['진입 구간', '목표 1 / 2', '손절가'] : []),
    ...(columns && !archived ? ['거래량 (주)', '거래대금 (억원)'] : []), '손익비', ...(columns ? ['처리 / 데이터'] : []), '상세'];
  const execute = async () => {
    if (actionBusy.current) return;
    actionBusy.current = true; setBusy(true); setError('');
    const action = confirm; setConfirm(null);
    try {
      let next;
      if (action === 'start') {
        if (!requestKey.current || requestKey.current.market !== market || requestKey.current.priceMode !== priceMode)
          requestKey.current = { market, priceMode, key: crypto.randomUUID() };
        next = await api.startUnifiedRun(priceMode === 'EOD' ? { market } : { market, priceMode }, requestKey.current.key);
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
  const sortControls = <>
    <TextField select size="small" label="정렬 기준" value={draft.sort} onChange={e => change('sort', e.target.value)} sx={{ minWidth: 160 }}>
      {Object.entries(SORT).filter(([key]) => !archived || !['stage', 'barsSinceTransition'].includes(key))
        .map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
    </TextField>
    <TextField select size="small" label="정렬 방향" value={String(draft.ascending)} onChange={e => change('ascending', e.target.value === 'true')} sx={{ minWidth: 120 }}>
      <MenuItem value="false">높은 순</MenuItem><MenuItem value="true">낮은 순</MenuItem>
    </TextField>
  </>;

  return <Stack gap={2.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
      <Box><Typography variant="overline" color="primary.main">UNIFIED ANALYSIS</Typography><Typography variant="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' } }} mt={0.5}>종합분석</Typography>
        <Typography color="text.secondary" mt={1}>시장 전체의 추세와 매매 조건을 함께 분석하고, 원하는 종목을 찾아보세요.</Typography></Box>
      <Stack direction="row" gap={1} sx={{ display: { xs: 'none', sm: 'flex' }, alignSelf: 'flex-start', flexShrink: 0 }}>
        <Button color="inherit" component={Link} to={run?.eod ? '/daily-reports?runId=' + encodeURIComponent(runId) : '/daily-reports'}>장 마감 리포트 열기</Button>
        <Button variant="outlined" color="inherit" component={Link} to="/unified-analysis/stock">개별 종합분석</Button>
      </Stack>
    </Stack>
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => setRefresh(n => n + 1)}>다시 조회</Button>}>{error}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'center' }}>
      <TextField select label="분석 실행 이력" value={runs.some(item => item.runId === runId) ? runId : ''} disabled={busy} onChange={e => { setRunId(e.target.value); setPage(0); setSelection(null); }} sx={{ flex: 1, minWidth: 0 }}>
        <MenuItem value="">{runId ? '실행 정보를 불러오는 중' : '저장된 실행 없음'}</MenuItem>
        {runs.map(item => <MenuItem key={item.runId} value={item.runId}>{item.baseDate} · {item.market === 'ALL' ? '전체 시장' : item.market} · {STATUS[item.status]}{previousClose(item) ? ' · 전일까지 완료 일봉' : ''}{archived ? ` · ${item.runId.slice(0, 8)}` : ''}</MenuItem>)}
      </TextField>
      <Stack direction="row" gap={1}>
        <Button color="inherit" startIcon={<RefreshRoundedIcon />} disabled={busy} onClick={() => { setError(''); setRefresh(n => n + 1); }}>새로고침</Button>
        <Button color="inherit" disabled={busy} onClick={selectHistory} aria-pressed={archived}>{archived ? '종합분석 이력 보기' : '통합 전 이력 보기'}</Button>
        {!archived && <Button color="inherit" variant="outlined" onClick={() => setOperations(value => !value)} aria-expanded={operations || (!run && runsLoaded)} aria-controls="analysis-operations">분석 실행·관리</Button>}
      </Stack>
    </Stack>
    {archived && <Alert severity="info">통합 전 전체 종목분석 이력입니다. 저장된 결과와 차트를 조회할 수 있습니다.</Alert>}
    {run && <Box sx={{ borderLeft: '3px solid', borderColor: run.failed ? 'warning.main' : 'primary.main', pl: 2 }}>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Typography variant="body2" fontWeight={650}>선택한 결과는 {run.baseDate} {run.eod ? '거래일' : '기준일'} 기준입니다.</Typography>
        <Chip size="small" label={STATUS[run.status]} color={run.failed ? 'warning' : 'default'} variant="outlined" />
      </Stack>
      <Typography variant="body2" color="text.secondary" mt={0.75}>완료 {number(run.completed, 0)} · 실패 {number(run.failed, 0)} · 제외 {number(run.skipped, 0)}종목. {runIsActive ? '완료된 결과부터 조회할 수 있습니다.' : '완료된 종목의 결과를 조회할 수 있습니다.'}</Typography>
      {runIsActive && <LinearProgress aria-label="분석 진행 중" sx={{ mt: 1 }} />}
      {!archived && !!run.failed && <Button size="small" color="inherit" onClick={() => setOperations(true)}>실패 항목과 실행 상태 확인</Button>}
    </Box>}
    <Box id="analysis-operations" hidden={archived || (!operations && (!!run || !runsLoaded))}>
      <Stack gap={2}>
    <SectionCard title="시장 전체 분석" caption={priceMode === 'EOD'
      ? '한국시간 20시 이후 분석 가능한 거래일의 마감 자료를 확인합니다. 기준일 시가 2,000원 이하 종목은 시장 통계에 포함합니다.'
      : '전일까지의 완료 일봉을 사용합니다. 장 마감 분석이 진행 중이면 먼저 처리될 때까지 대기합니다.'}>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField select size="small" label="분석 대상 시장" value={market} disabled={busy} onChange={e => setMarket(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="ALL">코스피 + 코스닥</MenuItem><MenuItem value="KOSPI">코스피</MenuItem><MenuItem value="KOSDAQ">코스닥</MenuItem>
        </TextField>
        <TextField select size="small" label="분석 가격 기준" value={priceMode} disabled={busy} onChange={e => setPriceMode(e.target.value)} sx={{ minWidth: 210 }}>
          <MenuItem value="EOD">장 마감 자료 확인</MenuItem>
          <MenuItem value="PREVIOUS_CLOSE">전일까지 완료 일봉</MenuItem>
        </TextField>
        <Button variant="outlined" startIcon={<PlayArrowRoundedIcon />} disabled={busy || activeInMode(priceMode)} onClick={() => setConfirm('start')}>전체 종합분석 실행</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>완료된 종목부터 결과를 확인할 수 있습니다. 브라우저를 닫아도 서버에서 계속 실행됩니다.</Typography>
    </SectionCard>
    {run && <SectionCard title="실행 현황" action={<Chip size="small" label={STATUS[run.status]} variant="outlined" color={run.failed ? 'warning' : running(run) ? 'primary' : 'default'} />}>
      <Grid container spacing={2}>{[['대상 종목', run.total], ['분석 완료', run.completed], ['실패', run.failed], ['제외', run.skipped]].map(([label, value]) => <Grid key={label} size={3}>
        <Typography color="text.secondary" variant="caption">{label}</Typography><Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 650 }}>{number(value, 0)}</Typography>
      </Grid>)}</Grid>
      <LinearProgress sx={{ my: 2, height: 5, borderRadius: 4 }} aria-label="종합분석 진행률" variant={run.total ? 'determinate' : running(run) ? 'indeterminate' : 'determinate'} value={run.total ? 100 * (run.completed + run.failed + run.skipped + (run.eod?.dataUnavailable || 0)) / run.total : 0} />
      {run.eod && <Stack gap={0.5} sx={{ mb: 1.5 }}>
        <Typography variant="body2">가격 기준: 키움 KRX 수정 일봉 · 자료 확인 기준 {koreanTime(run.eod.priceCutoffEpoch)}</Typography>
        <Typography variant="body2">미처리 {number(run.eod.pending, 0)} · 확인·재시도 대기 {number(run.eod.retrying, 0)} · 당일 자료 부족 {number(run.eod.dataUnavailable, 0)}</Typography>
        <Typography variant="caption">수집 가능 시각 {koreanTime(run.eod.eligibleEpoch)} · 실행 기한 {koreanTime(run.eod.deadlineEpoch)} · 자동 복구 {number(run.eod.recoveryCount, 0)}회</Typography>
        {run.eod.recoveryCount > 0 && running(run) && <Typography variant="body2">저장된 목록에서 완료 종목을 보존하며 이어서 처리하고 있습니다.</Typography>}
      </Stack>}
      <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center"><Typography variant="caption" color="text.secondary">기준일 {run.baseDate} · {run.engineVersion} · 실행 {run.runId}</Typography>
        {!runIsActive && run.status !== 'COMPLETED' && <Button size="small" disabled={busy || activeInMode(previousClose(run) ? 'PREVIOUS_CLOSE' : 'EOD')} onClick={() => setConfirm('resume')}>실패·미처리 재개</Button>}
        {runIsActive && <Button size="small" disabled={busy} onClick={() => setConfirm('recover')}>중단 상태 정리</Button>}
      </Stack>
      {run.errorCode && <Alert severity={running(run) ? 'info' : 'warning'} sx={{ mt: 1 }}>{running(run) ? '자료 확인 또는 자동 복구를 기다리고 있습니다.' : '실행 결과를 확인하세요. 재시도 가능한 항목이 없거나 실행 기한이 지나면 새 분석이 필요합니다.'} ({run.errorCode})</Alert>}
    </SectionCard>}
      </Stack>
    </Box>
    <SectionCard title="종목 찾기" caption={archived ? "종목명·시장·매매 신호로 저장된 결과를 검색하세요." : "종목명·시장·스테이지로 저장된 결과를 검색하세요."}>
      <Box component="form" onSubmit={e => { e.preventDefault(); setFilters({ ...draft }); setPage(0); }}><Stack gap={1.5}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
          <TextField size="small" label="종목명·코드" value={draft.search} onChange={e => change('search', e.target.value)} sx={{ flexGrow: 1, minWidth: 180 }} />
          {!mobile && select('market', '결과 시장', { KOSPI: '코스피', KOSDAQ: '코스닥' })}
          {!archived && !mobile && select('stage', '스테이지', Object.fromEntries(STAGES.map(item => [item.id, `S${item.id} · ${item.label}`])))}
        </Stack>
        <Accordion expanded={advanced} onChange={(_, value) => setAdvanced(value)} disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} aria-controls="advanced-search" id="advanced-search-heading"><Typography variant="body2">상세 검색 조건{Object.keys(draft).some(key => key !== 'search' && (mobile || !['market', 'stage', 'sort', 'ascending'].includes(key)) && draft[key] !== initialFilters[key]) ? ' · 설정 있음' : ''}</Typography></AccordionSummary>
          <AccordionDetails id="advanced-search" sx={{ px: 0 }}><Stack gap={1.5}>
        {mobile && <Stack gap={1.5}>
          {select('market', '결과 시장', { KOSPI: '코스피', KOSDAQ: '코스닥' })}
          {!archived && select('stage', '스테이지', Object.fromEntries(STAGES.map(item => [item.id, `S${item.id} · ${item.label}`])))}
          {sortControls}
        </Stack>}
        <Stack direction="row" gap={1.5} flexWrap="wrap">
          {!archived && <><TextField size="small" type="number" label="최소 거래량 (주)" value={draft.minVolume} onChange={e => change('minVolume', e.target.value)} slotProps={{ htmlInput: { min: 0, step: 1, max: Number.MAX_SAFE_INTEGER } }} sx={{ width: { xs: '100%', sm: 180 } }} />
          <TextField size="small" type="number" label="최소 거래대금 (억원)" value={draft.minTradingAmountEok} onChange={e => change('minTradingAmountEok', e.target.value)} slotProps={{ htmlInput: { min: 0, step: 0.000001 } }} sx={{ width: { xs: '100%', sm: 180 } }} /></>}
          {select('signal', '매매 신호', SIGNAL_FILTER)}
          {select('setup', '시나리오 유형', SETUP)}
          {select('entryStatus', '진입 상태', ENTRY)}
          {!archived && select('transition', '전환 방향', { FORWARD: '순행', REVERSE: '역행', SKIPPED: '단계 건너뜀', UNKNOWN: '미확인' })}
          {!archived && select('allSlopesUp', 'EMA 기울기', { true: '모두 상승', false: '모두 상승 아님' })}
        </Stack>
        {!archived && <Typography variant="caption" color="text.secondary">거래량·거래대금은 종목별 분석 가격일 기준입니다. 입력값 이상을 검색하며, 값이 미저장·미확인인 기존 결과는 해당 최소값 조건에서 제외됩니다. 결과 시장은 선택한 실행 안에서만 검색합니다.</Typography>}
        <Stack direction="row" gap={1.5} flexWrap="wrap">
          {['minScore', 'maxScore', 'minRewardRisk', 'maxBarsSinceTransition'].slice(0, archived ? 3 : 4).map((key, i) => <TextField key={key} size="small" type="number" label={['최소 점수', '최대 점수', '최소 손익비', '전환 후 최대 봉 수'][i]} value={draft[key]} onChange={e => change(key, e.target.value)} sx={{ width: 140, flexGrow: 1 }} slotProps={{ htmlInput: { min: 0, max: i < 2 ? 100 : undefined, step: i === 3 ? 1 : 'any' } }} />)}
          {select('status', '처리 상태', { COMPLETED: '완료', FAILED: '실패', PENDING: '미처리', RETRY_WAIT: '확인·재시도 대기', DATA_UNAVAILABLE: '당일 자료 부족', SKIPPED: '제외' })}
          {select('quality', '데이터 상태', QUALITY)}
        </Stack>
          </Stack></AccordionDetails>
        </Accordion>
        <Stack direction="row" gap={1.5} flexWrap="wrap">
          {!mobile && sortControls}
          <Box flex={1} /><Button color="inherit" onClick={() => { setDraft(initialFilters); setFilters(initialFilters); setPage(0); }}>초기화</Button>
          <Button type="submit" variant="contained" startIcon={<SearchRoundedIcon />} disabled={!runId}>검색</Button>
        </Stack>
      </Stack></Box>
    </SectionCard>
    <SectionCard title="종합분석 결과" caption={run ? `${run.baseDate} 기준 · 검색 결과 ${number(result?.totalElements, 0)}종목` : '저장된 실행을 선택하거나 새 분석을 시작하세요.'} action={<Button color="inherit" size="small" onClick={() => setColumns(value => !value)} aria-pressed={columns}>{columns ? '핵심 항목만' : '전체 항목 보기'}</Button>}>
      {loading && <LinearProgress aria-label="결과 조회 중" />}
      {mobile ? <Stack component="ul" aria-label="종합분석 결과 목록" sx={{ listStyle: 'none', p: 0, m: 0 }} gap={1.5}>
        {(result?.content || []).map(item => <Box component="li" key={item.stockCode} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={1}>
            <Box><Typography fontWeight={650}>{item.stockName}</Typography><Typography variant="caption" color="text.secondary">{item.stockCode} · {item.market}</Typography></Box>
            <Chip size="small" label={`적합도 ${number(item.totalScore)}`} variant="outlined" />
          </Stack>
          <Typography variant="body2" mt={1.5}>{!archived && `${item.stage ? `S${item.stage} · ${STAGES[item.stage - 1]?.label || '미판정'}` : '스테이지 미판정'} · `}{item.buySignal ? signalLabel(item.buySignal, item.buyState) : '매수 신호 없음'}</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>{ENTRY[item.entryStatus] || '진입 상태 미확인'} · 손익비 {item.rewardRisk == null ? '미확인' : `${number(item.rewardRisk, 2)}배`}</Typography>
          {columns && <Stack gap={0.5} mt={1}>
            <Typography variant="body2">상승 / 진입 / 위험 {number(item.riseScore)} / {number(item.entryScore)} / {number(item.riskScore)}</Typography>
            <Typography variant="body2">시나리오 {SETUP[item.setupType] || '—'} · 매도 {signalLabel(item.sellSignal, item.sellState)}</Typography>
            {activeBuys(item) && <Typography variant="caption">확정·유지 매수 {activeBuys(item)}</Typography>}
            <Typography variant="body2">진입 {number(item.entryFrom, 0)} ~ {number(item.entryTo, 0)} · 손절 {number(item.stopPrice, 0)}</Typography>
            <Typography variant="body2">목표 1 / 2 {number(item.targetOne, 0)} / {number(item.targetTwo, 0)}</Typography>
            {!archived && <Typography variant="body2">거래량 {number(item.volume, 0)}주 · 거래대금 {number(item.tradingAmountMillionWon == null ? null : item.tradingAmountMillionWon / 100, 6)}억원</Typography>}
          </Stack>}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1}>
            <Box><Typography variant="body2">기준 종가 {number(item.currentPrice, 0)}원</Typography><Typography variant="caption" color="text.secondary">{item.priceDate || '가격일 미확인'} · {STATUS[item.status]} · {QUALITY[item.quality] || '자료 확인 필요'}</Typography></Box>
            <Button disabled={item.status !== 'COMPLETED'} onClick={() => selectDetail(item)} aria-label={`${item.stockName} 상세`}>상세</Button>
          </Stack>
        </Box>)}
        {!loading && !result?.content?.length && <Typography component="li" color="text.secondary" sx={{ py: 3 }}>{error ? '결과를 조회하지 못했습니다. 다시 조회하세요.' : runId ? '조건에 해당하는 결과가 없습니다.' : '저장된 실행을 선택하거나 새 분석을 시작하세요.'}</Typography>}
      </Stack> : <>
      <TableContainer tabIndex={0} aria-label="종합분석 결과 표 가로 스크롤"><Table size="small" aria-label="종합분석 결과 목록" sx={{ minWidth: columns ? 1960 : 940, '& th, & td': { px: 1.5, py: 1.75 }, '& td': { fontVariantNumeric: 'tabular-nums' } }}><TableHead><TableRow>
        {headers.map(label => <TableCell key={label} sx={{ whiteSpace: 'nowrap' }}>{label}</TableCell>)}
      </TableRow></TableHead><TableBody>
        {(result?.content || []).map(item => { const stage = STAGES[(item.stage || 0) - 1]; return <TableRow key={item.stockCode} hover>
          <TableCell sx={{ minWidth: 160, whiteSpace: 'nowrap' }}><Typography variant="body2" fontWeight={650}>{item.stockName}</Typography><Typography variant="caption" color="text.secondary">{item.stockCode} · {item.market}</Typography>{!columns && (item.status !== 'COMPLETED' || item.quality !== 'COMPLETE') && <Typography variant="caption" display="block" color="warning.main">{item.status !== 'COMPLETED' ? STATUS[item.status] : QUALITY[item.quality] || '자료 확인 필요'}</Typography>}</TableCell>
          {!archived && <TableCell><Chip size="small" variant="outlined" label={stage ? `S${stage.id} · ${stage.label}` : '미판정'} sx={{ color: stage?.color }} /><Typography variant="caption" display="block" mt={0.5}>{item.previousStage == null ? '—' : `S${item.previousStage}`} → {item.stage == null ? '—' : `S${item.stage}`}{item.barsSinceTransition == null ? '' : ` · ${item.barsSinceTransition}봉`}</Typography></TableCell>}
          <TableCell><Typography fontWeight={700}>{number(item.totalScore)}</Typography></TableCell>
          {columns && <><TableCell>{number(item.riseScore)} / {number(item.entryScore)} / {number(item.riskScore)}</TableCell><TableCell>{SETUP[item.setupType] || '—'}</TableCell></>}
          <TableCell>{signalLabel(item.buySignal, item.buyState)}{columns && <Typography variant="caption" display="block">{activeBuys(item)}</Typography>}</TableCell>
          {columns && <TableCell>{signalLabel(item.sellSignal, item.sellState)}</TableCell>}
          <TableCell>{ENTRY[item.entryStatus] || '—'}</TableCell>
          <TableCell>{number(item.currentPrice, 0)}<Typography variant="caption" display="block" color="text.secondary">{item.priceDate || '—'}</Typography></TableCell>
          {columns && <>
            <TableCell>{number(item.entryFrom, 0)} ~ {number(item.entryTo, 0)}</TableCell>
            <TableCell>{number(item.targetOne, 0)} / {number(item.targetTwo, 0)}</TableCell>
            <TableCell>{number(item.stopPrice, 0)}</TableCell>
          </>}
          {columns && !archived && <TableCell>{item.volume == null ? '미저장·미확인' : number(item.volume, 0)}</TableCell>}
          {columns && !archived && <TableCell>{item.tradingAmountMillionWon == null ? '미저장·미확인' : number(item.tradingAmountMillionWon / 100, 6)}</TableCell>}
          <TableCell>{item.rewardRisk == null ? '—' : `${number(item.rewardRisk, 2)}배`}</TableCell>
          {columns && <TableCell>{STATUS[item.status]}<Typography variant="caption" display="block" color="text.secondary">{QUALITY[item.quality] || ({ STOCK_STATE_EXCLUDED: '거래 상태 제외', COLLECTION_OR_ANALYSIS_FAILED: '수집·분석 실패' }[item.errorCode]) || '—'}</Typography></TableCell>}
          <TableCell><Button size="small" disabled={item.status !== 'COMPLETED'} onClick={() => selectDetail(item)}>상세</Button></TableCell>
        </TableRow>; })}
        {!loading && !result?.content?.length && <TableRow><TableCell colSpan={headers.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>{error ? '결과를 조회하지 못했습니다. 오류를 확인한 뒤 새로고침하세요.' : runId ? '조건에 해당하는 결과가 없습니다.' : archived ? '저장된 통합 전 실행이 없습니다.' : '전체 종합분석을 실행하면 종목별 결과가 여기에 표시됩니다.'}</TableCell></TableRow>}
      </TableBody></Table></TableContainer>
      </>}
      <TablePagination component="div" count={result?.totalElements || 0} page={page} rowsPerPage={size} rowsPerPageOptions={[20, 50, 100]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={e => { setSize(Number(e.target.value)); setPage(0); }} labelRowsPerPage="표시 개수" labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${number(count, 0)}종목`} getItemAriaLabel={type => type === 'next' ? '다음 페이지' : '이전 페이지'} sx={{ '& .MuiTablePagination-toolbar': { flexWrap: 'wrap', px: 0 }, '& .MuiTablePagination-selectLabel': { display: { xs: 'none', sm: 'block' } } }} />
    </SectionCard>
    {mobile && <Stack direction="row" gap={1} flexWrap="wrap"><Button color="inherit" component={Link} to={run?.eod ? '/daily-reports?runId=' + encodeURIComponent(runId) : '/daily-reports'}>장 마감 리포트 열기</Button><Button color="inherit" component={Link} to="/unified-analysis/stock">개별 종합분석</Button></Stack>}
    {confirm && <Dialog open onClose={() => setConfirm(null)}><DialogTitle>{confirm === 'start' ? '시장 전체 종합분석 실행' : confirm === 'resume' ? '종합분석 재개' : '중단 상태 정리'}</DialogTitle>
      <DialogContent>{confirm === 'start' ? `${market === 'ALL' ? '코스피·코스닥' : market} 일반주식의 추세·점수·신호를 함께 분석합니다. 가격 기준은 ${priceMode === 'EOD' ? '장 마감 자료 확인' : '전일까지 완료 일봉'}입니다. 수집에 시간이 걸리며 서버에서 계속 실행됩니다.` : confirm === 'resume' ? '실패·미처리 종목만 다시 분석합니다. 완료 결과와 대상 목록·기준일은 유지합니다.' : '서버 재시작 후 남은 실행 상태를 정리합니다. 실제 실행 중인 작업은 정리할 수 없습니다.'}</DialogContent>
      <DialogActions><Button onClick={() => setConfirm(null)}>취소</Button><Button onClick={execute}>확인</Button></DialogActions>
    </Dialog>}
    {selection && <SavedUnifiedDetail key={`${selection.runId}:${selection.code}`} selection={selection} onClose={() => setSelection(null)} />}
  </Stack>;
}
