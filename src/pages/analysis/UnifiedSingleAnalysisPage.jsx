import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, LinearProgress, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import { analyzeUnifiedStock } from '../../api/unifiedAnalysisApi';
import SectionCard from '../../components/common/SectionCard';
import useStockMaster from '../../features/stock-search/hooks/useStockMaster';
import { searchStockMaster } from '../../features/stock-search/services/stockMasterService';
import UnifiedAnalysisResults from '../../features/unified-analysis/UnifiedAnalysisResults';
import TradeDecisionPanel from '../../features/trade-decision/TradeDecisionPanel';
import * as decisions from '../../api/tradeDecisionApi';

export default function UnifiedSingleAnalysisPage() {
  const { stocks, status, error: masterError } = useStockMaster();
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle' });
  const active = useRef(null);
  const snapshotRequest = useRef(null);
  const [capabilities, setCapabilities] = useState(null);
  const [capabilityError, setCapabilityError] = useState('');
  const allowed = useMemo(() => stocks.filter(stock => stock.stockType === 'ST' && /^[0-9]{6}$/.test(stock.stockCode)), [stocks]);
  const options = useMemo(() => query.trim() ? searchStockMaster(allowed, query) : allowed.slice(0, 30), [allowed, query]);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => {
    const c = new AbortController();
    decisions.getDecisionCapabilities(c.signal).then(value => { if (!c.signal.aborted) setCapabilities(value); })
      .catch(e => { if (!c.signal.aborted) { setCapabilityError(e.message); setCapabilities({ enabled: false }); } });
    return () => c.abort();
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('snapshot');
    const sourceRun = params.get('sourceRun'); const code = params.get('stock');
    if (!capabilities?.enabled || (!id && !(sourceRun && /^[0-9]{6}$/.test(code)))) return;
    const c = new AbortController(); active.current = c; setState({ status: 'running' });
    const source = { source: 'UNIFIED_RUN_ITEM', runId: sourceRun };
    const initial = id ? decisions.getSnapshot(id, c.signal) : decisions.startSnapshot(code,
      decisions.requestIdentity(`snapshot-source:${code}`, source), c.signal, source);
    initial.then(j => {
      if (!c.signal.aborted) {
        setSelected({ stockCode: j.stockCode, stockName: j.stockCode, stockType: 'ST' });
        if (!id) decisions.updateDecisionLocation(j.id);
      }
      return decisions.waitForJob(j, decisions.getSnapshot, c.signal);
    })
      .then(j => {
        if (c.signal.aborted) return;
        if (j.status === 'FAILED') { setState({ status: 'error', failedJob: true, message: decisions.decisionErrorMessage(j.errorCode) }); return; }
        const data = j.result.analysis;
        const stock = data.result.stock;
        setSelected({ stockCode: stock.stockCode, stockName: stock.stockName, marketType: stock.marketCode, stockType: 'ST' });
        setQuery(`${stock.stockName} ${stock.stockCode}`);
        setState({ status: 'success', data, snapshotId: j.id });
      }).catch(e => { if (!c.signal.aborted) setState({ status: 'error', message: e.message }); })
      .finally(() => { if (active.current === c) active.current = null; });
    return () => { c.abort(); if (active.current === c) active.current = null; };
  }, [capabilities?.enabled]);

  const select = (_, stock) => {
    active.current?.abort();
    active.current = null;
    setSelected(stock);
    setState({ status: 'idle' });
    snapshotRequest.current = null;
    decisions.updateDecisionLocation(null);
  };
  const execute = async () => {
    if (!selected || active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setState({ status: 'running' });
    try {
      if (capabilities?.enabled) {
        if (!snapshotRequest.current) snapshotRequest.current = decisions.requestIdentity(`snapshot-request:${selected.stockCode}`, { code: selected.stockCode }, state.status === 'success' || state.failedJob);
        const initial = await decisions.startSnapshot(selected.stockCode, snapshotRequest.current, controller.signal);
        if (controller.signal.aborted) return;
        decisions.updateDecisionLocation(initial.id);
        const done = await decisions.waitForJob(initial, decisions.getSnapshot, controller.signal);
        if (!controller.signal.aborted && active.current === controller) {
          snapshotRequest.current = null;
          try { sessionStorage.removeItem(`snapshot-request:${selected.stockCode}`); } catch { /* Request identity is retained in the URL. */ }
          if (done.status === 'FAILED') setState({ status: 'error', failedJob: true, message: decisions.decisionErrorMessage(done.errorCode) });
          else setState({ status: 'success', data: done.result.analysis, snapshotId: done.id });
        }
      } else {
        const data = await analyzeUnifiedStock(selected.stockCode, controller.signal);
        if (!controller.signal.aborted && active.current === controller) setState({ status: 'success', data });
      }
    } catch (error) {
      if (!controller.signal.aborted && active.current === controller) setState({ status: 'error', message: error.message });
    } finally {
      if (active.current === controller) active.current = null;
    }
  };

  return <Stack gap={3}>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={2}>
      <Box><Typography variant="overline" color="primary.main">UNIFIED ANALYSIS</Typography><Typography variant="h1" mt={0.5}>종합분석</Typography>
        <Typography color="text.secondary" mt={1}>추세의 위치부터 매매 조건까지, 하나의 기준으로 확인하세요.</Typography></Box>
      <Chip label="스윙 · 확정 일봉" variant="outlined" sx={{ alignSelf: 'flex-start' }} />
    </Stack>
    <SectionCard title="분석할 종목" caption="국내 일반주식을 선택하면 전일까지의 확정 일봉으로 분석합니다.">
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'flex-start' }}>
        <Autocomplete sx={{ flex: 1, minWidth: 0 }} value={selected} inputValue={query} onInputChange={(_, value) => setQuery(value)} onChange={select}
          options={options} filterOptions={items => items} loading={status === 'loading'} autoHighlight openOnFocus
          isOptionEqualToValue={(a, b) => a.stockCode === b.stockCode} getOptionLabel={stock => `${stock.stockName} ${stock.stockCode}`}
          noOptionsText={status === 'error' ? '종목 목록을 불러오지 못했습니다.' : '검색 결과가 없습니다.'} loadingText="종목 목록을 불러오는 중입니다."
          renderOption={(props, stock) => { const { key, ...rest } = props; return <Box component="li" key={key} {...rest}><Box flex={1}><Typography variant="body2" fontWeight={600}>{stock.stockName}</Typography><Typography variant="caption" color="text.secondary">{stock.stockCode} · {stock.marketType}</Typography></Box></Box>; }}
          renderInput={params => <TextField {...params} label="종목명 또는 종목코드" placeholder="예: 삼성전자, 005930" error={status === 'error'} helperText={masterError?.message}
            InputProps={{ ...params.InputProps, endAdornment: <>{status === 'loading' && <CircularProgress size={18} />}{params.InputProps.endAdornment}</> }} />} />
        <Button variant="contained" startIcon={state.status === 'running' ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRoundedIcon />}
          onClick={execute} disabled={!selected || !capabilities || state.status === 'running'} sx={{ height: 56, minWidth: 172 }}>{state.status === 'running' ? '분석 중…' : '종합분석 실행'}</Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>현재가는 마지막 확정 종가로 평가합니다. {capabilities?.enabled ? '분석 결과를 저장하며, AI 검토는 분석 완료 후 별도로 요청할 수 있습니다.' : '결과는 이 화면에서만 유지되며, 다시 실행하면 새로 수집합니다.'}</Typography>
    </SectionCard>
    {capabilityError && <Alert severity="warning">저장 분석 설정을 확인하지 못했습니다: {capabilityError}. 기본 종목 분석을 사용할 수 있습니다.</Alert>}
    {capabilities && !capabilities.enabled && !capabilityError && <Alert severity="info">AI 매매 판단은 서버의 저장 분석 기능을 활성화한 후 사용할 수 있습니다.</Alert>}
    {state.status === 'running' && <Box role="status"><LinearProgress sx={{ borderRadius: 2 }} /><Typography color="text.secondary" variant="body2" mt={1.5}>일봉과 부가 자료를 수집하고 추세·점수·신호를 계산하고 있습니다.</Typography></Box>}
    {state.status === 'error' && <Alert severity="error" action={<Button color="inherit" onClick={execute}>다시 실행</Button>}>{state.message}</Alert>}
    {state.status === 'success' && <>
      <UnifiedAnalysisResults data={state.data} saved={Boolean(state.snapshotId)} />
      {state.snapshotId && <TradeDecisionPanel key={state.snapshotId} snapshotId={state.snapshotId} stockCode={state.data.result.stock.stockCode} aiConfigured={capabilities.aiConfigured} />}
    </>}
    {state.status === 'idle' && <SectionCard><Stack alignItems="center" textAlign="center" sx={{ py: { xs: 4, md: 7 } }} gap={1.5}>
      <Box sx={{ p: 2, borderRadius: 3, bgcolor: 'rgba(139,218,99,.08)', color: 'primary.main' }}><AutoAwesomeRoundedIcon sx={{ fontSize: 32 }} /></Box>
      <Typography variant="h2">종목의 흐름과 매매 조건을 한눈에</Typography>
      <Typography color="text.secondary" sx={{ maxWidth: 480 }}>종목을 선택하고 분석을 실행하세요. EMA 스테이지, 스윙 적합도, 매매 신호와 가격 시나리오를 함께 보여드립니다.</Typography>
      <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="center" mt={1}>{['추세 구조', '종목 평가', '매매 신호'].map(label => <Chip key={label} label={label} variant="outlined" />)}</Stack>
    </Stack></SectionCard>}
  </Stack>;
}
