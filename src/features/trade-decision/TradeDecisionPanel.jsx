import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, Divider, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { useCallback, useEffect, useRef, useState } from 'react';
import SectionCard from '../../components/common/SectionCard';
import * as api from '../../api/tradeDecisionApi';
import DecisionPlanView, { MetricReferences } from './DecisionPlanView';
import IndependentReviewView from './IndependentReviewView';
import DecisionPreferencesForm from './DecisionPreferencesForm';
import { defaultPreferences, normalizePreferences, preferencesValid, sameDecisionContext } from './decisionPreferences';

const actions = { BUY: '매수 검토', SELL: '매도 검토', HOLD: '보유 유지', WAIT: '신규 진입 대기', UNDETERMINED: '판단 보류' };
const conditions = { UPSIDE: '상승 시나리오', RANGE: '횡보 시나리오', DOWNSIDE: '하락 시나리오' };
const blocks = { POSITION_UNKNOWN: '보유 상태를 입력해야 매매 의견을 판단할 수 있습니다.', INSUFFICIENT_DATA: '필수 분석 자료가 부족해 판단을 보류했습니다.', HISTORY_REQUIRED: '기간별 분석에 필요한 가격 이력이 없습니다. 종합분석을 다시 실행하세요.', HISTORY_INVALID: '저장 가격 이력이 분석 결과와 일치하지 않습니다. 종합분석을 다시 실행하세요.', HISTORY_INSUFFICIENT: '선택 기간의 계산에 필요한 확정 일봉이 부족합니다.' };
const format = value => value == null ? '산출 불가' : `${Number(value).toLocaleString('ko-KR')}원`;

export default function TradeDecisionPanel({ snapshotId, stockCode, aiConfigured, embedded = false, prepareSnapshot, sourceRunId }) {
  const effectiveSnapshot = useRef(snapshotId);
  const [savedSnapshotId, setSavedSnapshotId] = useState(snapshotId);
  const [position, setPosition] = useState('UNKNOWN');
  const [horizon, setHorizon] = useState(10);
  const [horizonMode, setHorizonMode] = useState('AI_PROPOSED');
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [averageBuyPrice, setAverageBuyPrice] = useState('');
  const [purchasedOn, setPurchasedOn] = useState('');
  const [preview, setPreview] = useState({});
  const [previewRetry, setPreviewRetry] = useState(0);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState('');
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const active = useRef(null);
  const pendingRequest = useRef(null);
  const requestBody = { positionStatus: position, horizonTradingDays: horizonMode === 'AI_PROPOSED' ? null : Number(horizon), preferences,
    ...(position === 'HELD' && averageBuyPrice !== '' ? { averageBuyPrice: Number(averageBuyPrice) } : {}),
    ...(position === 'HELD' && purchasedOn ? { purchasedOn } : {}) };
  const contextKey = JSON.stringify(requestBody);
  const validInput = (horizonMode === 'AI_PROPOSED' || Number.isInteger(Number(horizon)) && Number(horizon) >= 1 && Number(horizon) <= 252) && preferencesValid(preferences)
    && (position !== 'HELD' || averageBuyPrice === '' || (Number(averageBuyPrice) > 0 && /^\d+(\.\d{1,2})?$/.test(averageBuyPrice)));
  useEffect(() => {
    if (!validInput || (!sourceRunId && !savedSnapshotId)) return;
    const c = new AbortController();
    const timer = setTimeout(async () => {
      setPreview({ key: contextKey, loading: true });
      try {
        const body = JSON.parse(contextKey);
        const data = sourceRunId ? await api.previewSourcePlan(stockCode, sourceRunId, body, c.signal)
          : await api.previewDecisionPlan(savedSnapshotId, body, c.signal);
        if (!c.signal.aborted) setPreview({ key: contextKey, data });
      } catch (e) { if (!c.signal.aborted) setPreview({ key: contextKey, error: e.message }); }
    }, 350);
    return () => { clearTimeout(timer); c.abort(); };
  }, [contextKey, validInput, savedSnapshotId, stockCode, sourceRunId, previewRetry]);
  const previewPolicy = preview.key === contextKey ? preview.data : null;
  const restoreContext = context => {
    setPosition(context.positionStatus); setHorizonMode(context.horizonTradingDays == null ? 'AI_PROPOSED' : 'FIXED'); setHorizon(context.horizonTradingDays ?? 10);
    setPreferences(normalizePreferences(context.preferences));setAverageBuyPrice(context.averageBuyPrice == null ? '' : String(context.averageBuyPrice));setPurchasedOn(context.purchasedOn || '');
  };

  const refresh = useCallback(async signal => {
    if (embedded && !effectiveSnapshot.current) { setHistory([]); setHasMore(false); return; }
    try {
      const data = await api.listDecisions(stockCode, signal, historyPage, embedded ? effectiveSnapshot.current : null);
      if (!signal.aborted) { setHistory(data.items); setHasMore(data.hasMore); setHistoryError(''); }
    } catch (e) { if (!signal.aborted) setHistoryError(e.message); }
  }, [stockCode, historyPage, embedded]);
  useEffect(() => { const c = new AbortController(); refresh(c.signal); return () => c.abort(); }, [refresh, savedSnapshotId]);

  const track = useCallback(async (initial, signal) => {
    if (initial.snapshotId !== effectiveSnapshot.current) throw new Error('이 판단은 다른 분석에 속합니다. 해당 분석을 열어주세요.');
    setJob(initial); if (!embedded) api.updateDecisionLocation(effectiveSnapshot.current, initial.id);
    const done = await api.waitForJob(initial, api.getDecision, signal, setJob);
    if (!signal.aborted) { setJob(done); await refresh(signal); }
  }, [embedded, refresh]);

  useEffect(() => {
    const id = embedded ? null : new URLSearchParams(window.location.search).get('decision');
    if (!id && !(embedded && snapshotId)) return;
    const c = new AbortController(); active.current = c; setBusy(true);
    const restored = id ? api.getDecision(id, c.signal) : api.listDecisions(stockCode, c.signal, 0, snapshotId)
      .then(data => data.items[0] && !c.signal.aborted ? api.getDecision(data.items[0].id, c.signal) : null);
    restored.then(j => {
      if (j && !c.signal.aborted) {
        const context = j.context || j.result?.context;
        if (context) restoreContext(context);
        return track(j, c.signal);
      }
    })
      .catch(e => { if (!c.signal.aborted) setError(e.message); })
      .finally(() => { if (active.current === c) { active.current = null; setBusy(false); } });
    return () => { c.abort(); if (active.current === c) active.current = null; };
    // Restore once per snapshot. Paging history must not restart a saved job.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotId]);
  useEffect(() => () => active.current?.abort(), []);

  const execute = async (mode = 'new', id = null) => {
    if (active.current) return;
    const c = new AbortController(); active.current = c; setBusy(true); setError('');
    const body = requestBody;
    try {
      let initial;
      if (mode === 'open') {
        initial = await api.getDecision(id, c.signal);
        const context = initial.context || initial.result?.context;
        if (context && !c.signal.aborted) restoreContext(context);
      }
      else {
        if (!effectiveSnapshot.current) {
          const prepared = await prepareSnapshot(c.signal);
          if (c.signal.aborted) return;
          effectiveSnapshot.current = prepared.id; setSavedSnapshotId(prepared.id);
        }
        const currentSnapshot = effectiveSnapshot.current;
        const signature = JSON.stringify({ mode, id, body, snapshotId: currentSnapshot });
        if (pendingRequest.current?.signature !== signature) pendingRequest.current = {
          signature, key: api.requestIdentity(`trade-decision-request-v4:${currentSnapshot}`, { mode, id, body }),
        };
        const key = pendingRequest.current.key;
        initial = mode === 'revision' ? await api.reviseDecision(id, key, c.signal)
          : await api.startDecision(currentSnapshot, body, key, c.signal);
        if (!c.signal.aborted && !embedded) api.updateDecisionLocation(currentSnapshot, initial.id);
        pendingRequest.current = null;
        if (mode === 'revision') { try { sessionStorage.removeItem(`trade-decision-request-v4:${currentSnapshot}`); } catch { /* Browser storage can be unavailable. */ } }
      }
      if (!c.signal.aborted) await track(initial, c.signal);
    } catch (e) { if (!c.signal.aborted) setError(e.message); }
    finally { if (active.current === c) { active.current = null; setBusy(false); } }
  };
  const result = job?.result;
  const policy = result?.policy;
  const review = result?.aiReview;
  const plan = policy?.plan;
  return <SectionCard title="AI 매매 판단" caption="AI가 저장 자료를 독립적으로 해석하고 엔진과 다른 판단·가격 전략을 제안할 수 있습니다. 같은 입력은 저장 결과를 재사용합니다.">
    <Stack gap={2}>
      {!aiConfigured && <Alert severity="info">AI 모델 또는 API 키가 아직 설정되지 않았습니다. 저장된 분석과 판단 이력은 조회할 수 있습니다.</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField select label="보유 상태" value={position} onChange={e => setPosition(e.target.value)} disabled={busy} sx={{ minWidth: 180 }}>
          <MenuItem value="UNKNOWN">선택하지 않음</MenuItem><MenuItem value="NOT_HELD">미보유</MenuItem><MenuItem value="HELD">보유 중</MenuItem>
        </TextField>
        <TextField select label="보유기간 결정" value={horizonMode} onChange={e => setHorizonMode(e.target.value)} disabled={busy} sx={{ minWidth: 190 }}><MenuItem value="AI_PROPOSED">AI가 적합한 기간 제안</MenuItem><MenuItem value="FIXED">기간 직접 지정</MenuItem></TextField>
        {horizonMode === 'FIXED' && <TextField type="number" label={position === 'HELD' ? '앞으로 더 보유할 기간 (거래일)' : '매수 후 예상 보유기간 (거래일)'} value={horizon} onChange={e => setHorizon(e.target.value)} disabled={busy} inputProps={{ min: 1, max: 252 }} />}
        <Button variant="contained" disabled={busy || !aiConfigured || !validInput || ['HISTORY_REQUIRED', 'HISTORY_INVALID'].includes(previewPolicy?.blockReason)} onClick={() => execute()}>AI 상세 검토</Button>
      </Stack>
      <DecisionPreferencesForm value={preferences} onChange={setPreferences} disabled={busy} />
      {position === 'HELD' && <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField type="number" label="평균 매수가 (선택)" value={averageBuyPrice} onChange={e => setAverageBuyPrice(e.target.value)} disabled={busy} inputProps={{ min: 0.01, step: 0.01 }} />
        <TextField type="date" label="매수일 (선택)" value={purchasedOn} onChange={e => setPurchasedOn(e.target.value)} disabled={busy} InputLabelProps={{ shrink: true }} inputProps={{ max: previewPolicy?.priceDate }} />
      </Stack>}
      <Typography variant="caption" color="text.secondary">AI가 종목 자체의 적합성을 먼저 분석한 뒤 내 성향을 반영합니다. 새 분석은 두 단계 AI 호출을 사용하며, 입력 변경만으로 AI를 호출하지 않습니다.</Typography>
      {horizonMode === 'AI_PROPOSED' && <Typography variant="caption" color="text.secondary">아래 엔진의 기간별 계획은 비교 참고용이며, AI가 제안할 보유기간을 미리 정하지 않습니다.</Typography>}
      {preview.key === contextKey && preview.loading && <LinearProgress aria-label="기간별 가격 계획 계산 중" />}
      {preview.key === contextKey && preview.error && <Alert severity="warning" action={<Button onClick={() => setPreviewRetry(n => n + 1)}>계획 다시 조회</Button>}>가격 계획 조회 실패: {preview.error}</Alert>}
      {validInput && previewPolicy && <Accordion disableGutters defaultExpanded={!review}><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography>현재 입력의 엔진 참고 계획 · AI 호출 없음</Typography></AccordionSummary><AccordionDetails><DecisionPlanView policy={previewPolicy} onSelectPeriod={busy ? undefined : days => { setHorizon(days); setHorizonMode('FIXED'); }} /></AccordionDetails></Accordion>}
      {busy && <Box role="status"><LinearProgress /><Typography variant="body2" mt={1}>저장된 작업을 확인하고 있습니다. 화면을 닫아도 서버 작업은 유지됩니다.</Typography></Box>}
      {error && <Alert severity="error">{error}</Alert>}
      {job?.status === 'FAILED' && <Alert severity="error">{api.decisionErrorMessage(job.errorCode)}</Alert>}
      {job?.status === 'RETRYABLE_FAILED' && <Alert severity="warning">일시적인 오류로 자동 재시도를 기다리고 있습니다.</Alert>}
      {result && <Stack gap={1.5}>
        <Divider />
        <Stack direction="row" gap={1} flexWrap="wrap"><Chip color="primary" label={result.finalAction === 'BUY' && result.context?.positionStatus === 'HELD' ? '추가 매수 검토' : actions[result.finalAction] || '판단 보류'} /><Chip variant="outlined" label={result.generationMode === 'AI_REVIEWED' ? 'AI 검토 완료' : '자료 확인 필요'} /><Chip variant="outlined" label="승률 미검증" /></Stack>
        <Typography variant="body2">판단 입력: {result.context?.positionStatus === 'HELD' ? '보유 중' : result.context?.positionStatus === 'NOT_HELD' ? '미보유' : '보유 미입력'} · {result.context?.horizonTradingDays == null ? 'AI가 기간 제안' : `${result.context.horizonTradingDays}거래일 직접 지정`} · 가격일 {policy?.priceDate}</Typography>
        {!sameDecisionContext(result.context, requestBody)
          && <Alert severity="info">입력 조건이 변경되었습니다. 아래 AI 답변은 표시된 기존 판단 입력의 결과입니다. 새 조건으로 상세 검토를 요청하세요.</Alert>}
        {!policy?.horizonPlan && <Alert severity="info">이전 형식으로 저장된 판단입니다. 기간별 상세 분석은 새 평가에서 확인할 수 있습니다.</Alert>}
        {policy?.blockReason && <Alert severity="info">{blocks[policy.blockReason] || policy.blockReason}</Alert>}
        {review?.independent && <IndependentReviewView result={result} />}
        {review && !review.independent && <Alert severity="info">이전 방식의 엔진 기반 AI 검토입니다. 독립 분석을 받으려면 같은 입력 새 평가를 실행하세요.</Alert>}
        {!review?.independent && (policy?.horizonPlan ? <DecisionPlanView policy={policy} /> : <><Typography>진입 {plan ? `${format(plan.entryFrom)} ~ ${format(plan.entryTo)}` : '산출 불가'}</Typography>
        <Typography>목표 {plan?.targets?.map(format).join(' / ') || '산출 불가'} · 손절 {format(plan?.stopLoss)}</Typography>
        <Typography variant="body2">첫 목표 손익비 {policy?.rewardRisk == null ? '산출 불가' : `${Number(policy.rewardRisk).toFixed(2)}배`} · 비용 미반영</Typography></>)}
        {review && !review.independent && <>
          {review.detail && [['conclusion', '종합 판단'], ['horizonAssessment', '선택 기간의 적합성'], ['entryPlan', '진입 조건과 취소 기준'], ['exitPlan', '목표·손절과 청산 기준'], ['timeReview', '기간 경과 후 재검토']].map(([field, label]) => <Box key={field}>
            <Typography fontWeight={700}>{label}</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-line', my: 0.5 }}>{review.detail[field]?.text}</Typography>
            <MetricReferences ids={review.detail[field]?.metricIds} metrics={policy.metrics} />
          </Box>)}
          {[['supportingReasons', '판단 근거'], ['opposingReasons', '반대 근거']].map(([field, title]) => <Box key={field}><Typography fontWeight={700}>{title}</Typography>{review[field].map((r, i) => <Typography key={i} variant="body2" mt={0.5}>{r.explanation} <Typography component="span" variant="caption" color="text.secondary">({r.evidenceId})</Typography></Typography>)}</Box>)}
          {review.scenarios.map(s => <Box key={s.conditionId}><Typography fontWeight={700}>{conditions[s.conditionId]}</Typography><Typography variant="caption" color="text.secondary">{policy.conditions[s.conditionId]}</Typography>{s.trigger && <Typography variant="body2">확인 조건: {s.trigger}</Typography>}<Typography variant="body2">대응: {s.response}</Typography>{s.invalidation && <Typography variant="body2">무효화 조건: {s.invalidation}</Typography>}<MetricReferences ids={s.metricIds} metrics={policy.metrics} /></Box>)}
          {!!review.missingInformation.length && <Alert severity="info">부족한 정보: {review.missingInformation.join(' · ')}</Alert>}
          <Typography variant="body2">재검토 조건: {review.reviewConditionIds.map(id => policy.conditions[id]).join(' · ')}</Typography>
        </>}
        <Alert severity="info">{policy?.limitations} 저장 후 시세나 보유 상태가 변했다면 새 분석을 실행하세요.</Alert>
      </Stack>}
      {job && ['SUCCEEDED', 'FAILED'].includes(job.status) && <Button variant="outlined" onClick={() => execute('revision', job.id)} disabled={busy || !aiConfigured}>같은 입력 새 평가 (AI 재호출)</Button>}
      <Accordion defaultExpanded={!embedded} disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography fontWeight={700}>저장된 판단 이력</Typography></AccordionSummary>
      <AccordionDetails><Stack gap={1.5}>
      {historyError && <Alert severity="warning">이력 조회 실패: {historyError}</Alert>}
      {!history.length && !historyError && <Typography variant="body2" color="text.secondary">저장된 판단이 없습니다.</Typography>}
      {history.map(item => <Stack direction="row" key={item.id} alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="body2">{new Date(item.createdAt).toLocaleString('ko-KR')} · {actions[item.action] || (item.status === 'FAILED' ? '실패' : '진행 중')}</Typography>
        {item.snapshotId === savedSnapshotId ? <Button onClick={() => execute('open', item.id)} disabled={busy}>조회</Button>
          : <Button component="a" href={`?snapshot=${encodeURIComponent(item.snapshotId)}&decision=${encodeURIComponent(item.id)}`}>해당 분석 열기</Button>}
      </Stack>)}
      <Stack direction="row" gap={1}><Button disabled={busy || historyPage === 0} onClick={() => setHistoryPage(p => p - 1)}>이전</Button><Button disabled={busy || !hasMore} onClick={() => setHistoryPage(p => p + 1)}>다음</Button></Stack>
      </Stack></AccordionDetails></Accordion>
    </Stack>
  </SectionCard>;
}
