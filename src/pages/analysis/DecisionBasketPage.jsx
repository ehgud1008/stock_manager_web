import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Divider, FormControlLabel, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import { listDecisionBasketCandidates, previewDecisionBasket } from '../../api/tradeDecisionApi';

const maxSelection = 20;
const format = value => value == null ? '확인 불가' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const money = value => value == null ? '확인 불가' : `${format(value)}원`;
const time = value => new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
const limitLabels = {
  WITHIN_LIMIT: '검토 한도 이내', EXCEEDED: '한도 초과', INCOMPLETE: '일부 판단 제외로 판정 보류', UNAVAILABLE: '비교 불가',
};
const lineLabels = {
  SIZING_UNAVAILABLE: '저장 수량·금액·위험 자료 부족',
  ANALYSIS_REFRESH: '분석 유효기간 확인 및 새 판단 필요',
  RESEARCH_REFRESH: '뉴스·공시 확인 및 새 판단 필요',
  ACCOUNT_CHANGED: '계좌 설정이 변경되어 새 판단 필요',
  HOLDING_UNAVAILABLE: '수동 보유정보 조회 실패',
  HOLDING_UNCONFIRMED: '오늘 기준 보유 수량 또는 명시적 0주 등록 필요',
  HOLDING_CHANGED: '등록 보유정보가 변경되어 새 판단 필요',
};
const cashLabels = {
  STALE: '가용 현금의 기준일이 오늘과 다릅니다.',
  NOT_CONFIGURED: '계좌 위험 설정에 가용 현금을 등록하세요.',
  UNAVAILABLE: '계좌 위험 설정을 조회하지 못했습니다.',
};

function LimitResult({ label, total, limit }) {
  const severity = limit.status === 'EXCEEDED' ? 'error' : limit.status === 'WITHIN_LIMIT' ? 'success' : 'warning';
  return <Alert severity={severity} sx={{ flex: 1, minWidth: 0 }}>
    <Typography fontWeight={700}>{label} · {limitLabels[limit.status]}</Typography>
    <Typography variant="body2">합계 {money(total)} / 한도 {money(limit.amount)}</Typography>
    {limit.remaining != null && <Typography variant="body2">{limit.remaining < 0 ? '초과' : '남은 한도'} {money(Math.abs(limit.remaining))}</Typography>}
  </Alert>;
}

function PreviewResult({ result }) {
  const partial = result.includedCount < result.items.length;
  return <Stack gap={1.5} aria-label="합산 검토 결과">
    <Typography variant="h6">{partial ? '포함된 판단의 소계' : '선택한 판단의 합계'} · {result.includedCount}/{result.items.length}건</Typography>
    <Stack direction={{ xs: 'column', md: 'row' }} gap={1}>
      <LimitResult label="총매수 금액 / 수동 가용 현금" total={result.purchaseAmount} limit={result.cash} />
      <LimitResult label="총계획 위험 / 이번 검토 한도" total={result.totalRisk} limit={result.risk} />
    </Stack>
    {cashLabels[result.cashStatus] && <Alert severity="warning">{cashLabels[result.cashStatus]}</Alert>}
    <Typography variant="body2">신규·추가 매수 위험 {money(result.additionalRisk)} + 추가매수 대상의 기존 보유 위험 {money(result.existingRisk)}</Typography>
    <Typography variant="caption">등록 현금 기준일 {result.balanceDate || '미확인'} · 설정 버전 {result.accountRevision ?? '미확인'} · 검토 시각 {time(result.checkedAt)} (한국시간)</Typography>
    <Stack divider={<Divider flexItem />} gap={1}>
      {result.items.map(item => <Stack key={item.id} gap={0.5}>
        <Typography fontWeight={600}>{item.stockCode} · {item.action === 'ADD' ? '추가매수' : '신규 매수'}{item.quantity != null && ` · 저장 수량 ${format(item.quantity)}주`}</Typography>
        {item.status === 'INCLUDED'
          ? <Typography variant="body2">매수 {money(item.purchaseAmount)} · 신규 위험 {money(item.additionalRisk)} · 기존 위험 {money(item.existingRisk)}</Typography>
          : <Typography variant="body2" color="warning.main">합산 제외 · {lineLabels[item.status] || '자료 확인 필요'}</Typography>}
        {item.snapshotId && <Button component="a" href={`/unified-analysis/stock?snapshot=${encodeURIComponent(item.snapshotId)}`} sx={{ alignSelf: 'flex-start' }}>저장 분석 열기</Button>}
      </Stack>)}
    </Stack>
  </Stack>;
}

export default function DecisionBasketPage() {
  const [page, setPage] = useState(0);
  const [listing, setListing] = useState(null);
  const [reload, setReload] = useState(0);
  const [selected, setSelected] = useState([]);
  const [riskLimit, setRiskLimit] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    listDecisionBasketCandidates(page, controller.signal)
      .then(data => { if (!controller.signal.aborted) setListing({ page, reload, data }); })
      .catch(e => { if (!controller.signal.aborted) setListing({ page, reload, error: e.message }); });
    return () => controller.abort();
  }, [page, reload]);
  useEffect(() => () => active.current?.abort(), []);

  const current = listing?.page === page && listing.reload === reload ? listing : null;
  const validLimit = /^\d{1,12}(\.\d{1,2})?$/.test(riskLimit);
  const invalidate = () => { setPreview(null); setError(''); };
  const toggle = item => {
    invalidate();
    setSelected(items => items.some(selectedItem => selectedItem.id === item.id)
      ? items.filter(selectedItem => selectedItem.id !== item.id) : [...items, item]);
  };
  const calculate = async event => {
    event.preventDefault();
    if (active.current || !validLimit || selected.length === 0) return;
    const controller = new AbortController();
    active.current = controller;
    invalidate();
    setBusy(true);
    try {
      const result = await previewDecisionBasket({ decisionIds: selected.map(item => item.id), totalRiskLimit: riskLimit }, controller.signal);
      if (!controller.signal.aborted) setPreview(result);
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message);
    } finally {
      active.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  return <>
    <PageHeader eyebrow="AI 통합 매매 판단" title="다종목 위험 검토"
      description="저장된 매수 판단을 골라 총매수 금액과 손절 기준 위험을 비교합니다." chip="현금 예약 없음" />
    <Stack gap={2}>
      <SectionCard title="검토할 매수 판단" caption="같은 종목은 판단 하나만 선택할 수 있습니다. 새 판단과 개정은 목록 상단부터 확인하세요.">
        <Stack gap={1}>
          {!current && <LinearProgress aria-label="매수 판단 조회 중" />}
          {current?.error && <Alert severity="error" action={<Button onClick={() => setReload(n => n + 1)}>재시도</Button>}>{current.error}</Alert>}
          {current?.data?.items.length === 0 && <Typography>이 페이지에 저장된 통합 매수 판단이 없습니다.</Typography>}
          {current?.data?.items.map(item => {
            const checked = selected.some(s => s.id === item.id);
            const duplicate = !checked && selected.some(s => s.stockCode === item.stockCode);
            return <FormControlLabel key={item.id} disabled={busy || duplicate || (!checked && selected.length >= maxSelection)}
              control={<Checkbox checked={checked} onChange={() => toggle(item)} />}
              label={`${item.stockCode} · ${time(item.completedAt)}${duplicate ? ' · 같은 종목 선택됨' : ''}`} />;
          })}
          <Stack direction="row" gap={1}>
            <Button disabled={page === 0 || !current} onClick={() => setPage(p => p - 1)}>이전</Button>
            <Button disabled={!current?.data?.hasMore} onClick={() => setPage(p => p + 1)}>다음</Button>
          </Stack>
        </Stack>
      </SectionCard>
      <SectionCard title={`선택한 판단 ${selected.length} / ${maxSelection}`}>
        <Stack component="form" onSubmit={calculate} gap={1.5}>
          {selected.map(item => <Stack key={item.id} direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="body2">{item.stockCode} · {time(item.completedAt)}</Typography>
            <Button disabled={busy} onClick={() => toggle(item)} aria-label={`${item.stockCode} 선택 해제`}>해제</Button>
          </Stack>)}
          <TextField label="이번 검토의 총위험 한도 (원)" value={riskLimit} disabled={busy}
            onChange={event => { setRiskLimit(event.target.value); invalidate(); }}
            error={Boolean(riskLimit) && !validLimit}
            helperText="거래당 허용 손실과 별도로 입력합니다. 원 단위 정수 또는 소수 둘째 자리까지 입력할 수 있습니다."
            slotProps={{ htmlInput: { inputMode: 'decimal' } }} />
          <Typography variant="body2">선택 종목의 저장 가격·수량을 사용합니다. 매도 대금, 선택 밖 보유 종목, 현재 시세는 합산 범위에서 제외됩니다. 검토 결과는 현금을 예약하지 않습니다.</Typography>
          <Button type="submit" variant="contained" disabled={busy || !validLimit || !selected.length}>현금·위험 합산 검토</Button>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
            <Button href="/settings#account-risk">등록 현금 확인</Button>
            <Button href="/holdings">등록 보유정보 확인</Button>
          </Stack>
          {busy && <LinearProgress aria-label="합산 검토 중" />}
          {error && <Alert severity="error">{error}</Alert>}
          {preview && <PreviewResult result={preview} />}
        </Stack>
      </SectionCard>
    </Stack>
  </>;
}
