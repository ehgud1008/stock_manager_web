import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import * as api from '../../api/analysisScanApi';
import AnalysisResultPanel from '../../features/stock-analysis/components/AnalysisResultPanel';
import AnalysisNarrativePanel from '../../features/stock-analysis/components/AnalysisNarrativePanel';

const STATUS = { READY: '실행 대기', RUNNING: '분석 중', COMPLETED: '완료', COMPLETED_WITH_ERRORS: '일부 실패', FAILED: '실패', INTERRUPTED: '중단', PENDING: '미처리', SKIPPED: '제외' };
const SIGNAL = { BREAKOUT: '돌파', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '재지지', TREND_BREAKDOWN: '추세 훼손', BREAKOUT_FAILURE: '돌파 실패' };
const STATE = { CONFIRMED: '확정', ACTIVE: '유지', PRELIMINARY: '예비' };
const ENTRY = { IN_RANGE: '신호 구간 내', CHASE_BLOCKED: '추격 보류', OUTSIDE_ENTRY_ZONE: '진입 구간 이탈', SCENARIO_UNAVAILABLE: '시나리오 없음', SELL_SIGNAL_CONFLICT: '매도 신호 충돌', NONE: '매수 신호 없음' };
const QUALITY = { COMPLETE: '정상', PARTIAL: '일부 누락', INVALID: '판정 불가' };
const price = value => value == null ? '—' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const score = value => value == null ? '—' : Number(value).toFixed(1);
const initialFilters = { search: '', signal: '', status: '', setup: '', entryStatus: '', quality: '', minScore: '', maxScore: '', minRewardRisk: '', sort: 'totalScore', ascending: false };
const running = run => ['READY', 'RUNNING'].includes(run?.status);

function SnapshotDetail({ selection, onClose }) {
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    api.getAnalysisScanDetail(selection.runId, selection.code, controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ data }); })
      .catch(error => { if (!controller.signal.aborted) setState({ error: error.message }); });
    return () => controller.abort();
  }, [selection]);
  return <Dialog open onClose={onClose} fullWidth maxWidth="md">
    <DialogTitle>{selection.name} · 저장된 전체 분석 결과</DialogTitle>
    <DialogContent><Stack gap={2}>
      <Alert severity="info">선택한 실행의 저장 결과입니다. 상세 조회는 재분석이나 실시간 시세 조회를 실행하지 않습니다.</Alert>
      {state.loading && <LinearProgress />}
      {state.error && <Alert severity="error">{state.error}</Alert>}
      {state.data && <><AnalysisResultPanel result={state.data} /><AnalysisNarrativePanel reasons={state.data.reasons} warnings={state.data.warnings} /></>}
    </Stack></DialogContent>
    <DialogActions><Button component={Link} to={`/analysis/${selection.code}`}>개별 분석 화면</Button><Button onClick={onClose}>닫기</Button></DialogActions>
  </Dialog>;
}

export default function AnalysisScanPage() {
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
  const [confirm, setConfirm] = useState(null);
  const [selection, setSelection] = useState(null);
  const requestKey = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    api.listAnalysisScans(controller.signal).then(data => {
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
        const data = await api.getAnalysisScanItems(runId, params, controller.signal);
        if (controller.signal.aborted) return;
        setResult(data); setLoading(false);
        if (running(data.run)) timer = setTimeout(load, 3000);
      } catch (e) {
        if (!controller.signal.aborted) { setError(e.message); setLoading(false); }
      }
    };
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [runId, filters, page, size, refresh]);

  const run = result?.run;
  const execute = async () => {
    const action = confirm; setConfirm(null); setBusy(true); setError('');
    try {
      let next;
      if (action === 'start') {
        if (!requestKey.current || requestKey.current.market !== market) requestKey.current = { market, key: crypto.randomUUID() };
        next = await api.startAnalysisScan({ market }, requestKey.current.key);
        requestKey.current = null;
      } else next = await (action === 'resume' ? api.resumeAnalysisScan(runId) : api.recoverAnalysisScan(runId));
      setRunId(next.runId); setPage(0); setRefresh(n => n + 1);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const select = (key, value) => setDraft(old => ({ ...old, [key]: value }));
  const filterSelect = (key, label, options) => <TextField select size="small" label={label} value={draft[key]} onChange={e => select(key, e.target.value)} sx={{ minWidth: 150 }}>
    <MenuItem value="">전체</MenuItem>{Object.entries(options).map(([value, text]) => <MenuItem key={value} value={value}>{text}</MenuItem>)}
  </TextField>;

  return <Stack gap={2.5}>
    <Typography variant="h1">전체 종목분석</Typography>
    <Alert severity="info">전일까지의 완료 일봉을 기준으로 전체 일반주식을 분석합니다. 가격일을 확인하세요. 매매 신호의 확정은 수익 보장이 아니며, 보유 정보·자동 주문·백테스트와는 별개입니다.</Alert>
    <Stack direction="row" gap={1} flexWrap="wrap">
      <TextField select size="small" label="분석 대상 시장" value={market} onChange={e => setMarket(e.target.value)} sx={{ minWidth: 140 }}>
        <MenuItem value="ALL">전체 시장</MenuItem><MenuItem value="KOSPI">코스피</MenuItem><MenuItem value="KOSDAQ">코스닥</MenuItem>
      </TextField>
      <Button variant="contained" disabled={busy || running(run)} onClick={() => setConfirm('start')}>전체 분석 실행</Button>
      <Button disabled={busy} onClick={() => setRefresh(n => n + 1)}>새로고침</Button>
    </Stack>
    {error && <Alert severity="error">{error}</Alert>}
    <TextField select label="분석 실행 이력 (최근 50개)" value={runId} onChange={e => { setRunId(e.target.value); setPage(0); setSelection(null); }}>
      {!runs.length && <MenuItem value="">저장된 실행 없음</MenuItem>}
      {runId && !runs.some(r => r.runId === runId) && <MenuItem value={runId}>{runId}</MenuItem>}
      {runs.map(r => <MenuItem key={r.runId} value={r.runId}>{r.baseDate} · {r.market} · {STATUS[r.status] || r.status} · {r.runId.slice(0, 8)}</MenuItem>)}
    </TextField>
    {loading && <LinearProgress aria-label="결과 조회 중" />}
    {run && <Stack gap={1}>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Chip label={STATUS[run.status] || run.status} />
        <Typography>전체 {run.total} · 완료 {run.completed} · 실패 {run.failed} · 제외 {run.skipped}</Typography>
        {!running(run) && run.status !== 'COMPLETED' && <Button disabled={busy} onClick={() => setConfirm('resume')}>실패·미처리 재개</Button>}
        {running(run) && <Button disabled={busy} onClick={() => setConfirm('recover')}>중단 상태 정리</Button>}
      </Stack>
      <LinearProgress aria-label="전체 분석 진행률" variant={run.total ? 'determinate' : running(run) ? 'indeterminate' : 'determinate'} value={run.total ? 100 * (run.completed + run.failed + run.skipped) / run.total : 0} />
      <Typography variant="caption">기준일 {run.baseDate} · {run.engineVersion} · 실행 {run.runId}{run.errorCode ? ` · ${run.errorCode}` : ''}</Typography>
      {running(run) && <Typography variant="caption">서버에서 계속 실행됩니다. 현재 완료된 종목부터 조회하며 진행 중 순위는 바뀔 수 있습니다.</Typography>}
    </Stack>}
    <Box component="form" onSubmit={e => { e.preventDefault(); setFilters({ ...draft }); setPage(0); }}>
      <Stack direction="row" gap={1.5} flexWrap="wrap">
        <TextField size="small" label="종목명·코드" value={draft.search} onChange={e => select('search', e.target.value)} />
        {filterSelect('signal', '매매 신호', { BUY: '매수 확정·유지', SELL: '보유 시 매도 확정·유지', BREAKOUT: '돌파 확정·유지', PULLBACK_RECOVERY: '눌림 회복 확정·유지', BREAKOUT_RETEST: '재지지 확정·유지', TREND_BREAKDOWN: '추세 훼손 확정·유지', BREAKOUT_FAILURE: '돌파 실패 확정·유지', BUY_PRELIMINARY: '매수 예비', SELL_PRELIMINARY: '매도 예비' })}
        {filterSelect('entryStatus', '진입 상태', ENTRY)}
        {filterSelect('setup', '시나리오 유형', { PULLBACK: '눌림목', BREAKOUT: '돌파', CONTINUATION: '추세 지속', RANGE: '구간', UNCLASSIFIED: '미분류' })}
        {filterSelect('status', '처리 상태', { COMPLETED: '완료', FAILED: '실패', PENDING: '미처리', SKIPPED: '제외' })}
        {filterSelect('quality', '데이터 상태', QUALITY)}
        {['minScore', 'maxScore', 'minRewardRisk'].map((key, i) => <TextField key={key} size="small" type="number" label={['최소 종합점수', '최대 종합점수', '최소 손익비'][i]} value={draft[key]} onChange={e => select(key, e.target.value)} slotProps={{ htmlInput: { min: 0, max: i < 2 ? 100 : undefined, step: 'any' } }} sx={{ width: 140 }} />)}
        <TextField select size="small" label="정렬" value={draft.sort} onChange={e => select('sort', e.target.value)}>
          {Object.entries({ totalScore: '종합점수', entryScore: '진입점수', rewardRisk: '손익비', stockCode: '종목 코드' }).map(([k, v]) => <MenuItem key={k} value={k}>{v}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="정렬 방향" value={String(draft.ascending)} onChange={e => select('ascending', e.target.value === 'true')}>
          <MenuItem value="false">높은 순</MenuItem><MenuItem value="true">낮은 순</MenuItem>
        </TextField>
        <Button type="submit" variant="outlined" disabled={!runId}>검색</Button>
      </Stack>
    </Box>
    <TableContainer><Table size="small" aria-label="전체 종목분석 결과"><TableHead><TableRow>
      {['종목', '처리/데이터', '가격일', '종합', '상승/진입/위험', '매수 신호', '보유 시 매도', '진입 상태', '기준 종가', '진입 구간', '목표 1/2', '손절가', '손익비', '상세'].map(t => <TableCell key={t} sx={{ whiteSpace: 'nowrap' }}>{t}</TableCell>)}
    </TableRow></TableHead><TableBody>
      {(result?.content || []).map(item => <TableRow key={item.stockCode}>
        <TableCell width='20%'>{item.stockName}<Typography variant="caption" display="block">{item.stockCode} · {item.market}</Typography></TableCell>
        <TableCell>{STATUS[item.status] || item.status}<Typography variant="caption" display="block">{QUALITY[item.quality] || item.errorCode || '—'}</Typography></TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{item.priceDate || '—'}</TableCell>
        <TableCell>{score(item.totalScore)}</TableCell><TableCell>{score(item.riseScore)} / {score(item.entryScore)} / {score(item.riskScore)}</TableCell>
        <TableCell>{item.buySignal ? `${SIGNAL[item.buySignal] || item.buySignal} · ${STATE[item.buyState] || item.buyState}` : '—'}<Typography variant="caption" display="block">{(item.activeSignals || '').split('|').filter(s => ['BREAKOUT', 'PULLBACK_RECOVERY', 'BREAKOUT_RETEST'].includes(s)).map(s => SIGNAL[s]).join(' · ')}</Typography></TableCell>
        <TableCell>{item.sellSignal ? `${SIGNAL[item.sellSignal] || item.sellSignal} · ${STATE[item.sellState] || item.sellState}` : '—'}</TableCell>
        <TableCell>{ENTRY[item.entryStatus] || '—'}</TableCell><TableCell>{price(item.currentPrice)}</TableCell>
        <TableCell>{price(item.entryFrom)} ~ {price(item.entryTo)}</TableCell><TableCell>{price(item.targetOne)} / {price(item.targetTwo)}</TableCell>
        <TableCell>{price(item.stopPrice)}</TableCell><TableCell>{item.rewardRisk == null ? '—' : `${Number(item.rewardRisk).toFixed(2)}배`}</TableCell>
        <TableCell><Button disabled={!item.analysisRunId} onClick={() => setSelection({ runId, code: item.stockCode, name: item.stockName })}>상세</Button></TableCell>
      </TableRow>)}
      {!loading && !result?.content?.length && <TableRow><TableCell colSpan={14}>{runId ? '조건에 해당하는 결과가 없습니다.' : '전체 분석을 실행하거나 저장된 실행을 선택하세요.'}</TableCell></TableRow>}
    </TableBody></Table></TableContainer>
    <TablePagination component="div" count={result?.totalElements || 0} page={page} rowsPerPage={size} rowsPerPageOptions={[20, 50, 100]} onPageChange={(_, value) => setPage(value)} onRowsPerPageChange={e => { setSize(Number(e.target.value)); setPage(0); }} labelRowsPerPage="페이지 크기" />
    {confirm && <Dialog open onClose={() => setConfirm(null)}><DialogTitle>{confirm === 'start' ? '전체 종목분석 실행' : confirm === 'resume' ? '분석 재개' : '중단 상태 정리'}</DialogTitle>
      <DialogContent>{confirm === 'start' ? `${market} 일반주식의 전체 분석을 시작합니다. 여러 전문을 수집하므로 시간이 걸릴 수 있습니다. 브라우저를 닫아도 서버에서 계속 실행됩니다.` : confirm === 'resume' ? '저장된 대상 목록에서 실패·미처리 종목만 다시 분석합니다. 완료 결과는 유지합니다.' : '서버 재시작 등으로 실제 작업이 멈춘 경우에만 중단 상태로 정리합니다. 실제 실행 중이면 요청이 거부됩니다.'}</DialogContent>
      <DialogActions><Button onClick={() => setConfirm(null)}>취소</Button><Button onClick={execute}>확인</Button></DialogActions>
    </Dialog>}
    {selection && <SnapshotDetail selection={selection} onClose={() => setSelection(null)} />}
  </Stack>;
}
