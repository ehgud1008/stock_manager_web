import { useEffect, useState } from 'react';
import { Alert, Button, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import * as api from '../../api/unifiedAnalysisApi';
import ScenarioMonitoringTable from './ScenarioMonitoringTable';

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
function initialFilters() {
  const to = today();
  const start = new Date(`${to}T00:00:00Z`); start.setUTCDate(start.getUTCDate() - 90);
  return { from: start.toISOString().slice(0, 10), to, search: '', disposition: 'ALL' };
}

export default function ScenarioMonitoringOverviewPanel({ onDetail, onReport }) {
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState(() => ({ ...initialFilters(), page: 0, size: 20 }));
  const [state, setState] = useState({ loading: true });
  const [refresh, setRefresh] = useState(0);
  const invalid = !filters.from || !filters.to || filters.from > filters.to || filters.to > today()
    || new Date(`${filters.to}T00:00:00Z`) - new Date(`${filters.from}T00:00:00Z`) > 366 * 86400000;
  useEffect(() => {
    const controller = new AbortController(); let timer;
    setState({ loading: true });
    const load = async () => {
      try {
        const data = await api.listScenarioMonitoring(query, controller.signal);
        if (!controller.signal.aborted) setState({ data });
      } catch (error) {
        if (!controller.signal.aborted) setState(old => ({ ...old, loading: false, error: error.message }));
      }
      if (!controller.signal.aborted) timer = setTimeout(load, 60000);
    };
    load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [query, refresh]);
  const change = field => event => setFilters(old => ({ ...old, [field]: event.target.value }));
  const data = state.data;
  return <Stack gap={2}>
    <Alert severity="info">위 보고서 선택과 독립적으로 여러 날짜의 선정 종목을 모아 봅니다. 같은 종목도 선정일·실행별 시나리오를 유지하며, 매일 저장된 마감 일봉으로 추적합니다.</Alert>
    <Stack component="form" direction={{ xs: 'column', md: 'row' }} gap={1.5} flexWrap="wrap" onSubmit={event => { event.preventDefault(); if (!invalid) setQuery({ ...filters, page: 0, size: 20 }); }}>
      <TextField label="선정 시작일" type="date" value={filters.from} onChange={change('from')} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} />
      <TextField label="선정 종료일" type="date" value={filters.to} onChange={change('to')} slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} />
      <TextField label="종목명 또는 코드" value={filters.search} onChange={change('search')} slotProps={{ htmlInput: { maxLength: 100 } }} />
      <TextField select label="선정 구분" value={filters.disposition} onChange={change('disposition')} sx={{ minWidth: 150 }}>
        <MenuItem value="ALL">전체 선정</MenuItem><MenuItem value="ENTRY_CONDITIONAL">조건부 진입</MenuItem><MenuItem value="WATCH">관찰 대상</MenuItem>
      </TextField>
      <Button type="submit" variant="contained" disabled={invalid || state.loading}>조회</Button>
      <Button onClick={() => setRefresh(n => n + 1)} disabled={state.loading}>전체 추적 새로고침</Button>
    </Stack>
    {invalid && <Alert severity="warning">선정 기간을 오늘까지 최대 1년 이내로 지정하세요.</Alert>}
    {state.loading && <LinearProgress aria-label="전체 선정 이력 추적 조회 중" />}
    {state.error && <Alert severity="error">전체 선정 이력을 조회하지 못했습니다. {state.error}{data ? ' 이전 조회 내용을 표시합니다.' : ''}</Alert>}
    {data && <>
      <Typography variant="body2">선정 기간 {data.from} ~ {data.to} · 전체 선정 이력 {data.totalElements}건 · 최근 선정 순 · 조회 {new Date(data.checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })}</Typography>
      {data.rows.length === 0 ? <Alert severity="info">조회 조건에 해당하는 선정 이력이 없습니다.</Alert> : <ScenarioMonitoringTable rows={data.rows} showSelection onDetail={onDetail} onReport={onReport} />}
      <Stack direction="row" gap={1} alignItems="center">
        <Button disabled={state.loading || data.page === 0} onClick={() => setQuery(old => ({ ...old, page: data.page - 1 }))}>이전 선정 이력</Button>
        <Typography variant="caption">{data.page + 1}페이지 · 페이지당 {data.size}건</Typography>
        <Button disabled={state.loading || !data.hasMore} onClick={() => setQuery(old => ({ ...old, page: data.page + 1 }))}>다음 선정 이력</Button>
      </Stack>
      {data.notes.map((note, index) => <Typography key={index} variant="caption" color="text.secondary">{note}</Typography>)}
    </>}
  </Stack>;
}
