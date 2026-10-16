import { useEffect, useRef, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import * as api from '../../api/portfolioApi';

const number = (v, digits = 2) => v == null ? '미확인' : Number(v).toLocaleString('ko-KR', { maximumFractionDigits: digits });
const percent = v => v == null ? '미확인' : `${number(v)}%`;
const states = { PENDING: '평가 대기', WORKING: '평가 중', WAITING_DATA: '후속 자료 대기', RETRY_WAIT: '재시도 대기', COMPLETE: '평가 완료', DATA_INCOMPLETE: '기한 종료 · 자료 불완전', DATA_GAP: '가격 경로 누락', EVALUATED: '현재까지 평가됨', OPEN_UNLIQUIDATED: '기간 종료 후 미청산', FAILED: '실패', OPEN: '보유 중', CLOSED: '청산', SKIPPED: '미진입', SENT: '발송 확인', UNKNOWN: '발송 여부 미확인', SENDING: '발송 확인 중', REJECTED: '발송 거절' };
const reasons = { DUPLICATE_HOLDING: '동일 종목 중복', POSITION_LIMIT: '보유 한도', INSUFFICIENT_CASH: '가용 현금 부족', ENTRY_GAP: '진입 범위 이탈', UNCERTAIN_FILL: '체결 불명확', STOP: '손절', GAP_STOP: '갭 손절', TARGET: '목표 도달', TIME_EXIT: '보유 기간 종료', MISSING_ENTRY_PRICE: '진입 가격 누락', MISSING_HOLDING_PATH: '보유 가격 누락', ACCOUNT_PATH_INCOMPLETE: '계좌 경로 미확인', INVALID_SCENARIO: '시나리오 오류' };
const variants = { MARKET_FILTER: '시장 필터 적용', NO_MARKET_FILTER: '시장 필터 미적용', MARKET_FILTER_COST_STRESS: '필터 적용 · 체결 비용 증가', NO_MARKET_FILTER_COST_STRESS: '필터 미적용 · 체결 비용 증가' };
const evidence = { EMA5_ACCELERATION: 'EMA5 기울기 가속', EMA5_20_EXPANSION: 'EMA5·20 간격 확대', FOREIGN_FLOW5: '외국인 5일 수급', INSTITUTION_FLOW5: '기관 5일 수급', STAGE_6_TO_1: '스테이지 6→1', SIGNAL_AGE: '매수 신호 경과 봉' };
const strategy = { BREAKOUT: '돌파', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '돌파 재시험' };
const terminal = state => ['COMPLETE', 'FAILED', 'DATA_INCOMPLETE', 'DISABLED'].includes(state);
function groupLabel(key) { return key.split('/').map(x => evidence[x] || strategy[x] || ({ TRUE: '충족', FALSE: '미충족', UNKNOWN: '미확인' }[x]) || x).slice(1).join(' · '); }
function DataTable({ label, headers, rows }) {
  return <TableContainer><Table size="small" aria-label={label}><TableHead><TableRow>{headers.map(h => <TableCell key={h} sx={{ whiteSpace: 'nowrap' }}>{h}</TableCell>)}</TableRow></TableHead>
    <TableBody>{rows.map((row, i) => <TableRow key={i}>{row.map((cell, j) => <TableCell key={j}>{cell ?? '—'}</TableCell>)}</TableRow>)}{!rows.length && <TableRow><TableCell colSpan={headers.length}>표본 없음</TableCell></TableRow>}</TableBody></Table></TableContainer>;
}
function useMounted() { const ref = useRef(true); useEffect(() => { ref.current = true; return () => { ref.current = false; }; }, []); return ref; }
function sessionKey(name, signature) {
  // Persist before POST so an uncertain response or page reload cannot create another action.
  let old; try { old = JSON.parse(sessionStorage.getItem(name) || 'null'); } catch { old = null; }
  if (old?.signature === signature) return old.key;
  const key = crypto.randomUUID(); sessionStorage.setItem(name, JSON.stringify({ signature, key })); return key;
}
function PortfolioResult({ view, result }) {
  const [variantName, setVariantName] = useState('MARKET_FILTER');
  const [category, setCategory] = useState('STRATEGY');
  const v = result?.variants.find(item => item.name === variantName);
  if (!result) return <Alert severity="info">아직 평가 결과가 없습니다. 서버에서 후속 가격을 확인합니다.</Alert>;
  const policy = view.input.policy;
  return <Stack gap={2}>
    <Alert severity={view.input.captureMode === 'RETROSPECTIVE' ? 'warning' : 'info'}>{view.input.captureMode === 'RETROSPECTIVE' ? '과거 보고서의 사후 등록 · 독립 검증 아님' : '첫 진입 전 등록한 고정 조건의 모의계좌'}<br />승률만으로 설정을 고르지 마세요. 비용 차감 수익률·최대 낙폭·청산 표본·자료 누락을 함께 확인하세요.</Alert>
    <Typography variant="body2">등록 {view.input.registeredAt} · 평가 {result.evaluatedAt} · 자료 기준일 {result.throughDate || '미도래'}<br />초기 자금 {number(policy.initialCash, 0)}원 · 최대 {policy.maximumPositions}종목 · 종목당 {percent(policy.positionPercent)} · 왕복 수수료·세금 가정 {policy.roundTripFeeBps}bp · 편도 체결 차이 {policy.slippageBps}bp · 보유 {policy.holdingDays}거래일<br />등록 시 고정한 {view.input.cohorts.length}개 보고서 · {policy.version} · {policy.calendarVersion}</Typography>
    <DataTable label="모의계좌 비교" headers={['비교 조건', '평가 상태', '총 평가액(원)', '순수익률', '최대 낙폭', '청산 승률', '진입/청산', '보유/미확인', '미진입']} rows={result.variants.map(item => [variants[item.name], states[item.state] || item.state, number(item.finalEquity, 0), percent(item.returnPercent), percent(item.maximumDrawdownPercent), percent(item.metrics.winRatePercent), `${item.metrics.entered}/${item.metrics.closed}`, `${item.metrics.open}/${item.metrics.unresolved}`, item.metrics.skipped])} />
    <TextField select label="상세 비교 조건" value={variantName} onChange={e => setVariantName(e.target.value)}>{result.variants.map(item => <MenuItem key={item.name} value={item.name}>{variants[item.name]}</MenuItem>)}</TextField>
    {v && <>
      <Typography variant="body2">평균 청산 순수익률 {percent(v.metrics.meanReturnPercent)} · 평균 이익 {percent(v.metrics.meanWinPercent)} · 평균 손실 {percent(v.metrics.meanLossPercent)} · 이익/손실 합계 비 {number(v.metrics.profitFactor)} · 연속 손실 청산일 {v.metrics.consecutiveLosingExitDates}일 · 진입률 {percent(v.metrics.fillRatePercent)}</Typography>
      <TextField select label="통계 분류" value={category} onChange={e => setCategory(e.target.value)}>{Object.entries({ STRATEGY: '전략', EVIDENCE: '선정 근거', MARKET: '시장 국면', VERSION: '선정 규칙 버전' }).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}</TextField>
      <Alert severity="info">근거별 표본은 서로 중복됩니다. 표본 수가 적거나 손실 표본이 없으면 승률·이익/손실 비를 일반화할 수 없습니다. 미확인을 0으로 처리하지 않습니다.</Alert>
      <DataTable label="전략과 근거별 통계" headers={['분류', '진입/청산', '보유/미확인', '승률', '평균 순수익률', '평균 이익', '평균 손실', '실현손익(원)', '이익/손실 비']} rows={Object.entries(v.groups).filter(([key]) => key.startsWith(`${category}/`)).map(([key, m]) => [groupLabel(key), `${m.entered}/${m.closed}`, `${m.open}/${m.unresolved}`, percent(m.winRatePercent), percent(m.meanReturnPercent), percent(m.meanWinPercent), percent(m.meanLossPercent), number(m.realizedProfit, 0), number(m.profitFactor)])} />
      <Accordion><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>거래 내역과 일별 계좌 평가</AccordionSummary><AccordionDetails><Stack gap={2}>
        <DataTable label="모의 거래 내역" headers={['종목 / 보고서', '전략', '상태 / 사유', '진입 / 청산일', '수량', '진입 / 청산가', '실현손익(원)', '평가손익(원)', '순수익률']} rows={v.trades.map(t => [`${t.name} (${t.code}) · ${t.reportId.slice(0, 8)}`, strategy[t.strategy] || t.strategy, `${states[t.state] || t.state} · ${reasons[t.reason] || t.reason || '—'}${t.ambiguous ? ' · 동일 봉 손절 우선' : ''}`, `${t.entryDate || '—'} / ${t.exitDate || '—'}`, t.quantity, `${number(t.entryPrice)} / ${number(t.exitPrice)}`, number(t.netProfit), number(t.markedProfit), percent(t.netReturnPercent)])} />
        <DataTable label="일별 계좌 평가" headers={['거래일', '현금(원)', '총 평가액(원)', '낙폭', '보유 종목']} rows={v.curve.map(p => [p.date, number(p.cash, 0), number(p.equity, 0), percent(p.drawdownPercent), p.holdings])} />
      </Stack></AccordionDetails></Accordion>
    </>}
    <Accordion><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>시장 전망 적중 결과와 평가 조건</AccordionSummary><AccordionDetails><Stack gap={1}>
      <DataTable label="시장 전망 평가" headers={['예측 대상일', '시장', '예측', '실제', '등락률', '판정']} rows={result.forecasts.map(f => [f.date, f.market, f.predicted, f.actual || '미확인', percent(f.returnPercent), f.matched == null ? '대기·미확인' : f.matched ? '일치' : '불일치'])} />
      <Typography variant="caption">방향 판정 중립 구간 ±{policy.neutralBandPercent}%. 시장 필터 비교와 같은 전망 표본을 사용합니다.</Typography>
      {result.limitations.map(text => <Typography key={text} variant="body2">• {text}</Typography>)}
      {view.input.cohorts.map(c => <Typography key={c.report.runId} variant="caption">{c.report.tradeDate} · {c.report.runId} · {c.report.version}</Typography>)}
    </Stack></AccordionDetails></Accordion>
  </Stack>;
}
export function PortfolioWorkspace() {
  const [listing, setListing] = useState(null); const [refresh, setRefresh] = useState(0); const [error, setError] = useState('');
  const [selected, setSelected] = useState([]); const [cash, setCash] = useState('10000000'); const [limit, setLimit] = useState('5'); const [allocation, setAllocation] = useState('20');
  const [id, setId] = useState(''); const [view, setView] = useState(null); const [revision, setRevision] = useState('latest'); const [historical, setHistorical] = useState(null);
  const [busy, setBusy] = useState(false); const action = useRef(false); const mounted = useMounted();
  useEffect(() => {
    const controller = new AbortController();
    api.listPortfolios(controller.signal).then(data => { if (!controller.signal.aborted) { setListing(data); setId(old => old || data.runs[0]?.id || ''); } }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [refresh]);
  useEffect(() => {
    if (!id) return undefined;
    const controller = new AbortController(); let timer; setView(null); setRevision('latest');
    const load = async () => {
      try { const data = await api.getPortfolio(id, controller.signal); if (controller.signal.aborted) return; setView(data); if (!terminal(data.state)) timer = setTimeout(load, 30000); }
      catch (e) { if (!controller.signal.aborted) setError(e.message); }
    }; load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [id, refresh]);
  useEffect(() => {
    setHistorical(null); if (!id || revision === 'latest') return undefined;
    const controller = new AbortController(); api.getRevision(id, revision, controller.signal).then(data => { if (!controller.signal.aborted) setHistorical(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
    return () => controller.abort();
  }, [id, revision]);
  const create = async () => {
    if (action.current) return; action.current = true; setBusy(true); setError('');
    try {
      const request = { reportIds: [...selected].sort(), initialCash: Number(cash), maximumPositions: Number(limit), positionPercent: Number(allocation) };
      const key = sessionKey('stock-portfolio-request', JSON.stringify(request)); const data = await api.createPortfolio(request, key);
      if (mounted.current) { setId(data.id); setRefresh(n => n + 1); }
    } catch (e) { if (mounted.current) setError(e.message); } finally { action.current = false; if (mounted.current) setBusy(false); }
  };
  const invalid = !selected.length || selected.length > 60 || !Number.isFinite(Number(cash)) || Number(cash) < 10000 || Number(cash) > 1e11 || !Number.isInteger(Number(limit)) || Number(limit) < 1 || Number(limit) > 50 || !(Number(allocation) > 0 && Number(allocation) <= 100);
  return <Stack gap={2}>
    <Button onClick={() => { setError(''); setRefresh(n => n + 1); }} disabled={busy}>누적 성과 새로고침</Button>
    {error && <Alert severity="error">{error}</Alert>}
    {!listing && !error && <LinearProgress aria-label="누적 성과 조회 중" />}
    {listing && !listing.enabled && <Alert severity="info">누적 모의계좌 비활성화</Alert>}
    {listing?.enabled && <>
      <Alert severity="info">선택한 보고서를 시간순으로 하나의 현금 계좌에서 재생합니다. 실제 매매가 아닙니다. 비교 대상 보고서와 자금 조건은 등록 후 고정됩니다.</Alert>
      <Accordion><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>평가할 보고서 선택 ({selected.length}/60)</AccordionSummary><AccordionDetails><Stack sx={{ maxHeight: 320, overflow: 'auto' }}>
        {!listing.reports.length && <Typography>확정된 전체 시장 보고서가 없습니다.</Typography>}
        {listing.reports.map(report => <FormControlLabel key={report.id} control={<Checkbox disabled={busy} checked={selected.includes(report.id)} onChange={e => setSelected(old => e.target.checked ? [...old, report.id] : old.filter(x => x !== report.id))} />} label={`${report.tradeDate} · ${report.candidates}종목 · ${report.id.slice(0, 8)} · ${report.version}`} />)}
      </Stack></AccordionDetails></Accordion>
      <Typography variant="caption">같은 거래일은 한 보고서만, 같은 선정 규칙 버전으로 선택하세요. 같은 설정으로 재요청하면 이 브라우저 세션의 기존 평가를 불러옵니다.</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        <TextField label="모의 초기 자금(원)" type="number" value={cash} disabled={busy} onChange={e => setCash(e.target.value)} />
        <TextField label="최대 보유 종목" type="number" value={limit} disabled={busy} onChange={e => setLimit(e.target.value)} />
        <TextField label="종목당 자금 비율(%)" type="number" value={allocation} disabled={busy} onChange={e => setAllocation(e.target.value)} />
        <Button variant="contained" disabled={busy || invalid} onClick={create}>모의계좌 평가 등록</Button>
      </Stack>
      <TextField select label="누적 평가 이력" value={listing.runs.some(run => run.id === id) ? id : ''} disabled={busy} onChange={e => setId(e.target.value)}>
        <MenuItem value="">평가 선택</MenuItem>{listing.runs.map(run => <MenuItem key={run.id} value={run.id}>{run.createdAt} · {states[run.state] || run.state} · {run.id.slice(0, 8)}</MenuItem>)}
      </TextField>
      {id && !view && !error && <LinearProgress aria-label="계좌 평가 조회 중" />}
      {view && <>
        <Chip sx={{ alignSelf: 'flex-start' }} label={`${states[view.state] || view.state} · 최신 결과 ${view.revision}차`} />
        {view.errorCode && <Alert severity="warning">평가 처리 오류: {view.errorCode}. 아래 결과가 있으면 마지막으로 저장된 결과입니다.</Alert>}
        {view.revision > 0 && <TextField select label="저장 결과 버전" value={revision} onChange={e => setRevision(e.target.value)}><MenuItem value="latest">최신 결과</MenuItem>{Array.from({ length: view.revision }, (_, i) => <MenuItem key={i} value={String(i + 1)}>{i + 1}차 저장 결과</MenuItem>)}</TextField>}
        {view.input && (revision === 'latest' || historical ? <PortfolioResult key={`${id}:${revision}`} view={view} result={revision === 'latest' ? view.result : historical} /> : <LinearProgress aria-label="이전 결과 조회 중" />)}
      </>}
    </>}
  </Stack>;
}
export function OperationsWorkspace({ reportId }) {
  const [status, setStatus] = useState(null); const [refresh, setRefresh] = useState(0); const [error, setError] = useState('');
  const [preview, setPreview] = useState(null); const [previewRequested, setPreviewRequested] = useState(false);
  const [confirm, setConfirm] = useState(false); const [sent, setSent] = useState(null); const [busy, setBusy] = useState(false);
  const action = useRef(false); const mounted = useMounted();
  useEffect(() => { const controller = new AbortController(); api.getOperations(controller.signal).then(data => { if (!controller.signal.aborted) setStatus(data); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, [refresh]);
  useEffect(() => { setPreview(null); setPreviewRequested(false); }, [reportId]);
  useEffect(() => {
    if (!previewRequested || !reportId) return undefined;
    const controller = new AbortController(); api.previewReport(reportId, controller.signal).then(data => { if (!controller.signal.aborted) setPreview(data); }).catch(e => { if (!controller.signal.aborted) { setError(e.message); setPreviewRequested(false); } }); return () => controller.abort();
  }, [previewRequested, reportId]);
  const send = async () => {
    if (action.current) return; action.current = true; setConfirm(false); setBusy(true); setError('');
    try {
      const key = sessionKey('stock-telegram-test', status.destinationFingerprint);
      const result = await api.sendTelegramTest({ confirm: true, destinationFingerprint: status.destinationFingerprint }, key);
      if (mounted.current) { setSent(result); setRefresh(n => n + 1); }
    } catch (e) { if (mounted.current) setError(e.message); } finally { action.current = false; if (mounted.current) setBusy(false); }
  };
  return <Stack gap={2}>
    <Button disabled={busy} onClick={() => { setError(''); setRefresh(n => n + 1); }}>운영 상태 새로고침</Button>
    {error && <Alert severity="error">{error}</Alert>}{!status && !error && <LinearProgress aria-label="운영 상태 조회 중" />}
    {status && !status.enabled && <Alert severity="info">운영 확인 기능 비활성화</Alert>}
    {status?.enabled && <>
      <Stack direction="row" flexWrap="wrap" gap={1}>{Object.entries(status.features).map(([key, enabled]) => <Chip key={key} variant="outlined" label={`${({ schedule: '예약', eodWorker: '마감 수집', report: '보고서', telegram: '텔레그램', performance: '개별 성과', portfolio: '누적 성과' }[key]) || key} ${enabled ? '켜짐' : '꺼짐'}`} />)}</Stack>
      <Typography variant="body2">최근 예정 거래일 {status.expectedTradeDate || '확인 불가'} · 전체 시장 실행 {status.expectedScanPresent ? '있음' : '미확인'}<br />달력 확인 범위 {status.calendarThrough || '확인 불가'} · {status.calendarVersion}<br />텔레그램 대상 {status.destinationLabel} · 인증 설정 {status.credentialsConfigured ? '있음' : '없음'}</Typography>
      {status.warnings.map(w => <Alert key={w} severity="warning">{w}</Alert>)}
      <DataTable label="작업별 운영 상태" headers={['작업', '조회 상태', '상태별 건수', '최근 기록 / 오류']} rows={status.pipelines.map(p => [p.name, p.state, Object.entries(p.counts).map(([state, count]) => `${states[state] || state}: ${count}`).join(' · '), p.recent.map(r => `${r.id.slice(0, 8)} ${states[r.status] || r.status}${r.updatedAt ? ` (${r.updatedAt})` : ''}${r.errorCode ? ` / ${r.errorCode}` : ''}`).join(' | ')])} />
      <Accordion><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>필수 테이블 확인</AccordionSummary><AccordionDetails>{Object.entries(status.tables).map(([name, exists]) => <Typography key={name} variant="body2">{name}: {exists ? '있음' : '없음'}</Typography>)}</AccordionDetails></Accordion>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button disabled={!reportId || previewRequested} onClick={() => { setError(''); setPreviewRequested(true); }}>선택 보고서 알림 미리보기</Button>
        <Button disabled={busy || !status.testEnabled || !status.credentialsConfigured} onClick={() => setConfirm(true)}>텔레그램 연결 테스트</Button>
      </Stack>
      <Typography variant="caption">미리보기는 메시지를 보내지 않습니다. 연결 테스트는 확인 후 실제 메시지 1건을 보냅니다. 같은 브라우저 세션의 재요청은 같은 발송 기록을 조회합니다.</Typography>
      {preview && <Box component="pre" sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>{preview.text}</Box>}
      {sent && <Alert severity={sent.state === 'SENT' ? 'success' : 'warning'}>테스트 결과: {states[sent.state] || sent.state}{sent.errorCode ? ` · ${sent.errorCode}` : ''}{sent.state === 'UNKNOWN' ? ' · 자동 재발송하지 않습니다. 수신함을 직접 확인하세요.' : ''}</Alert>}
      <DataTable label="테스트 발송 기록" headers={['요청 시각', '상태', '확인 번호', '오류']} rows={status.tests.map(t => [t.requestedAt, states[t.state] || t.state, t.key, t.errorCode])} />
      <Dialog open={confirm} onClose={() => setConfirm(false)}><DialogTitle>실제 테스트 메시지 발송</DialogTitle><DialogContent>설정된 수신 대상 {status.destinationLabel}에 연결 확인 메시지를 보냅니다. 분석 결과 알림과는 별개입니다.</DialogContent><DialogActions><Button onClick={() => setConfirm(false)}>취소</Button><Button disabled={busy} onClick={send}>테스트 메시지 보내기</Button></DialogActions></Dialog>
    </>}
  </Stack>;
}
export default function PortfolioPanel({ reportId }) {
  const [portfolioOpen, setPortfolioOpen] = useState(false); const [operationsOpen, setOperationsOpen] = useState(false);
  return <Stack gap={1}>
    <Accordion expanded={portfolioOpen} onChange={(_, open) => setPortfolioOpen(open)}><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>누적 모의계좌 · 전략 검증</AccordionSummary><AccordionDetails>{portfolioOpen && <PortfolioWorkspace />}</AccordionDetails></Accordion>
    <Accordion expanded={operationsOpen} onChange={(_, open) => setOperationsOpen(open)}><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>자동 분석 · 알림 운영 확인</AccordionSummary><AccordionDetails>{operationsOpen && <OperationsWorkspace reportId={reportId} />}</AccordionDetails></Accordion>
  </Stack>;
}
