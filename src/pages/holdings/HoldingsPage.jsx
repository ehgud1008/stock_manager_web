import { useEffect, useMemo, useState } from 'react';
import { Alert, Autocomplete, Button, Stack, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, LinearProgress } from '@mui/material';
import useStockMaster from '../../features/stock-search/hooks/useStockMaster';
import { searchStockMaster } from '../../features/stock-search/services/stockMasterService';
import { Link } from 'react-router-dom';
import SectionCard from '../../components/common/SectionCard';
import { listHoldings, saveHolding } from '../../api/holdingsApi';
const today = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const blank = () => ({ stockCode: '', stockName: '', quantity: '', averageBuyPrice: '', purchasedOn: '', balanceDate: today(), stopPrice: '', targetPrice: '', expectedRevision: 0 });
export default function HoldingsPage() {
  const { stocks, status: masterStatus, error: masterError } = useStockMaster();
  const [query, setQuery] = useState('');
  const allowed = useMemo(() => stocks.filter(stock => stock.stockType === 'ST' && /^[0-9]{6}$/.test(stock.stockCode)), [stocks]);
  const options = useMemo(() => query.trim() ? searchStockMaster(allowed, query) : allowed.slice(0, 30), [allowed, query]);
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
  const edit = row => { setDraft({ ...row, quantity: String(row.quantity), averageBuyPrice: row.averageBuyPrice ?? '', purchasedOn: row.purchasedOn || '', stopPrice: row.stopPrice ?? '', targetPrice: row.targetPrice ?? '', expectedRevision: row.revision }); setQuery(`${row.stockName} ${row.stockCode}`); setNotice(''); };
  const save = async event => {
    event.preventDefault(); if (!draft.stockCode) return; setBusy(true); setError(''); setNotice('');
    try {
      const body = { stockName: draft.stockName, quantity: Number(draft.quantity), averageBuyPrice: Number(draft.quantity) === 0 ? null : Number(draft.averageBuyPrice),
        purchasedOn: null, balanceDate: today(), stopPrice: null, targetPrice: null, expectedRevision: draft.expectedRevision };
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
          <Autocomplete sx={{ width: { xs: '100%', md: 280 }, flexShrink: 0 }} disabled={busy || !!draft.expectedRevision}
            value={draft.stockCode ? { stockCode: draft.stockCode, stockName: draft.stockName } : null} inputValue={query}
            onInputChange={(_, value, reason) => { setQuery(value); if (reason === 'input') setDraft(current => ({ ...current, stockCode: '', stockName: '' })); }}
            onChange={(_, stock) => setDraft(current => ({ ...current, stockCode: stock?.stockCode || '', stockName: stock?.stockName || '' }))}
            options={options} filterOptions={items => items} loading={masterStatus === 'loading'}
            isOptionEqualToValue={(a, b) => a.stockCode === b.stockCode} getOptionLabel={stock => `${stock.stockName} ${stock.stockCode}`}
            noOptionsText={masterStatus === 'error' ? '종목 목록을 불러오지 못했습니다.' : '검색 결과가 없습니다.'}
            renderInput={params => <TextField {...params} label="종목명 또는 종목코드" required error={masterStatus === 'error'} helperText={masterError?.message} />} />
          <TextField label="보유수량" type="number" required value={draft.quantity} disabled={busy} onChange={e => setDraft({ ...draft, quantity: e.target.value })} inputProps={{ min: 0, max: 9999999999, step: 1 }} />
          <TextField label="평균 매입단가" type="number" required={Number(draft.quantity) > 0} value={draft.averageBuyPrice} disabled={busy || draft.quantity === '0'} onChange={e => setDraft({ ...draft, averageBuyPrice: e.target.value })} inputProps={{ min: 0.01, max: 999999999999.99, step: 0.01 }} />
        </Stack>
        <Typography variant="caption">종목·평균 매입단가·수량을 저장하면 분석 시 매도·유지·추가매수 판단에 자동 반영합니다. 가격 기준일은 분석 결과에서 확인하세요.</Typography>
        <Stack direction="row" gap={1}><Button type="submit" variant="contained" disabled={busy || loading || !draft.stockCode}>{busy ? '저장 중…' : '저장'}</Button><Button disabled={busy} onClick={() => { setDraft(blank()); setQuery(''); }}>새 종목 등록</Button></Stack>
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
