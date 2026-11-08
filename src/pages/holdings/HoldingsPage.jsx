import { useEffect, useState } from 'react';
import { Alert, Button, Stack, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/common/SectionCard';
import { listHoldings, saveHolding } from '../../api/holdingsApi';
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const blank = () => ({ stockCode: '', stockName: '', quantity: '', averageBuyPrice: '', purchasedOn: '', balanceDate: today(), stopPrice: '', targetPrice: '', expectedRevision: 0 });
export default function HoldingsPage() {
  const [rows, setRows] = useState([]);
  const [draft, setDraft] = useState(blank);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const c = new AbortController(); setLoading(true); setError('');
    listHoldings(c.signal).then(data => { if (!c.signal.aborted) setRows(data); })
      .catch(e => { if (!c.signal.aborted) setError(e.message); }).finally(() => { if (!c.signal.aborted) setLoading(false); });
    return () => c.abort();
  }, [reload]);
  const edit = row => { setDraft({ ...row, quantity: String(row.quantity), averageBuyPrice: row.averageBuyPrice ?? '', purchasedOn: row.purchasedOn || '', stopPrice: row.stopPrice ?? '', targetPrice: row.targetPrice ?? '', expectedRevision: row.revision }); setNotice(''); };
  const save = async event => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const body = { stockName: draft.stockName, quantity: Number(draft.quantity), averageBuyPrice: Number(draft.quantity) === 0 ? null : Number(draft.averageBuyPrice),
        purchasedOn: Number(draft.quantity) === 0 ? null : draft.purchasedOn || null, balanceDate: draft.balanceDate, stopPrice: draft.stopPrice === '' ? null : Number(draft.stopPrice), targetPrice: draft.targetPrice === '' ? null : Number(draft.targetPrice), expectedRevision: draft.expectedRevision };
      const saved = await saveHolding(draft.stockCode, body);
      setRows(previous => [...previous.filter(row => row.stockCode !== saved.stockCode), saved].sort((a, b) => a.stockCode.localeCompare(b.stockCode)));
      edit(saved); setNotice('저장했습니다. 다음 분석 실행부터 반영됩니다.');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return <Stack gap={2.5}>
    <Typography variant="h1">내 보유종목</Typography>
    <Alert severity="info">계좌 전체를 합산한 국내 주식 잔고를 직접 등록합니다. 전량 매도한 종목은 수량을 0으로 저장하세요. 미등록 종목은 보유 미확인으로 처리합니다. 증권사 자동 연동은 아닙니다.</Alert>
    {loading && <LinearProgress />}
    {error && <Alert severity="error" action={<Button color="inherit" onClick={() => { setDraft(blank()); setReload(n => n + 1); }}>새로고침</Button>}>{error}</Alert>}
    {notice && <Alert severity="success">{notice}</Alert>}
    <SectionCard title={draft.expectedRevision ? '보유정보 수정' : '보유종목 등록'}>
      <Stack component="form" onSubmit={save} gap={2}>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
          <TextField label="종목코드" required value={draft.stockCode} disabled={busy || !!draft.expectedRevision} onChange={e => setDraft({ ...draft, stockCode: e.target.value })} inputProps={{ pattern: '[0-9]{6}', maxLength: 6 }} />
          <TextField label="종목명" required value={draft.stockName} disabled={busy} onChange={e => setDraft({ ...draft, stockName: e.target.value })} inputProps={{ maxLength: 100 }} />
          <TextField label="보유수량" type="number" required value={draft.quantity} disabled={busy} onChange={e => setDraft({ ...draft, quantity: e.target.value })} inputProps={{ min: 0, max: 9999999999, step: 1 }} />
          <TextField label="평균 매입단가" type="number" required={Number(draft.quantity) > 0} value={draft.averageBuyPrice} disabled={busy || draft.quantity === '0'} onChange={e => setDraft({ ...draft, averageBuyPrice: e.target.value })} inputProps={{ min: 0.01, max: 999999999999.99, step: 0.01 }} />
        </Stack>
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.5}>
          {[['balanceDate', '잔고 기준일', true], ['purchasedOn', '매수일 (선택)', false]].map(([key, label, required]) => <TextField key={key} label={label} type="date" required={required} value={draft[key]} disabled={busy} onChange={e => setDraft({ ...draft, [key]: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} inputProps={{ max: today() }} />)}
          {[['stopPrice', '개인 손절가 (선택)'], ['targetPrice', '개인 목표가 (선택)']].map(([key, label]) => <TextField key={key} label={label} type="number" value={draft[key]} disabled={busy} onChange={e => setDraft({ ...draft, [key]: e.target.value })} inputProps={{ min: 0.01, step: 0.01 }} />)}
        </Stack>
        <Typography variant="caption">잔고 기준일 이후의 분석 가격에만 손익을 계산합니다. 매수일을 모르면 비워두세요. 개인 목표가·손절가가 없으면 분석에서 산출한 참고선을 사용합니다.</Typography>
        <Stack direction="row" gap={1}><Button type="submit" variant="contained" disabled={busy || loading}>{busy ? '저장 중…' : '저장'}</Button><Button disabled={busy} onClick={() => setDraft(blank())}>새 종목 등록</Button></Stack>
      </Stack>
    </SectionCard>
    <SectionCard title={`등록 잔고 ${rows.length}종목`}>
      <TableContainer><Table size="small" aria-label="등록 보유종목"><TableHead><TableRow>{['종목', '수량', '평균 매입단가', '잔고 기준일', '관리'].map(text => <TableCell key={text}>{text}</TableCell>)}</TableRow></TableHead><TableBody>
        {rows.map(row => <TableRow key={row.stockCode}><TableCell>{row.stockName} · {row.stockCode}</TableCell><TableCell>{Number(row.quantity).toLocaleString('ko-KR')}주</TableCell><TableCell>{row.averageBuyPrice == null ? '미보유' : `${Number(row.averageBuyPrice).toLocaleString('ko-KR')}원`}</TableCell><TableCell>{row.balanceDate}</TableCell><TableCell><Button onClick={() => edit(row)} disabled={busy}>수정</Button><Button component={Link} to={`/analysis/${row.stockCode}`}>분석</Button></TableCell></TableRow>)}
        {!rows.length && !loading && !error && <TableRow><TableCell colSpan={5}>등록된 보유정보가 없습니다.</TableCell></TableRow>}
      </TableBody></Table></TableContainer>
    </SectionCard>
  </Stack>;
}
