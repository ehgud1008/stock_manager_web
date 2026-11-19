import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Grid, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Typography } from '@mui/material';
import SectionCard from '../../components/common/SectionCard';
import httpClient from '../../api/httpClient';

const endpoint = '/v1/swing-backtests/market-runs';
const states = { QUEUED: '대기', RUNNING: '실행 중', COMPLETE: '완료', CANCELLED: '중단', FAILED: '실패' };
const marketNames = { ALL: 'KOSPI + KOSDAQ', KOSPI: 'KOSPI', KOSDAQ: 'KOSDAQ' };
const strategies = { BREAKOUT: '20일 최고가 돌파', VOLUME_BREAKOUT: '20일 돌파 + 거래량 1.5배' };
const settlement = { UNRESOLVED: '계좌 성과 미확정', WRITE_OFF: '회수액 0원 가정' };
const labels = { NO_OPEN: '시가 없음', BASIS_CHANGE: '기준가 변경', UNKNOWN_EQUITY: '평가액 미확인',
  ALREADY_HELD: '기보유', POSITION_LIMIT: '보유 한도', INSUFFICIENT_CASH: '현금 부족', CLOSED: '청산',
  OPEN: '보유 중', WINDOW_ENDED: '기간 종료', UNRESOLVED: '가격 추적 중단', WRITE_OFF: '회수액 0원 가정' };
const fmt = (n, unit = '') => n == null ? '미확인' : Number(n).toLocaleString('ko-KR', { maximumFractionDigits: 2 }) + unit;
const ago = (days) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date(Date.now() - days * 86400000));
const initial = () => ({ market: 'ALL', strategy: 'BREAKOUT', from: ago(366), to: ago(1),
  capital: 10000000, positions: 5, hold: 5, feeBps: 15, slipBps: 5, minTurnover: 0, missingSettlement: 'UNRESOLVED' });
const fields = [
  ['capital', '초기 자금 (원)', 10000, 1000000000000], ['positions', '동시 보유 한도', 1, 100],
  ['hold', '보유 거래일', 1, 25], ['minTurnover', '최소 일 거래대금 (원)', 0, 1000000000000000],
  ['feeBps', '편도 비용 (bp)', 0, 500], ['slipBps', '편도 슬리피지 (bp)', 0, 500],
];
const metrics = [['sessions','거래일','일'],['signals','선정','건'],['entered','진입','건'],['closed','청산','건'],['wins','수익 거래','건'],
  ['winRate','승률','%'],['averageNet','거래당 평균 순손익','원'],['averageWin','평균 이익','원'],['averageLoss','평균 손실','원'],
  ['meanTradeReturn','거래당 평균 순수익률','%'],['profitFactor','총이익 / 총손실','배'],
  ['returnPct','계좌 수익률','%'],['maxDrawdown','최대낙폭','%'],['open','미청산','건'],['unconfirmedWeekdays','휴장 여부 미확인 평일','일'],['writeOffs','회수액 0원 처리','건']];
const describe = j => marketNames[j.spec.market] + ' · ' + strategies[j.spec.strategy] + ' · ' + j.spec.from + ' ~ ' + j.spec.to + ' · ' + j.id.slice(0, 8);

function monthlyReturns(result) {
  const months = [];
  let previous = result.spec.capital;
  for (const day of result.days) {
    const month = day.date.slice(0, 7);
    if (months.at(-1)?.month !== month) months.push({ month, start: previous, sessions: 0 });
    const current = months.at(-1);
    current.sessions++;
    current.end = day.equity;
    previous = day.equity;
  }
  return months;
}

export default function MarketResearch() {
  const [form, setForm] = useState(initial);
  const [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState('');
  const [other, setOther] = useState('');
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailAttempt, setDetailAttempt] = useState(0);
  const request = useRef(0);
  const key = useRef(null);
  const job = jobs.find(item => item.id === selected);
  const compare = jobs.find(item => item.id === other);
  const active = jobs.some(j => ['RUNNING','QUEUED'].includes(j.state));
  const refresh = useCallback(async (preferred) => {
    const revision = ++request.current;
    const { data } = await httpClient.get(endpoint);
    if (revision !== request.current) return;
    setJobs(data.data);
    setSelected(id => data.data.find(item => item.id === (preferred || id))?.id || data.data[0]?.id || '');
  }, []);
  useEffect(() => {
    refresh().catch(e => setError(e.message));
    if (!active) return undefined;
    const handle = setInterval(() => refresh().catch(e => setError(e.message)), 5000);
    return () => clearInterval(handle);
  }, [active, refresh]);
  useEffect(() => {
    setResult(null); setPage(0);
    if (job?.state !== 'COMPLETE') return undefined;
    let ignore = false;
    httpClient.get(endpoint + '/' + selected + '/result', { timeout: 120000 })
      .then(({ data }) => { if (!ignore) setResult(data.data); })
      .catch(e => { if (!ignore) setError(e.message); });
    return () => { ignore = true; };
  }, [selected, job?.state, detailAttempt]);

  const action = async (event, kind) => {
    event.preventDefault(); setLoading(true); setError('');
    try {
      let preferred = selected;
      if (kind === 'create') {
        const spec = { ...form, ...Object.fromEntries(fields.map(([name]) => [name, Number(form[name])])) };
        const fingerprint = JSON.stringify(spec);
        if (key.current?.fingerprint !== fingerprint) key.current = { fingerprint, id: crypto.randomUUID() };
        await httpClient.put(endpoint + '/' + key.current.id, spec);
        preferred = key.current.id;
        setOther('');
        key.current = null;
      } else await httpClient.post(endpoint + '/' + selected + '/' + kind);
      await refresh(preferred);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  const input = (name) => ({ value: form[name], fullWidth: true, required: true,
    onChange: e => setForm(prev => ({ ...prev, [name]: e.target.value })) });
  const views = [job, compare].filter(j => j?.metrics);
  const trades = result?.trades || [];
  return <Stack gap={2}>
    <SectionCard title="시장 전체 백테스트" caption="키움의 현재 상장 주식 목록으로 과거 돌파 신호를 찾습니다. 이후 상장폐지된 종목은 성과에 포함되지 않습니다.">
      <Stack component="form" onSubmit={e => action(e, 'create')} gap={2}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><TextField {...input('market')} select label="시장">
            {Object.entries(marketNames).map(([v,n]) => <MenuItem value={v} key={v}>{n}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 6, md: 3 }}><TextField {...input('strategy')} select label="선정 전략">
            {Object.entries(strategies).map(([v,n]) => <MenuItem value={v} key={v}>{n}</MenuItem>)}</TextField></Grid>
          {['from','to'].map((name,i) => <Grid size={{ xs: 6, md: 3 }} key={name}>
            <TextField {...input(name)} type="date" label={i ? '종료일' : '시작일'} slotProps={{ inputLabel: { shrink: true } }} /></Grid>)}
          {fields.map(([name,label,min,max]) => <Grid size={{ xs: 6, md: 4 }} key={name}>
            <TextField {...input(name)} type="number" label={label} slotProps={{ htmlInput: { min,max,step:1 } }} /></Grid>)}
          <Grid size={{ xs: 12, md: 6 }}><TextField {...input('missingSettlement')} select label="보유 종목 소멸·기준가 변경 시 처리">
            {Object.entries(settlement).map(([v,n]) => <MenuItem value={v} key={v}>{n}</MenuItem>)}</TextField></Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary">신호가 겹치면 거래대금이 큰 순으로 다음 거래일 시가에 진입합니다. 보유기간 마지막 종가에 청산합니다. 승률은 편도 비용과 슬리피지를 반영한 수익 거래 수를 전체 청산 건수로 나눕니다. 현금배당은 제외합니다.</Typography>
        <Button type="submit" variant="contained" disabled={loading}>시장 백테스트 실행</Button>
      </Stack>
    </SectionCard>
    {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}
    <SectionCard title="저장된 실행과 성과 비교" action={<Button onClick={() => { setDetailAttempt(n => n + 1); refresh().catch(e => setError(e.message)); }}>새로고침</Button>}>
      {!jobs.length ? <Typography>저장된 실행이 없습니다.</Typography> : <Stack gap={2}>
        <TextField select label="기준 실행" value={selected} onChange={e => { setSelected(e.target.value); setOther(''); }}>
          {jobs.map(j => <MenuItem key={j.id} value={j.id}>{states[j.state]} · {describe(j)}</MenuItem>)}
        </TextField>
        {job && <Typography>{states[job.state]} {job.progress && ' · 처리일 ' + job.progress} {job.message}</Typography>}
        {job && ['QUEUED','RUNNING','FAILED','CANCELLED'].includes(job.state) &&
          <Button disabled={loading} onClick={e => action(e, ['FAILED','CANCELLED'].includes(job.state) ? 'retry' : 'cancel')}>
            {['FAILED','CANCELLED'].includes(job.state) ? '이어서 재시도' : '실행 중단'}</Button>}
        {job?.metrics && <>
          <TextField select label="비교할 실행" value={other} onChange={e => setOther(e.target.value)}>
            <MenuItem value="">선택하세요</MenuItem>
            {jobs.filter(j => j.metrics && j.id !== selected).map(j => <MenuItem key={j.id} value={j.id}>{describe(j)}</MenuItem>)}
          </TextField>
          {compare && (job.spec.from !== compare.spec.from || job.spec.to !== compare.spec.to || job.spec.market !== compare.spec.market)
            && <Alert severity="warning">두 실행의 시장 또는 평가 기간이 다릅니다.</Alert>}
          <TableContainer><Table size="small"><TableHead><TableRow><TableCell>항목</TableCell>
            {views.map((j,i) => <TableCell key={j.id}>{i ? '비교' : '기준'} · {j.id.slice(0,8)}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              <TableRow><TableCell>미확인 정산 처리</TableCell>{views.map(j => <TableCell key={j.id}>{settlement[j.spec.missingSettlement || 'UNRESOLVED']}</TableCell>)}</TableRow>
              {fields.map(([k,label]) => <TableRow key={k}><TableCell>{label}</TableCell>{views.map(j => <TableCell key={j.id}>{fmt(j.spec[k])}</TableCell>)}</TableRow>)}
              {metrics.map(([k,label,unit]) => <TableRow key={k}><TableCell>{label}</TableCell>{views.map(j => <TableCell key={j.id}>{fmt(j.metrics[k],unit)}</TableCell>)}</TableRow>)}
            </TableBody></Table></TableContainer>
        </>}
      </Stack>}
    </SectionCard>
    {result && <SectionCard title="월별 계좌 성과" caption={result.version === 'KRX_BREAKOUT_1' ? 'KRX 일별 종목 목록으로 실행한 과거 결과' : '키움 현재 상장 주식 목록으로 실행한 결과'}>
      <TableContainer sx={{ maxHeight: 320 }}><Table stickyHeader size="small"><TableHead><TableRow>
        {['월','거래일','월 마지막 평가액','기간 수익률'].map(label => <TableCell key={label}>{label}</TableCell>)}
      </TableRow></TableHead><TableBody>{monthlyReturns(result).map(m => <TableRow key={m.month}>
        <TableCell>{m.month}</TableCell><TableCell>{m.sessions}</TableCell><TableCell>{fmt(m.end,'원')}</TableCell>
        <TableCell>{fmt(m.start > 0 && m.end != null ? 100 * (m.end / m.start - 1) : null,'%')}</TableCell>
      </TableRow>)}</TableBody></Table></TableContainer>
    </SectionCard>}
    {result && <SectionCard title="선정 종목과 거래 내역" caption={'평가 거래일 ' + result.days.length + '일 · 마지막 날 시장 종목 ' + result.days.at(-1).universe + '개'}>
      <Stack gap={1.5}>
        {!!result.unconfirmedEmptyDates.length && <Alert severity="warning"><details><summary>휴장 여부를 확인할 평일 {result.unconfirmedEmptyDates.length}일</summary>{result.unconfirmedEmptyDates.join(', ')}</details></Alert>}
        {result.metrics.returnPct == null && <Alert severity="warning">보유 종목의 가격 또는 기준가를 추적할 수 없는 날이 있어 전체 기간 계좌 성과를 확정할 수 없습니다.</Alert>}
        <TableContainer><Table size="small"><TableHead><TableRow>
          {['선정일','종목','종가 / 돌파선','진입일 / 가격','수량','청산일 / 가격','순손익','결과'].map(x => <TableCell key={x}>{x}</TableCell>)}
        </TableRow></TableHead><TableBody>{trades.slice(page*50,page*50+50).map(t =>
          <TableRow key={t.pick.signalDate + t.pick.code}><TableCell>{t.pick.signalDate}</TableCell><TableCell>{t.pick.name} {t.pick.code}</TableCell>
            <TableCell>{fmt(t.pick.close)} / {fmt(t.pick.resistance)}</TableCell><TableCell>{t.entryDate || '—'} {t.entry != null && fmt(t.entry,'원')}</TableCell>
            <TableCell>{fmt(t.quantity)}</TableCell><TableCell>{t.exitDate || '—'} {t.exit != null && fmt(t.exit,'원')}</TableCell>
            <TableCell>{t.net == null ? '—' : fmt(t.net,'원')}</TableCell><TableCell>{labels[t.status] || t.status}</TableCell></TableRow>)}</TableBody></Table></TableContainer>
        <Stack direction="row" alignItems="center"><Button disabled={!page} onClick={() => setPage(page-1)}>이전</Button>
          <Typography>{trades.length ? page+1 : 0} / {Math.ceil(trades.length/50)}쪽</Typography>
          <Button disabled={(page+1)*50 >= trades.length} onClick={() => setPage(page+1)}>다음</Button></Stack>
      </Stack>
    </SectionCard>}
  </Stack>;
}
