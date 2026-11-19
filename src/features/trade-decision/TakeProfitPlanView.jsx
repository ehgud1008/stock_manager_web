import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Divider, Stack, TextField, Typography } from '@mui/material';
import { previewTakeProfit } from '../../api/tradeDecisionApi';

const number = value => Number(value).toLocaleString('ko-KR');

export default function TakeProfitPlanView({ decisionId, targets }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(() => targets.map(() => ''));
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  const total = values.reduce((sum, value) => sum + Math.round(Number(value) * 100), 0);
  const valid = values.every(value => /^\d{1,3}(\.\d{1,2})?$/.test(value)) && total <= 10000;
  const submit = async event => {
    event.preventDefault();
    if (!valid || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setResult(null); setError('');
    try {
      const data = await previewTakeProfit(decisionId, values, controller.signal);
      if (!controller.signal.aborted) setResult(data);
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      active.current = null;
    }
  };
  return <Stack gap={1.2}>
    <Divider />
    <Button sx={{ alignSelf: 'flex-start' }} aria-expanded={open} onClick={() => setOpen(v => !v)}>익절 분할 매도 수량 계산</Button>
    {open && <Stack component="form" onSubmit={submit} gap={1.2}>
      <Typography variant="body2">오늘 확인한 수동 보유 수량에서 목표별로 줄일 비율을 직접 입력하세요. 합계는 최대 100%입니다. 이 계산은 익절 계획에만 적용합니다.</Typography>
      {targets.map((target, index) => <TextField key={`${index}-${target}`} size="small"
        label={`목표 ${index + 1} · ${number(target)}원 축소율 (%)`} value={values[index]} disabled={busy}
        slotProps={{ htmlInput: { inputMode: 'decimal' } }}
        onChange={event => { setValues(values.map((value, i) => i === index ? event.target.value : value)); setResult(null); setError(''); }} />)}
      <Typography variant="caption">사용하지 않는 목표는 0%로 입력합니다. 누적 비율로 계산한 수량을 내림하고 이전 목표 수량을 차감합니다.</Typography>
      {total > 10000 && <Alert severity="warning">목표별 비율 합계가 100%를 초과했습니다.</Alert>}
      <Button type="submit" variant="outlined" disabled={!valid || busy}>익절 수량 확인</Button>
      {error && <Alert severity="warning">{error} <Button href="/holdings">등록 보유정보 확인</Button></Alert>}
      {result && <Alert severity="info">
        <Typography>등록 {number(result.heldQuantity)}주 · 계획 {number(result.plannedQuantity)}주 · 남길 수량 {number(result.remaining)}주</Typography>
        {result.targets.map(target => <Typography key={target.price} variant="body2">{number(target.price)}원 · {number(target.percent)}% · {number(target.quantity)}주</Typography>)}
        <Typography variant="caption">수동 등록 기준일 {result.balanceDate} · 보유 버전 {result.holdingRevision} · 참고용 계획</Typography>
      </Alert>}
    </Stack>}
  </Stack>;
}
