import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Chip, Divider, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import SectionCard from '../../components/common/SectionCard';
import * as api from '../../api/tradeDecisionApi';

const actions = { BUY: '신규 매수 검토', ADD: '추가매수 검토', HOLD: '보유 유지', REDUCE: '부분 매도 검토', SELL: '전량 매도 검토', WAIT: '신규 진입 대기', DEFER: '판단 보류' };
const blocks = { QUANTITY_POLICY_UNAVAILABLE: '추가매수·부분 매도 수량 정책이 없어 보유 유지로 제한했습니다.', ENTRY_NOT_ELIGIBLE: '공통 신규 진입 조건을 충족하지 못했습니다.', ANALYSIS_INCOMPLETE: '필수 분석 자료가 부족합니다.', ANALYSIS_EXPIRED: '분석 기준일이 오래되어 재분석이 필요합니다.', ANALYSIS_FUTURE: '분석 시점을 확인해야 합니다.', RESEARCH_MISSING: '완료된 외부 리서치가 없습니다.', RESEARCH_EXPIRED: '외부 리서치가 만료됐습니다.', RESEARCH_INSUFFICIENT: '외부 근거가 부족합니다.', RESEARCH_INVALID: '리서치 시점을 확인해야 합니다.', RESEARCH_FUTURE: '리서치 시점이 판단 시점보다 미래입니다.', RESEARCH_CONFLICT: '외부 자료가 엔진 신호의 재검토를 요구합니다.', POSITION_UNKNOWN: '보유정보를 확인할 수 없습니다.', ENGINE_EXIT_PRIORITY: '확인된 엔진 청산 신호를 우선했습니다.', STOP_REFERENCE_BREACHED: '분석 가격이 손절 참고선 이하입니다.', PLAN_MISSING: '가격 계획이 없습니다.' };
const states = { WAITING_DATA: '후속 일봉 대기', DATA_GAP: '가격 자료 누락·불일치', WAITING_CALENDAR: '거래일 달력 보완 필요', OPEN: '모의 보유 중', CLOSED: '모의 청산 완료', OBSERVED: '가격 비교 완료', NOT_ENTERED: '진입 조건 미충족', DEFERRED: '판단 보류', SUSPENDED: '유효 거래 부족', ANCHOR_UNAVAILABLE: '기준 일봉 미확보', PLAN_UNAVAILABLE: '평가 계획 미확보' };
const percent = value => value == null ? '관측 중' : `${Number(value).toFixed(2)}%`;
const extraBlocks = { PERSONAL_STOP_REVIEW: '분석 가격이 저장한 개인 손절가 이하입니다. 최신 잔고와 가격으로 청산 조건을 확인하세요.', PLAN_INVALID: '가격 계획의 순서나 유효성을 확인해야 합니다.', ANALYSIS_INVALID: '분석 기준 시점을 확인할 수 없습니다.' };

export default function IntegratedDecisionPanel({ snapshotId, stockCode, aiConfigured, prepareSnapshot }) {
  const [horizon, setHorizon] = useState('20'); const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [history, setHistory] = useState([]); const [page, setPage] = useState(0); const [hasMore, setHasMore] = useState(false);
  const [comparison, setComparison] = useState(null); const active = useRef(null); const effectiveSnapshot = useRef(snapshotId);
  useEffect(() => { effectiveSnapshot.current = snapshotId; }, [snapshotId]);
  useEffect(() => {
    if (!snapshotId) return;
    const c = new AbortController();
    api.listDecisions(stockCode, c.signal, page, snapshotId).then(list => {
      if (c.signal.aborted) return;
      const items = list.items.filter(item => item.mode === 'INTEGRATED_DECISION');
      setHistory(items); setHasMore(list.hasMore);
      if (page === 0 && items[0]) return api.getDecision(items[0].id, c.signal).then(saved => { if (!c.signal.aborted) setJob(saved); });
    }).catch(e => { if (!c.signal.aborted) setError(e.message); });
    return () => c.abort();
  }, [snapshotId, stockCode, page]);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    if (!job || !api.isJobPending(job) || busy) return;
    const c = new AbortController();
    api.waitForJob(job, api.getDecision, c.signal).then(done => { if (!c.signal.aborted) setJob(done); })
      .catch(e => { if (!c.signal.aborted) setError(e.message); });
    return () => c.abort();
  }, [job, busy]);
  useEffect(() => {
    setComparison(null);
    if (job?.status !== 'SUCCEEDED') return;
    const c = new AbortController();
    api.getDecisionComparison(job.id, c.signal).then(value => { if (!c.signal.aborted) setComparison(value); })
      .catch(e => { if (!c.signal.aborted) setError(`성과 조회: ${e.message}`); });
    return () => c.abort();
  }, [job]);
  const execute = async (id = null, fresh = false) => {
    if (active.current) return;
    const c = new AbortController(); active.current = c; setBusy(true); setError('');
    try {
      let initial;
      if (id) initial = await api.getDecision(id, c.signal);
      else {
        let snapshot = effectiveSnapshot.current;
        if (!snapshot) { const prepared = await prepareSnapshot(c.signal); snapshot = prepared.id; effectiveSnapshot.current = snapshot; }
        if (c.signal.aborted) return;
        const body = { horizonTradingDays: Number(horizon) };
        initial = await api.startIntegratedDecision(snapshot, body, api.requestIdentity(`integrated-v1:${snapshot}`, body, fresh), c.signal);
      }
      if (c.signal.aborted) return;
      if (initial.snapshotId !== effectiveSnapshot.current || initial.mode !== 'INTEGRATED_DECISION') throw new Error('현재 분석에 속한 통합 판단이 아닙니다.');
      setJob(initial);
      const done = await api.waitForJob(initial, api.getDecision, c.signal);
      if (!c.signal.aborted) { setJob(done); setHistory(items => [{ id: done.id, mode: done.mode, createdAt: done.createdAt, status: done.status }, ...items.filter(item => item.id !== done.id)]); }
    } catch (e) { if (!c.signal.aborted) setError(e.message); }
    finally { if (active.current === c) { active.current = null; setBusy(false); } }
  };
  const result = job?.result; const policy = result?.policy; const review = result?.aiReview;
  const valid = Number.isInteger(Number(horizon)) && Number(horizon) >= 1 && Number(horizon) <= 252;
  return <SectionCard title="AI 통합 매매 판단" caption="기술적 분석·완료 뉴스 리서치·현재 등록 잔고를 함께 검토합니다.">
    <Stack gap={2}>
      <Alert severity="info">주문 전 검토 의견입니다. 자동 주문은 실행하지 않습니다. 먼저 뉴스·업황 분석을 완료하면 같은 분석의 최신 리서치를 연결합니다.</Alert>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
        <TextField type="number" label="관측 기간 (거래일)" value={horizon} onChange={e => setHorizon(e.target.value)} inputProps={{ min: 1, max: 252 }} disabled={busy} />
        <Button variant="contained" disabled={busy || !aiConfigured || !valid || api.isJobPending(job)} onClick={() => execute()}>통합 판단 실행</Button>
        {job && !api.isJobPending(job) && <Button disabled={busy || !aiConfigured || !valid} onClick={() => execute(null, true)}>현재 잔고로 새 판단</Button>}
      </Stack>
      {!aiConfigured && <Alert severity="info">AI 설정 후 새 판단을 실행할 수 있습니다. 저장 이력은 조회할 수 있습니다.</Alert>}
      {(busy || api.isJobPending(job)) && <LinearProgress aria-label="통합 판단 진행 중" />}
      {error && <Alert severity="error">{error}</Alert>}
      {job?.status === 'FAILED' && <Alert severity="error">{api.decisionErrorMessage(job.errorCode)}</Alert>}
      {job?.status === 'FAILED' && job.context?.engineAction && <Alert severity="warning">최종 AI 의견은 확정하지 못했습니다. 저장된 엔진 의견: {actions[job.context.engineAction]} · 분석 가격일 {job.context.priceDate}{['EXIT_TRIGGERED', 'SELL_PRIORITY'].includes(job.context.ruleAction) ? ' · 당시 청산 신호가 기록돼 있습니다. 최신 분석으로 유효성을 다시 확인하세요.' : ''}</Alert>}
      {result && <>
        <Stack direction="row" gap={1} flexWrap="wrap"><Chip color="primary" label={actions[result.decisionAction] || '판단 보류'} /><Chip label="실행 검증 전" variant="outlined" /><Chip label="승률 미검증" variant="outlined" /></Stack>
        <Typography>엔진: {actions[result.engineAction]} · AI: {actions[result.aiAction]} · 최종: {actions[result.decisionAction]}</Typography>
        {result.blockReasons?.map((reason, i) => <Alert key={`${reason}-${i}`} severity="warning">{blocks[reason] || extraBlocks[reason] || api.decisionErrorMessage(reason)}</Alert>)}
        <Typography>{review?.conclusion || 'AI 의견을 확정하지 못했습니다. 엔진 판단과 확인된 사건을 함께 확인하세요.'}</Typography>
        <Typography variant="body2">분석 가격일 {policy.priceDate} · 고정 시각 {new Date(policy.capturedAt).toLocaleString('ko-KR')} · 잔고 버전 {policy.holding?.holding?.revision ?? '미등록/미확인'}</Typography>
        <Typography variant="body2">리서치: {policy.research.status === 'VALID' ? '연결 완료' : '미확보·만료·근거 확인 필요'} · {policy.research.jobId || '연결 없음'}</Typography>
        <Typography variant="body2">매수 수량 미산출: 계좌 현금·허용 위험 정보가 없습니다. 새 자료나 신호 만료 시 새 분석과 판단이 필요합니다.</Typography>
        {policy.plan && <Typography variant="body2">엔진 가격 계획: 진입 {Number(policy.plan.entryFrom).toLocaleString('ko-KR')}~{Number(policy.plan.entryTo).toLocaleString('ko-KR')}원 · 손절 {Number(policy.plan.stopLoss).toLocaleString('ko-KR')}원 · 목표 {policy.plan.targets.map(v => Number(v).toLocaleString('ko-KR')).join(' / ')}원</Typography>}
        {['supportingReasons', 'opposingReasons'].map(group => <Stack key={group} gap={1}><Typography fontWeight={600}>{group === 'supportingReasons' ? '판단 근거' : '반대 근거'}</Typography>{review?.[group]?.map((reason, i) => <Stack key={i} gap={0.5}><Typography variant="body2">{reason.text}</Typography>{reason.quote && <Typography component="blockquote" variant="body2" sx={{ m: 0, pl: 2, borderLeft: 2, borderColor: 'divider' }}>“{reason.quote}”</Typography>}{reason.sourceIds?.map(id => { const source = policy.research.sources.find(s => s.id === id); return source && <Typography key={id} variant="caption">출처: {source.title}</Typography>; })}</Stack>)}</Stack>)}
        {!!review?.reviewConditions?.length && <Stack gap={0.5}><Typography fontWeight={600}>재검토 조건</Typography>{review.reviewConditions.map((v, i) => <Typography key={i} variant="body2">• {v}</Typography>)}</Stack>}
        {!!review?.missingInformation?.length && <Alert severity="info">{review.missingInformation.join(' ')}</Alert>}
        <Divider /><Typography fontWeight={600}>판단 이후 모의 성과</Typography>
        <Typography variant="caption">판단 완료 다음 거래일부터 관측합니다. 비용 합산 가정 왕복 30bp, 체결 차이 편도 10bp이며 실제 계좌 수익률이 아닙니다. 다중 목표는 동일 비율로 평가합니다.</Typography>
        {comparison?.plans?.map(plan => <Typography key={plan.id} variant="body2">{plan.role === 'ENGINE' ? '엔진 기준' : 'AI 최종'}: {states[plan.outcome.status] || '관측 대기'} · 순수익률 {percent(plan.outcome.netReturnPct)}{plan.outcome.ambiguous ? ' · 같은 일봉 목표·손절 접촉: 손절 우선 가정' : ''}</Typography>)}
        {comparison?.status === 'READY' && <Typography>엔진 대비 차이: {Number(comparison.netReturnDifferencePct).toFixed(2)}%p</Typography>}
        {job.status === 'SUCCEEDED' && <Button onClick={() => execute(job.id)} disabled={busy}>저장 판단·성과 다시 조회</Button>}
      </>}
      <Divider /><Typography fontWeight={600}>통합 판단 이력</Typography>
      {!history.length && <Typography variant="body2">이 페이지에 저장된 통합 판단이 없습니다.</Typography>}
      {history.map(item => <Button key={item.id} onClick={() => execute(item.id)} disabled={busy}>{new Date(item.createdAt).toLocaleString('ko-KR')} · {item.status === 'SUCCEEDED' ? '완료' : item.status === 'FAILED' ? '실패' : '진행 중'}</Button>)}
      <Stack direction="row"><Button disabled={page === 0 || busy} onClick={() => setPage(p => p - 1)}>이전 이력</Button><Button disabled={!hasMore || busy} onClick={() => setPage(p => p + 1)}>다음 이력</Button></Stack>
    </Stack>
  </SectionCard>;
}
