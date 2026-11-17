import { useEffect, useState } from 'react';
import { Alert, Button, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import SectionCard from '../../components/common/SectionCard';
import { getAccountRisk, saveAccountRisk } from '../../api/accountRiskApi';

const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const empty = () => ({ totalAssets: '', availableCash: '', maxLossPerTrade: '', maxPositionPercent: '', balanceDate: today(), expectedRevision: 0 });
const fields = [['totalAssets', '총자산 (현금 포함, 원)'], ['availableCash', '매수 가능 현금 (원)'], ['maxLossPerTrade', '거래당 허용 손실액 (원)'], ['maxPositionPercent', '종목별 최대 비중 (%)']];
const decimal = value => /^(0|[1-9]\d{0,11})(\.\d{1,2})?$/.test(value);
const toDraft = settings => settings ? { ...Object.fromEntries(fields.map(([key]) => [key, String(settings[key])])), balanceDate: settings.balanceDate, expectedRevision: settings.revision } : empty();

export default function AccountRiskSettings() {
  const [draft, setDraft] = useState(empty); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [reload, setReload] = useState(0);
  useEffect(() => {
    const c = new AbortController(); setLoading(true); setError(''); setNotice('');
    getAccountRisk(c.signal).then(view => {
      if (c.signal.aborted) return;
      setUnavailable(view.status === 'UNAVAILABLE');
      if (view.status === 'UNAVAILABLE') setError(view.message || '계좌 위험 설정을 조회하지 못했습니다.');
      else setDraft(toDraft(view.settings));
    }).catch(e => { if (!c.signal.aborted) { setUnavailable(true); setError(e.message); } })
      .finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [reload]);
  const valid = fields.every(([key]) => decimal(draft[key])) && Number(draft.totalAssets) >= 0 && Number(draft.availableCash) <= Number(draft.totalAssets)
    && Number(draft.maxLossPerTrade) <= Number(draft.totalAssets) && Number(draft.maxPositionPercent) <= 100 && draft.balanceDate && draft.balanceDate <= today();
  const save = async event => {
    event.preventDefault(); if (!valid || busy || loading || unavailable) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const saved = await saveAccountRisk(draft); setDraft(toDraft(saved));
      setNotice('저장했습니다. 새 통합 판단부터 반영하며, 기존 판단의 수량과 설정은 유지됩니다.');
    } catch (e) { setError(e.status === 409 ? `${e.message} 최신 설정을 다시 조회한 뒤 저장하세요.` : e.message); }
    finally { setBusy(false); }
  };
  return <section id="account-risk" style={{ scrollMarginTop: 88 }}>
    <SectionCard title="계좌 위험 설정" caption="서버가 현금·허용 손실·최대 비중에 따른 신규·추가매수 및 한도 초과분 축소 수량을 계산합니다.">
      <Stack component="form" onSubmit={save} gap={2}>
        <Typography variant="body2">계좌를 합산한 금액을 직접 입력하세요. 증권사 자동 연동이 아니며, 저장만으로 AI 분석이나 주문이 실행되지는 않습니다.</Typography>
        {loading && <LinearProgress aria-label="계좌 위험 설정 조회 중" />}
        {error && <Alert severity="warning">{error}</Alert>}
        {notice && <Alert severity="success">{notice}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} flexWrap="wrap">
          {fields.map(([key, label]) => <TextField key={key} required type="number" label={label} value={draft[key]} onChange={e => { setDraft(value => ({ ...value, [key]: e.target.value })); setNotice(''); }} disabled={loading || busy || unavailable}
            inputProps={{ min: 0, max: key === 'maxPositionPercent' ? 100 : 999999999999.99, step: 0.01 }} sx={{ flex: { xs: '0 1 auto', sm: '1 1 220px' }, minWidth: 0 }} />)}
          <TextField required type="date" label="계좌 금액 확인일" value={draft.balanceDate} onChange={e => { setDraft(value => ({ ...value, balanceDate: e.target.value })); setNotice(''); }} disabled={loading || busy || unavailable} InputLabelProps={{ shrink: true }} inputProps={{ max: today() }} />
        </Stack>
        <Typography variant="body2" color="text.secondary">수량 계산에는 판단 당일 기준의 계좌 설정과 보유 수량 확인이 필요합니다. 내 보유종목에서 실제 수량을 저장하고, 미보유 종목은 수량 0으로 확인해 저장하세요. 추가매수는 기존 보유분이 사용하는 비중·손절 위험을 먼저 차감하며, 부분 매도는 한도 초과분만 계산합니다. 현금·허용 손실·최대 비중 중 하나가 0이면 신규 매수 수량도 0입니다.</Typography>
        {draft.balanceDate && draft.balanceDate < today() && <Alert severity="info">설정 기준일이 오늘보다 이전입니다. 실제 현금과 자산을 확인한 후 오늘 기준으로 저장해야 수량을 계산할 수 있습니다.</Alert>}
        <Stack direction="row" gap={1}><Button variant="contained" type="submit" disabled={loading || busy || unavailable || !valid}>{busy ? '저장 중…' : '계좌 위험 설정 저장'}</Button><Button disabled={loading || busy} onClick={() => setReload(value => value + 1)}>최신 설정 다시 조회</Button></Stack>
        <Typography variant="caption">버전 {draft.expectedRevision || '미등록'} · 개별 판단의 계획상 수량 상한이며, 동시에 생성한 다른 판단의 현금을 예약하거나 실제 손실 한도를 보장하지 않습니다.</Typography>
      </Stack>
    </SectionCard>
  </section>;
}
