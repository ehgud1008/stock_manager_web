import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import { getDecisionStatistics } from '../../api/tradeDecisionApi';

const koreanDate = date => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(date);
const format = (value, unit) => value == null ? '—' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 4 })}${unit}`;
const columns = [
  ['opportunities', '기회 수', ''], ['comparable', '비교 가능', ''], ['comparablePercent', '수익률 표본', ''],
  ['meanAiPct', 'AI 평균', '%'], ['meanEnginePct', '엔진 평균', '%'], ['meanDifferencePp', 'AI − 엔진', '%p'],
  ['comparableAmount', '금액 표본', ''], ['aiPnl', 'AI 합계', '원'], ['enginePnl', '엔진 합계', '원'], ['differenceAmount', 'AI − 엔진', '원'],
];
const groupLabel = { STOCK: '종목', POLICY: '정책', MODEL: '모델' };

export default function DecisionStatisticsPage() {
  const [filters, setFilters] = useState(() => ({
    from: koreanDate(new Date(Date.now() - 29 * 86400000)), to: koreanDate(new Date()), stock: '', policy: '', model: '', groupBy: 'STOCK',
  }));
  const [report, setReport] = useState(null);
  const [options, setOptions] = useState({ policies: [], models: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(null);
  useEffect(() => () => active.current?.abort(), []);
  const change = key => event => {
    setFilters({ ...filters, [key]: event.target.value, ...(key === 'from' || key === 'to' || key === 'stock' ? { policy: '', model: '' } : {}) });
    setReport(null); setError('');
  };
  const submit = async event => {
    event.preventDefault();
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true); setError(''); setReport(null);
    try {
      const data = await getDecisionStatistics(Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), controller.signal);
      if (!controller.signal.aborted) { setReport(data); setOptions(data); }
    } catch (e) {
      if (!controller.signal.aborted) setError(e.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
      active.current = null;
    }
  };
  const field = (key, label, extra = {}) => <TextField size="small" label={label} value={filters[key]} disabled={busy} onChange={change(key)} {...extra} />;
  return <>
    <PageHeader eyebrow="AI 통합 매매 판단" title="누적 모의 성과"
      description="같은 기회의 최초 완료 판단을 기준으로 AI와 엔진의 모의 성과를 비교합니다." chip="모의 성과" />
    <Stack gap={2}>
      <SectionCard title="조회 조건">
        <Stack component="form" onSubmit={submit} gap={1.5}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3,minmax(0,1fr))' }, gap: 1.5 }}>
            {field('from', '판단 완료 시작일', { type: 'date', required: true, slotProps: { inputLabel: { shrink: true } } })}
            {field('to', '판단 완료 종료일', { type: 'date', required: true, slotProps: { inputLabel: { shrink: true } } })}
            {field('stock', '종목코드', { placeholder: '전체' })}
            <TextField select size="small" label="서버 정책" value={filters.policy} disabled={busy} onChange={change('policy')}>
              <MenuItem value="">전체</MenuItem>{options.policies.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="모델" value={filters.model} disabled={busy} onChange={change('model')}>
              <MenuItem value="">전체</MenuItem>{options.models.map(model => <MenuItem key={model} value={model}>{model}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="집계 기준" value={filters.groupBy} disabled={busy} onChange={change('groupBy')}>
              {Object.entries(groupLabel).map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
            </TextField>
          </Box>
          <Typography variant="caption">한국시간 판단 완료일 기준, 최대 366일. 첫 조회에서 정책·모델 선택지가 표시됩니다.</Typography>
          <Button type="submit" variant="contained" disabled={busy}>모의 성과 조회</Button>
          <Button href="/holdings/broker">키움 계좌 성과로 이동</Button>
        </Stack>
      </SectionCard>
      {busy && <LinearProgress aria-label="모의 성과 조회 중" />}
      {error && <Alert severity="error">{error}</Alert>}
      {report && <SectionCard title="AI와 엔진 비교">
        <Stack gap={1.5}>
          <Typography variant="body2">기회 {report.totals.opportunities}건 중 {report.totals.comparable}건 비교 가능 · 기간 {report.from} ~ {report.to}</Typography>
          <Typography variant="caption">수익률은 비교 가능한 쌍의 단순 평균입니다. 금액은 양쪽 모의 손익이 있는 쌍의 합계입니다. 실제 실현손익은 키움 계좌 화면에서 별도로 확인합니다.</Typography>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small" aria-label="누적 모의 성과 통계">
              <TableHead><TableRow><TableCell>{groupLabel[report.groupBy]}</TableCell>
                {columns.map(([key, name]) => <TableCell align="right" key={key} sx={{ whiteSpace: 'nowrap' }}>{name}</TableCell>)}
              </TableRow></TableHead>
              <TableBody>{[{ group: '전체', totals: report.totals }, ...report.rows].map((row, i) =>
                <TableRow key={`${i}-${row.group}`}><TableCell>{row.group}</TableCell>
                  {columns.map(([key,, unit]) => <TableCell align="right" key={key} sx={{ whiteSpace: 'nowrap' }}>{format(row.totals[key], unit)}</TableCell>)}
                </TableRow>)}</TableBody>
            </Table>
          </Box>
        </Stack>
      </SectionCard>}
    </Stack>
  </>;
}
