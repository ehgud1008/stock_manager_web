import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, InputAdornment, LinearProgress, MenuItem, Paper, Stack, Switch, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import TimelineRoundedIcon from '@mui/icons-material/TimelineRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import ScreenerTable from '../../features/screener/components/ScreenerTable';
import StageOverview from '../../features/screener/components/StageOverview';
import ScreenerDetailLoader from '../../features/screener/components/ScreenerDetailLoader';
import { DEFAULT_FILTERS, STAGES, watchKey } from '../../features/screener/screenerModel';
import useScreener, { isActiveRun } from '../../features/screener/useScreener';
import { adaptScreenerSummary, amountToMillionWon, formatTime, STATUS_LABELS } from '../../features/screener/screenerAdapter';
import ScreenerRunDialog from '../../features/screener/components/ScreenerRunDialog';

const STORAGE_KEY = 'stockscope.screener.watchlist.v1';
function readWatched() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.filter((key) => typeof key === 'string') : [];
  } catch { return []; }
}

export default function ScreenerPage() {
  const [mode, setMode] = useState('SWING');
  const [interval, setInterval] = useState('5');
  const [filtersByMode, setFiltersByMode] = useState({ SWING: { ...DEFAULT_FILTERS }, SHORT_TERM: { ...DEFAULT_FILTERS } });
  return <ScreenerScreen key={`${mode}:${interval}`} {...{ mode, setMode, interval, setInterval, filtersByMode, setFiltersByMode }} />;
}

function ScreenerScreen({ mode, setMode, interval, setInterval, filtersByMode, setFiltersByMode }) {
  const [watched, setWatched] = useState(readWatched);
  const [storageError, setStorageError] = useState(false);
  const [selected, setSelected] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [runDialog, setRunDialog] = useState(false);
  const [recoverDialog, setRecoverDialog] = useState(false);
  const filters = filtersByMode[mode];
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [sort, setSort] = useState({ field: 'barsInStage', direction: 'asc' });
  const [search, setSearch] = useState(filters.search);
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(filters.search); setPage(0); }, 300);
    return () => clearTimeout(timer);
  }, [filters.search]);
  const query = {
    page, size, sort: sort.field === 'tradingAmount100m' ? 'tradingAmount' : sort.field, descending: sort.direction === 'desc',
    market: filters.market, stage: filters.stage === 'ALL' ? null : Number(filters.stage),
    transitionFilter: filters.transition, slope: filters.slope, middleLongGap: filters.gap === 'ALL' ? null : filters.gap,
    search, minTradingAmountMillionWon: amountToMillionWon(filters.minAmount),
    watchOnly: filters.watchOnly, watchedCodes: watched.filter((key) => key.startsWith(`${mode}:`)).map((key) => key.slice(mode.length + 1)).sort(),
  };
  const api = useScreener(mode, mode === 'SWING' ? 0 : Number(interval), query);
  useEffect(() => {
    if (!api.loading && api.data && page > 0 && page * size >= api.data.totalElements) setPage(0);
  }, [api.loading, api.data, page, size]);
  const snapshot = useMemo(() => ({
    rows: (api.data?.content || []).map((item) => adaptScreenerSummary(item, api.run?.config)),
    asOf: formatTime(api.run?.cutoff), unit: mode === 'SWING' ? '거래일' : '봉',
    timeframe: mode === 'SWING' ? '일봉' : `${interval}분봉`,
  }), [api.data, api.run, mode, interval]);
  const running = isActiveRun(api.run);
  const processed = (api.run?.completedCount || 0) + (api.run?.failedCount || 0) + (api.run?.skippedCount || 0);
  const update = (key, value) => { setPage(0); setFiltersByMode((previous) => ({ ...previous, [mode]: { ...previous[mode], [key]: value } })); };
  const reset = () => { setPage(0); setFiltersByMode((previous) => ({ ...previous, [mode]: { ...DEFAULT_FILTERS } })); };
  const rows = snapshot.rows;
  const recentCount = api.data?.recentCount ?? 0;
  const watchCount = api.data?.watchCount ?? 0;
  const filterCount = Object.keys(DEFAULT_FILTERS).filter((key) => filters[key] !== DEFAULT_FILTERS[key]).length;
  const toggleWatch = (stockCode) => {
    const key = watchKey(mode, stockCode);
    const next = watched.includes(key) ? watched.filter((value) => value !== key) : [...watched, key];
    setWatched(next);
    if (filters.watchOnly) setPage(0);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageError(false); }
    catch { setStorageError(true); }
  };
  const selectField = (label, key, options) => <TextField select fullWidth label={label} value={filters[key]} onChange={(event) => update(key, event.target.value)}>{options.map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}</TextField>;

  return <>
    <PageHeader eyebrow="MARKET SCREENER / 03" title="종목 스크리너" description="폭넓게 관찰하고, EMA 대순환으로 좁혀보세요. 종목의 현재 위치와 변화의 방향을 함께 살펴봅니다." chip="엔진 결과" />
    <Paper variant="outlined" sx={{ mb: 2.5, px: { xs: 1.5, md: 2.5 }, borderRadius: 2.5 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
        <Tabs value={mode} onChange={(_, value) => { setMode(value); setSelected(null); }} aria-label="스크리너 모드" sx={{ '& .MuiTab-root': { minHeight: 66, px: { xs: 1.5, sm: 2.5 }, fontSize: 15 } }}>
          <Tab value="SWING" id="swing-tab" aria-controls="screener-panel" icon={<TimelineRoundedIcon fontSize="small" />} iconPosition="start" label="스윙 스크리너" />
          <Tab value="SHORT_TERM" id="short-term-tab" aria-controls="screener-panel" icon={<BoltRoundedIcon fontSize="small" />} iconPosition="start" label="단타 스크리너" />
        </Tabs>
        <Stack direction="row" alignItems="center" gap={1} sx={{ pb: { xs: 1.5, sm: 0 } }}>
          {mode === 'SHORT_TERM' ? <ToggleButtonGroup exclusive value={interval} size="small" onChange={(_, value) => { if (value) { setInterval(value); setSelected(null); } }} aria-label="단타 봉 주기">{['1', '3', '5', '15'].map((value) => <ToggleButton key={value} value={value} sx={{ px: 1.5 }}>{value}분</ToggleButton>)}</ToggleButtonGroup> : <Chip size="small" label="확정 일봉 · 익일 반영" variant="outlined" />}
          <Chip size="small" label={`EMA ${api.run?.config?.shortPeriod || 5} · ${api.run?.config?.middlePeriod || 20} · ${api.run?.config?.longPeriod || 40}`} sx={{ bgcolor: 'rgba(139,218,99,.08)', color: 'primary.light' }} />
        </Stack>
      </Stack>
    </Paper>
    <Box role="tabpanel" id="screener-panel" aria-labelledby={mode === 'SWING' ? 'swing-tab' : 'short-term-tab'}>
      <Alert severity="info" variant="outlined" sx={{ mb: 2.5, borderColor: 'rgba(113,167,255,.2)', bgcolor: 'rgba(113,167,255,.035)', '& .MuiAlert-message': { width: '100%' } }}>
        <Stack gap={1.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={1}>
            <Box><Typography variant="body2">{api.run ? STATUS_LABELS[api.run.status] || api.run.status : api.loading ? '저장된 실행을 확인하고 있습니다.' : '저장된 실행 결과가 없습니다.'}</Typography>
              <Typography variant="caption" color="text.secondary">분석 기준: {snapshot.asOf} KST · 실시간 시세가 아닌 확정 봉 스냅샷</Typography></Box>
            <Stack direction="row" gap={1} flexWrap="wrap">
              <Button size="small" onClick={() => { setSelected(null); api.refresh(); }} disabled={api.loading || api.submitting}>결과 조회</Button>
              <Button size="small" onClick={() => { setSelected(null); api.latest(); }} disabled={api.loading || api.submitting || running}>최신 완료 결과</Button>
              {api.run && ['FAILED', 'INTERRUPTED', 'COMPLETED_WITH_ERRORS'].includes(api.run.status) && <Button size="small" onClick={() => { setSelected(null); api.resume(); }} disabled={api.submitting || api.loading}>실패·중단 재개</Button>}
              {running && <Button size="small" color="warning" onClick={() => setRecoverDialog(true)} disabled={api.submitting}>중단 상태 정리</Button>}
              <Button size="small" variant="contained" onClick={() => setRunDialog(true)} disabled={running || api.submitting || api.loading}>엔진 실행</Button>
            </Stack>
          </Stack>
          {api.run && <Typography variant="caption">대상 {api.run.totalCount} · 분석 {api.run.completedCount} · 실패 {api.run.failedCount} · 제외 {api.run.skippedCount} / {api.run.request.market} {api.run.request.stockCodes?.length ? `지정 ${api.run.request.stockCodes.length}종목` : '시장 전체'} · 실행 ID {api.run.runId}{api.run.errorCode ? ` · ${api.run.errorCode}` : ''}</Typography>}
          {!api.error && (api.loading || running) && <LinearProgress aria-label="스크리너 진행률" variant={running && api.run.totalCount > 0 ? 'determinate' : 'indeterminate'} value={api.run?.totalCount ? Math.min(100, processed / api.run.totalCount * 100) : 0} />}
          {running && <Typography variant="caption">{processed} / {api.run.totalCount || '목록 수집 중'} 처리 · {api.error ? '자동 상태 확인이 멈췄습니다. 결과 조회로 다시 확인해 주세요.' : '2.5초마다 상태 확인. 완료 후 결과를 불러옵니다.'} 서버 재시작 후 진행이 멈췄다면 중단 상태 정리를 눌러 주세요.</Typography>}
        </Stack>
      </Alert>
      {api.error && !runDialog && <Alert severity="error" sx={{ mb: 2 }}>{api.error} 서버 실행·스크리너 테이블 설치 상태를 확인해 주세요. 기존 결과가 보이면 위 분석 기준의 저장 결과입니다.</Alert>}
      {api.data?.storageMode === 'MEMORY' && <Alert severity="warning" sx={{ mb: 2 }}>메모리 저장 모드입니다. 서버 재시작 시 실행 결과가 사라집니다.</Alert>}
      {snapshot.rows.some((row) => row.status !== 'ANALYZED' || row.quality !== 'VALID' || !row.sourceComplete) && <Alert severity="warning" sx={{ mb: 2 }}>실패·제외·EMA 경계·표본 부족 또는 조회 범위가 부족한 종목이 포함되어 있습니다. 종목 상세에서 상태와 경고를 확인하세요.</Alert>}
      {storageError && <Alert severity="warning" sx={{ mb: 2 }}>브라우저 저장소를 사용할 수 없어 관찰종목은 현재 화면에서만 유지됩니다.</Alert>}
      <Stack direction="row" flexWrap="wrap" gap={{ xs: 2.5, md: 5 }} mb={3} px={0.5}>
        {[['관찰 대상', api.run?.totalCount || snapshot.rows.length, '종목'], [`최근 3${snapshot.unit} 내 전환`, recentCount, '종목'], ['나의 관찰', watchCount, '종목']].map(([label, count, suffix]) => <Box key={label}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontSize={25} fontWeight={600} mt={0.3}>{String(count).padStart(2, '0')}<Box component="span" fontSize={12} fontWeight={400} color="text.secondary" ml={1}>{suffix}</Box></Typography></Box>)}
        <Box sx={{ ml: { md: 'auto' }, alignSelf: 'center' }}><Typography variant="caption" color="text.secondary">{mode === 'SWING' ? '확정 일봉의 추세 구조를 관찰합니다.' : `${interval}분봉 확정 시점의 단기 구조를 관찰합니다.`}</Typography><Typography variant="caption" color="text.secondary" display="block">점수·매수 신호는 정책 확정 후 제공됩니다.</Typography></Box>
      </Stack>
      <SectionCard title="이동평균선 대순환" caption="스테이지를 선택해 해당 국면의 종목을 살펴보세요. 숫자는 다른 필터를 적용한 실행 결과의 종목 수입니다." action={<Button size="small" color="inherit" startIcon={<HelpOutlineRoundedIcon />} onClick={() => setGuideOpen(true)} sx={{ whiteSpace: 'nowrap' }}>판정 안내</Button>}>
        <StageOverview counts={api.data?.stageCounts} selected={filters.stage} onSelect={(value) => update('stage', value)} />
        <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1} mt={1.5}><Typography variant="caption" color="text.secondary">순행 1 → 2 → 3 → 4 → 5 → 6 → 1 · 역행도 관찰합니다.</Typography><Stack direction="row" gap={1.5}>{[['단기 5', '#8BDA63'], ['중기 20', '#71A7FF'], ['장기 40', '#D5A3EB']].map(([label, color]) => <Typography key={label} variant="caption" color="text.secondary"><Box component="span" sx={{ color, mr: 0.5 }}>━</Box>{label}</Typography>)}</Stack></Stack>
      </SectionCard>
      <Box mt={2.5}><SectionCard title="탐색 조건" caption="조건을 바꾸면 결과에 바로 반영됩니다. 스윙과 단타의 필터는 따로 유지됩니다." action={<Button size="small" color="inherit" startIcon={<RestartAltRoundedIcon />} onClick={reset} sx={{ whiteSpace: 'nowrap' }}>초기화{filterCount ? ` (${filterCount})` : ''}</Button>}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: '1fr 1.4fr 1.2fr 1fr 1fr' }, gap: 1.5 }}>
          {selectField('시장', 'market', [['ALL', '전체 시장'], ['KOSPI', 'KOSPI'], ['KOSDAQ', 'KOSDAQ']])}
          {selectField('스테이지 전환', 'transition', [['ALL', '전체 전환'], ['RECENT', `최근 3${snapshot.unit} 내 전환`], ['5_6', `5 → 6 · 최근 3${snapshot.unit}`], ['6_1', `6 → 1 · 최근 3${snapshot.unit}`], ['HOLD_1', `Stage 1 · 4${snapshot.unit} 이상 유지`], ['REVERSE', '최근 전환이 역행']])}
          {selectField('EMA 기울기', 'slope', [['ALL', '전체 방향'], ['ALL_UP', '세 선 모두 상승'], ['MID_LONG_UP', '중·장기선 상승']])}
          {selectField('중·장기 거리', 'gap', [['ALL', '확대·축소 전체'], ['EXPANDING', '거리 확대'], ['CONTRACTING', '거리 축소']])}
          <TextField label="최소 거래대금" type="number" value={filters.minAmount} placeholder="제한 없음" onChange={(event) => { const value = event.target.value; if (value === '' || (Number.isFinite(Number(value)) && Number(value) >= 0)) update('minAmount', value); }} slotProps={{ htmlInput: { min: 0, step: 'any', 'aria-label': '최소 거래대금 (억원)' }, input: { endAdornment: <InputAdornment position="end">억원</InputAdornment> } }} />
        </Box>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" mt={2}>
          <Typography variant="caption" color="text.secondary" mr={0.5}>빠른 탐색</Typography>
          {[['5_6', '5 → 6 전환'], ['6_1', '6 → 1 전환'], ['HOLD_1', 'Stage 1 유지']].map(([value, label]) => <Chip key={value} label={label} onClick={() => { setPage(0); setFiltersByMode((previous) => ({ ...previous, [mode]: { ...previous[mode], stage: 'ALL', transition: previous[mode].transition === value ? 'ALL' : value } })); }} color={filters.transition === value ? 'primary' : 'default'} variant="outlined" size="small" />)}
          {filters.stage !== 'ALL' && <Chip label={`Stage ${filters.stage}`} size="small" color="primary" onDelete={() => update('stage', 'ALL')} />}
        </Stack>
      </SectionCard></Box>
      <Paper variant="outlined" sx={{ mt: 2.5, borderRadius: 2.5, overflow: 'hidden' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2} p={2.5}>
          <Box><Stack direction="row" alignItems="center" gap={1}><Typography variant="h3">스크리닝 결과</Typography><Chip size="small" label={`${api.data?.totalElements ?? 0}종목`} sx={{ color: 'primary.main', bgcolor: 'rgba(139,218,99,.1)' }} /></Stack><Typography variant="caption" color="text.secondary" display="block" mt={0.7}>이름을 눌러 EMA와 전환 이력을 확인하세요. · {snapshot.timeframe} 엔진 결과 · DB 페이지 조회</Typography></Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={1}>
            <FormControlLabel control={<Switch size="small" checked={filters.watchOnly} onChange={(event) => update('watchOnly', event.target.checked)} />} label={<Typography variant="body2">관찰종목만</Typography>} sx={{ whiteSpace: 'nowrap' }} />
            <TextField label="종목명·코드 검색" value={filters.search} onChange={(event) => update('search', event.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} sx={{ width: { xs: '100%', sm: 220 } }} />
          </Stack>
        </Stack>
        {api.loading ? <Typography role="status" textAlign="center" p={5}>현재 페이지를 불러오는 중입니다.</Typography> : running ? <Typography role="status" textAlign="center" p={5}>엔진 분석이 완료되면 결과가 표시됩니다.</Typography> : !api.run ? <Typography role="status" textAlign="center" p={5}>{api.error ? '결과를 불러오지 못했습니다. 결과 조회로 다시 시도해 주세요.' : '엔진 실행으로 첫 분석을 시작해 주세요.'}</Typography> : <ScreenerTable rows={rows} total={api.data?.totalElements ?? 0} page={api.data?.page ?? 0} size={api.data?.size ?? size} sort={sort} onPage={setPage} onSize={(value) => { setSize(value); setPage(0); }} onSort={(value) => { setSort(value); setPage(0); }} unit={snapshot.unit} mode={mode} watched={watched} onWatch={toggleWatch} onSelect={setSelected} onReset={reset} />}
      </Paper>
      <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>기울기: 실행 설정의 lookback 대비 변화율(%) · 중·장기 간격: (중기 EMA − 장기 EMA) ÷ 장기 EMA × 100 · 거래대금은 마지막 분석 봉 기준, 분봉은 미제공 · 별표는 이 브라우저에 저장됩니다.</Typography>
    </Box>
    <Dialog open={recoverDialog} onClose={() => { if (!api.submitting) setRecoverDialog(false); }}>
      <DialogTitle>중단 상태를 정리할까요?</DialogTitle>
      <DialogContent>서버에서 실행되지 않는데 대기·실행 중으로 남은 작업만 중단 상태로 변경합니다. 저장된 분석 결과는 삭제하지 않으며, 정리 후 재개하거나 새 실행을 시작할 수 있습니다. 실제 실행 중인 작업은 정리하지 않습니다.</DialogContent>
      <DialogActions><Button disabled={api.submitting} onClick={() => setRecoverDialog(false)}>취소</Button><Button color="warning" disabled={api.submitting} onClick={async () => { setSelected(null); await api.recover(); setRecoverDialog(false); }}>정리하기</Button></DialogActions>
    </Dialog>
    {selected && <ScreenerDetailLoader key={`${api.run?.runId}:${selected.stockCode}`} runId={api.run?.runId} row={selected} snapshot={snapshot} mode={mode} watched={watched} onWatch={toggleWatch} onClose={() => setSelected(null)} />}
    <ScreenerRunDialog open={runDialog} mode={mode} interval={mode === 'SWING' ? 0 : Number(interval)} busy={api.submitting} error={api.error} onClose={() => setRunDialog(false)} onStart={async (request) => { if (await api.start(request)) { setRunDialog(false); setSelected(null); } }} />
    <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} fullWidth maxWidth="sm" aria-labelledby="stage-guide-title"><DialogTitle id="stage-guide-title">EMA 대순환 판정 안내</DialogTitle><DialogContent><Typography variant="body2" color="text.secondary" mb={2}>종가 기반 단기·중기·장기 EMA의 위에서 아래 배열로 6개 스테이지를 구분합니다. 기본 기간은 5·20·40이며 실행 설정을 따릅니다.</Typography><Stack gap={1}>{STAGES.map((stage) => <Stack key={stage.id} direction="row" justifyContent="space-between" gap={2}><Typography variant="body2" sx={{ color: stage.color }}>S{stage.id} · {stage.label}</Typography><Typography variant="body2">{stage.order}</Typography></Stack>)}</Stack><Typography variant="body2" color="text.secondary" mt={2.5}>6 → 1은 순행, 1 → 6은 역행입니다. 경계값·표본 부족은 스테이지 미확정으로 표시합니다. 유지기간의 +는 시작을 확인할 수 없어 관찰 기간의 하한값임을 뜻합니다.</Typography><Typography variant="body2" color="text.secondary" mt={1.5}>엔진 판정을 그대로 표시하며 화면에서 스테이지를 다시 계산하지 않습니다. 점수와 매매 신호는 정책 확정 전까지 미평가입니다.</Typography></DialogContent><DialogActions><Button onClick={() => setGuideOpen(false)}>확인</Button></DialogActions></Dialog>
  </>;
}
