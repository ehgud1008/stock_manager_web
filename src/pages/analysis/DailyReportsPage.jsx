import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import * as api from '../../api/unifiedAnalysisApi';
import DailyReportPanel from '../../features/unified-analysis/DailyReportPanel';
import ReportPerformancePanel from '../../features/unified-analysis/ReportPerformancePanel';
import { PortfolioWorkspace, OperationsWorkspace } from '../../features/unified-analysis/PortfolioPanel';
import SavedUnifiedDetail from '../../features/unified-analysis/SavedUnifiedDetail';
import SectionCard from '../../components/common/SectionCard';

const names = { NOT_CREATED: '보고서 미생성', PENDING: '보고서 대기', WORKING: '보고서 작성 중', WAITING_SCAN: '전체 분석 완료 대기', RETRY_WAIT: '자료 확인 재시도', READY: '보고서 완료', FAILED: '보고서 실패' };
const label = item => `${item.tradeDate} · ${names[item.reportState] || item.reportState} · ${item.runId.slice(0, 8)}`;
const tabOptions = [['report', '시장·선정 종목'], ['performance', '성과 검증'], ['operations', '운영 상태']];

export default function DailyReportsPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('runId') || '';
  const invalidId = requested && !/^[A-Za-z0-9-]{1,100}$/.test(requested);
  const tab = tabOptions.some(([value]) => value === params.get('tab')) ? params.get('tab') : 'report';
  const [page, setPage] = useState(0); const [refresh, setRefresh] = useState(0);
  const [library, setLibrary] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [selection, setSelection] = useState(null); const [loaded, setLoaded] = useState(null);
  const onLoaded = useCallback((runId, data) => setLoaded({ runId, data }), []);
  useEffect(() => {
    const controller = new AbortController(); let timer; setLoading(true); setError('');
    const load = async () => {
      try {
        const data = await api.listDailyReports({ page, size: 30 }, controller.signal);
        if (controller.signal.aborted) return;
        setLibrary(data); setLoading(false); setError('');
        if (data.enabled) timer = setTimeout(load, 30000);
      } catch (e) { if (!controller.signal.aborted) { setError(e.message); setLoading(false); } }
    };
    load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [page, refresh]);
  const id = invalidId ? '' : requested || library?.latestReady?.runId || library?.newestRun?.runId || '';
  const options = [...new Map([library?.latestReady, library?.newestRun, ...(library?.reports || [])].filter(Boolean).map(item => [item.runId, item])).values()];
  const selected = options.find(item => item.runId === id);
  const current = loaded?.runId === id ? loaded.data : null;
  const date = current?.report?.tradeDate || selected?.tradeDate;
  const ready = current ? current.state === 'READY' : selected?.reportState === 'READY';
  const stale = date && library?.expectedTradeDate && date < library.expectedTradeDate;
  const choose = value => { const next = new URLSearchParams(params); if (value) next.set('runId', value); else next.delete('runId'); setParams(next); setSelection(null); };
  const changeTab = value => { const next = new URLSearchParams(params); next.set('tab', value); setParams(next); setSelection(null); };
  return <Stack gap={2.5}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
      <Box><Typography variant="overline" color="primary.main">DAILY MARKET REPORT</Typography><Typography variant="h1">장 마감 리포트</Typography><Typography color="text.secondary" mt={1}>시장 흐름과 선정 근거를 확인하고, 이후 성과를 함께 검증하세요.</Typography></Box>
      <Button component={Link} to="/unified-analysis" sx={{ alignSelf: 'flex-start' }}>종합분석에서 종목 탐색</Button>
    </Stack>
    <Stack direction="row" gap={1} flexWrap="wrap">
      <Button onClick={() => { setRefresh(n => n + 1); }} disabled={loading}>보고서 새로고침</Button>
      <Button onClick={() => { choose(''); setPage(0); }} disabled={!library?.latestReady}>최신 확정 보고서 보기</Button>
    </Stack>
    {loading && <LinearProgress aria-label="보고서 목록 조회 중" />}
    {error && <Alert severity="error">보고서 목록을 조회하지 못했습니다. {error}</Alert>}
    {invalidId && <Alert severity="error">보고서 링크의 실행 ID가 올바르지 않습니다.</Alert>}
    {library && !library.enabled && <Alert severity="info">보고서 기능이 비활성화되어 있습니다. 성과 검증·운영 상태는 각 기능 설정에 따라 확인할 수 있습니다.</Alert>}
    {library?.enabled && <>
      <TextField select label="보고서 날짜·실행 선택" value={id} onChange={e => choose(e.target.value)}>
        {!id && <MenuItem value="">저장된 전체 시장 실행 없음</MenuItem>}
        {id && !selected && <MenuItem value={id}>직접 연결된 실행 · {id}</MenuItem>}
        {options.map(item => <MenuItem key={item.runId} value={item.runId}>{label(item)}</MenuItem>)}
      </TextField>
      <Stack direction="row" alignItems="center" gap={1}>
        <Button disabled={page === 0 || loading} onClick={() => setPage(n => n - 1)}>최근 이력</Button><Typography variant="caption">이력 {page + 1}페이지 · 최신 확정 보고서는 항상 선택 가능</Typography>
        <Button disabled={!library.hasMore || loading} onClick={() => setPage(n => n + 1)}>이전 이력</Button>
      </Stack>
      {!library.latestReady && <Alert severity="info">아직 확정된 전체 시장 보고서가 없습니다. 실행을 선택해 작성 상태를 확인할 수 있습니다.</Alert>}
      {stale && <Alert severity="warning">현재 표시 기준일은 {date}입니다. 최근 예정 거래일 {library.expectedTradeDate}의 보고서가 아니므로 오늘 결과로 해석하지 마세요.</Alert>}
      {library.newestRun && library.newestRun.runId !== id && <Alert severity="info" action={<Button color="inherit" onClick={() => choose(library.newestRun.runId)}>해당 실행 보기</Button>}>가장 최근 전체 시장 실행: {label(library.newestRun)}</Alert>}
      {id && <Typography variant="caption">선택한 실행 {id}{date ? ` · 기준일 ${date}` : ''} · {requested ? '지정한 보고서를 유지합니다.' : '최신 확정 보고서를 자동으로 표시합니다.'}</Typography>}
    </>}
    <Tabs value={tab} onChange={(_, value) => changeTab(value)} variant="scrollable" scrollButtons="auto" aria-label="장 마감 리포트 메뉴">
      {tabOptions.map(([value, title]) => <Tab key={value} value={value} label={title} id={`daily-${value}-tab`} aria-controls={`daily-${value}-panel`} />)}
    </Tabs>
    {tabOptions.map(([value]) => <Box key={value} role="tabpanel" id={`daily-${value}-panel`} aria-labelledby={`daily-${value}-tab`} hidden={tab !== value}>
      {tab === value && value === 'report' && (id && library?.enabled ? <DailyReportPanel key={`${id}:${refresh}`} runId={id} onLoaded={onLoaded} onDetail={stock => setSelection({ runId: id, code: stock.code, name: stock.name })} /> : <Alert severity="info">확인할 보고서를 선택하세요. 20시 자동 분석의 보고서가 준비되면 여기에서 확인할 수 있습니다.</Alert>)}
      {tab === value && value === 'performance' && <Stack gap={2.5}>
        <SectionCard title="선택 보고서의 선정 이후 성과">{id && library?.enabled ? <ReportPerformancePanel key={id} runId={id} /> : <Typography>보고서를 선택하면 해당 후보의 사후 성과를 볼 수 있습니다.</Typography>}</SectionCard>
        <SectionCard title="누적 모의계좌 · 전략 검증"><PortfolioWorkspace /></SectionCard>
      </Stack>}
      {tab === value && value === 'operations' && <SectionCard title="자동 분석 · 알림 운영 확인"><OperationsWorkspace reportId={id && ready ? id : null} /></SectionCard>}
    </Box>)}
    {selection && selection.runId === id && <SavedUnifiedDetail key={`${selection.runId}:${selection.code}`} selection={selection} onClose={() => setSelection(null)} />}
  </Stack>;
}
