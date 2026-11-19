import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import { getBrokerAccount } from '../../api/tradeDecisionApi';

const dateToday = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const amount = (value, unit = '원') => value == null ? '확인 불가' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${unit}`;
const sectionNames = { cash: '예수금·주문 가능 금액', positions: '키움 보유정보', fills: '체결 내역', pnl: '기간 실현손익' };

function Rows({ columns, rows, label }) {
  return rows.length === 0 ? <Typography variant="body2">이 조회에 표시할 내역이 없습니다.</Typography> :
    <Box sx={{ overflowX: 'auto' }}>
      <Table size="small" aria-label={label}>
        <TableHead><TableRow>{columns.map(column => <TableCell sx={{ whiteSpace: 'nowrap' }} key={column}>{column}</TableCell>)}</TableRow></TableHead>
        <TableBody>{rows.map(({ key, cells }) => <TableRow key={key}>
          {cells.map((cell, i) => <TableCell key={i} sx={{ whiteSpace: 'nowrap' }}>{cell ?? '—'}</TableCell>)}
        </TableRow>)}</TableBody>
      </Table>
    </Box>;
}

function AccountResult({ section, result }) {
  const quantities = new Map();
  if (section === 'positions') result.items.forEach(item => {
    const total = quantities.get(item.stockCode);
    quantities.set(item.stockCode, item.quantity == null || total === null ? null : (total ?? 0) + item.quantity);
  });
  return <Stack gap={1}>
    <Alert severity={result.environment === 'BROKER_MOCK' ? 'warning' : 'info'}>
      {result.environment === 'BROKER_MOCK' ? '키움 모의투자 계좌' : '키움 실계좌'} · 조회 시각 {new Date(result.checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
    </Alert>
    {section === 'cash' && <>
      <Typography>예수금 {amount(result.deposit)} · 100% 증거금 주문가능금액 {amount(result.cashOnlyOrderAmount)}</Typography>
      <Typography>키움 표시 주문가능금액 {amount(result.brokerOrderAmount)} · 앱 수동 등록 현금 {amount(result.manualAvailableCash)} ({result.manualDate || '기준일 미확인'})</Typography>
      <Typography variant="caption">증권사 조회 시점의 계좌 금액입니다. 개별 종목과 가격에 따른 주문 가능 수량은 별도입니다.</Typography>
    </>}
    {section === 'positions' && <>
      <Typography>키움 평가손익 {amount(result.valuationPnl)} · 국내주식 KRX 조회</Typography>
      <Rows label="키움 보유 종목" columns={['종목', '신용 구분', '키움 보유', '매매 가능', '매입가', '평가손익']}
        rows={result.items.map((item, i) => ({ key: i, cells: [`${item.name || ''} ${item.stockCode || ''}`, item.creditType,
          amount(item.quantity, '주'), amount(item.sellable, '주'), amount(item.averagePrice), amount(item.valuationPnl)] }))} />
      {result.manualStatus === 'UNAVAILABLE' && <Alert severity="warning">수동 등록 보유정보 조회에 실패했습니다.</Alert>}
      {result.manualPositions?.length > 0 && <Rows label="수동 등록과 키움 수량 비교" columns={['종목', '수동 등록', '기준일', '키움 수량']}
        rows={result.manualPositions.map(item => ({ key: item.stockCode, cells: [item.stockCode, amount(item.quantity, '주'), item.balanceDate,
          result.next ? '전체 조회 후 비교' : quantities.has(item.stockCode) ? amount(quantities.get(item.stockCode), '주') : '조회 목록에 없음'] }))} />}
    </>}
    {section === 'fills' && <Rows label={`${result.date} 체결 내역`} columns={['종목', '체결 시간', '거래소', '구분', '체결번호', '수량', '단가']}
      rows={result.items.map((item, i) => ({ key: i, cells: [`${item.name || ''} ${item.stockCode || ''}`, item.time, item.market, item.side,
        item.execution, amount(item.quantity, '주'), amount(item.price)] }))} />}
    {section === 'pnl' && <>
      <Typography>{result.from} ~ {result.to} · 키움 보고 실현손익 {amount(result.reportedRealized)}</Typography>
      <Rows label="일자별 실현손익" columns={['일자', '매도 손익', '수수료', '세금']}
        rows={result.items.map((item, i) => ({ key: i, cells: [item.date, amount(item.realized), amount(item.fees), amount(item.taxes)] }))} />
    </>}
  </Stack>;
}

function append(section, previous, latest) {
  if (section === 'cash') return latest;
  const key = section === 'fills' ? item => JSON.stringify([item.market, item.order, item.execution, item.stockCode]) :
    section === 'pnl' ? item => item.date : item => JSON.stringify(item);
  const items = new Map(previous.items.map(item => [key(item), item]));
  latest.items.forEach(item => items.set(key(item), item));
  return { ...previous, items: [...items.values()], next: latest.next };
}

export default function BrokerAccountPage() {
  const [key, setKey] = useState('');
  const [date, setDate] = useState(dateToday);
  const [from, setFrom] = useState(dateToday);
  const [to, setTo] = useState(dateToday);
  const [states, setStates] = useState({});
  const [busy, setBusy] = useState(null);
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  const load = async (section, previous = null) => {
    if (active.current || !key || (previous && !previous.next)) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(section);
    setStates(old => ({ ...old, [section]: { data: previous } }));
    const params = section === 'fills' ? { date } : section === 'pnl' ? { from, to } : {};
    if (previous) params.cursor = previous.next;
    try {
      const result = await getBrokerAccount(section, key, params, controller.signal);
      if (!controller.signal.aborted) setStates(old => ({ ...old, [section]: { data: previous ? append(section, previous, result) : result } }));
    } catch (e) {
      if (!controller.signal.aborted) setStates(old => ({ ...old, [section]: { data: previous, error: e.message } }));
    } finally {
      if (!controller.signal.aborted) setBusy(null);
      active.current = null;
    }
  };
  const clear = section => setStates(old => ({ ...old, [section]: undefined }));
  const dateField = (label, value, setter, section) => <TextField type="date" size="small" label={label} value={value}
    disabled={Boolean(busy)} slotProps={{ inputLabel: { shrink: true } }} onChange={event => { setter(event.target.value); clear(section); }} />;

  return <>
    <PageHeader eyebrow="보유정보" title="키움 계좌 조회" description="키움 주문가능금액·보유 수량을 수동 등록값과 비교하고, 날짜별 체결과 실현손익을 조회합니다." chip="조회 전용" />
    <Stack gap={2}>
      <SectionCard title="계좌 조회 접근">
        <Stack gap={1}>
          <TextField type="password" label="계좌 조회 접근 키" autoComplete="off" value={key} disabled={Boolean(busy)}
            onChange={event => { setKey(event.target.value); setStates({}); }} />
          <Typography variant="caption">서버에서 설정한 접근 키를 사용합니다. 키움 앱 키나 비밀번호는 입력하지 않습니다.</Typography>
          <Button href="/holdings">수동 등록 보유정보</Button>
          <Button href="/trade-decisions/statistics">모의 성과로 이동</Button>
        </Stack>
      </SectionCard>
      {Object.entries(sectionNames).map(([section, title]) => {
        const state = states[section];
        const disabled = !key || Boolean(busy) || (section === 'fills' && !date) || (section === 'pnl' && (!from || !to || from > to));
        return <SectionCard key={section} title={title}>
          <Stack gap={1.5}>
            {section === 'fills' && dateField('주문일', date, setDate, 'fills')}
            {section === 'pnl' && <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
              {dateField('손익 시작일', from, setFrom, 'pnl')}{dateField('손익 종료일', to, setTo, 'pnl')}
            </Stack>}
            <Button variant="outlined" disabled={disabled} onClick={() => load(section)}> {title} 조회</Button>
            {busy === section && <LinearProgress aria-label={`${title} 조회 중`} />}
            {state?.error && <Alert severity="error">{state.error}</Alert>}
            {state?.data && <AccountResult section={section} result={state.data} />}
            {state?.data?.next && <Button disabled={disabled} onClick={() => load(section, state.data)}>다음 내역 더보기</Button>}
          </Stack>
        </SectionCard>;
      })}
    </Stack>
  </>;
}
