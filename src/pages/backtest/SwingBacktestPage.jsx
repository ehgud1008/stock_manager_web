import { Alert, Box, Button, Grid, LinearProgress, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSwingPaperRun, listSwingPaperRuns, runHistoricalBacktest, startSwingPaperRun } from '../../api/swingBacktestApi';
import SectionCard from '../../components/common/SectionCard';
import MarketResearch from './MarketResearch';
import SwingBacktestResult from '../../features/backtest/components/SwingBacktestResult';

const seoulDay = (daysAgo) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' })
  .format(new Date(Date.now() - daysAgo * 86400000));

const settingsFields = [
  ['holdingDays', '종목별 보유기간 (거래일)', 1, 20],
  ['capital', '초기 자금 (원)', 10000, 1000000000000],
  ['maxPositions', '최대 동시 보유 종목 수', 1, 10],
  ['feeBps', '편도 비용 (bp)', 0, 500],
  ['slippageBps', '편도 슬리피지 (bp)', 0, 500],
];

export default function SwingBacktestPage() {
  const [mode, setMode] = useState('market');
  const [form, setForm] = useState(() => ({
    stockCodes: '005930, 000660', from: seoulDay(30), to: seoulDay(1), paperFrom: seoulDay(0),
    holdingDays: 5, capital: 10000000, maxPositions: 2, feeBps: 15, slippageBps: 5,
  }));
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paper, setPaper] = useState(null);
  const [paperError, setPaperError] = useState('');
  const [savedId, setSavedId] = useState('');
  const pendingStart = useRef(null);
  const refreshPaper = async () => {
    setPaperError('');
    try { setPaper(await listSwingPaperRuns()); }
    catch (requestError) { setPaperError(requestError.message); }
  };

  useEffect(() => {
    if (mode !== 'paper') return undefined;
    let active = true;
    listSwingPaperRuns().then((data) => { if (active) { setPaper(data); setPaperError(''); } })
      .catch((requestError) => { if (active) setPaperError(requestError.message); });
    return () => { active = false; };
  }, [mode]);

  const isPaper = mode === 'paper';
  const update = (event) => setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  const changeMode = (_, nextMode) => {
    setMode(nextMode);
    setError('');
    setResult(null);
  };

  const execute = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    const stockCodes = form.stockCodes.trim().toUpperCase().split(/[\s,]+/).filter(Boolean);
    const settings = {
      stockCodes, from: isPaper ? form.paperFrom : form.from, to: isPaper ? null : form.to,
      ...Object.fromEntries(settingsFields.map(([key]) => [key, Number(form[key])])),
    };
    try {
      if (isPaper) {
        const key = JSON.stringify(settings);
        if (pendingStart.current?.key !== key) pendingStart.current = { key, id: crypto.randomUUID() };
        const data = await startSwingPaperRun(pendingStart.current.id, settings);
        setSavedId(data.run.id);
        setResult(data);
        await refreshPaper();
      } else {
        setResult(await runHistoricalBacktest(settings));
      }
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const openRun = async (id) => {
    setSavedId(id);
    if (!id) return;
    setBusy(true);
    setError('');
    try { setResult(await getSwingPaperRun(id)); }
    catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  return (
    <Stack gap={2.5}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} gap={1}>
        <Box>
          <Typography variant="h1">스윙 백테스트</Typography>
          <Typography color="text.secondary" mt={1}>장 마감에 종목을 선정하고, 같은 규칙으로 과거 성과와 모의매매를 검증합니다.</Typography>
        </Box>
        <Button component={Link} to="/backtest/data-validation">백데이터 품질 검사</Button>
      </Stack>
      <Tabs value={mode} onChange={changeMode} aria-label="백테스트 유형">
        <Tab label="시장 전체 백테스트" value="market" disabled={busy} />
        <Tab label="지정 종목 백테스트" value="historical" disabled={busy} />
        <Tab label="25거래일 모의검증" value="paper" disabled={busy} />
      </Tabs>
      {mode === 'market' ? <MarketResearch /> : <>
      {isPaper && paperError && <Alert severity="error" action={<Button onClick={refreshPaper}>재시도</Button>}>{paperError}</Alert>}
      {isPaper && paper && !paper.enabled && <Alert severity="info">이 서버에서 25거래일 모의검증을 활성화해야 등록할 수 있습니다.</Alert>}
      {isPaper && !!paper?.runs.length && (
        <SectionCard title="저장된 모의검증">
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
            <TextField select fullWidth label="실행 선택" value={savedId} disabled={busy} onChange={(event) => openRun(event.target.value)}>
              <MenuItem value="">선택하세요</MenuItem>
              {paper.runs.map((run) => (
                <MenuItem key={run.id} value={run.id}>{run.sessions[0]} · {run.settings.stockCodes.join(', ')} · {run.id.slice(0, 8)}</MenuItem>
              ))}
            </TextField>
            <Button onClick={() => openRun(savedId)} disabled={busy || !savedId}>새로고침</Button>
          </Stack>
        </SectionCard>
      )}
      <SectionCard title="검증 조건" caption="직전 20거래일 최고가를 처음 돌파한 종목을 선정합니다. 다음 거래일 시가 진입, 설정한 보유기간 마지막 날 종가 청산을 모의로 계산합니다.">
        <Stack component="form" gap={2} onSubmit={execute}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField required fullWidth name="stockCodes" label="종목코드" value={form.stockCodes} onChange={update}
                disabled={busy} helperText="쉼표로 구분해 최대 10개를 입력하세요." />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField required fullWidth name={isPaper ? 'paperFrom' : 'from'} type="date" label="시작일"
                disabled={busy} value={isPaper ? form.paperFrom : form.from} onChange={update}
                slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>
            {!isPaper && <Grid size={{ xs: 6, md: 4 }}>
              <TextField required fullWidth name="to" type="date" label="종료일" value={form.to} onChange={update}
                disabled={busy} slotProps={{ inputLabel: { shrink: true } }} />
            </Grid>}
            {settingsFields.map(([name, label, min, max]) => (
              <Grid size={{ xs: 6, md: 2.4 }} key={name}>
                <TextField required fullWidth type="number" name={name} label={label} value={form[name]} onChange={update}
                  disabled={busy} slotProps={{ htmlInput: { min, max, step: 1 } }} />
              </Grid>
            ))}
          </Grid>
          <Typography variant="body2" color="text.secondary">
            {isPaper ? '매 거래일 장 마감 후 수정주가 일봉을 저장합니다. 25거래일 이후에는 기존 보유분의 청산만 추적합니다.'
              : '최대 25거래일을 지정할 수 있습니다. 선택한 종목의 소급 수정주가를 사용합니다.'}
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <Button type="submit" variant="contained" disabled={busy || (isPaper && !paper?.enabled)} sx={{ alignSelf: 'flex-start' }}>
            {isPaper ? '모의검증 등록' : '백테스트 실행'}
          </Button>
          {busy && <LinearProgress aria-label="검증 요청 처리 중" />}
        </Stack>
      </SectionCard>
      {result && <SwingBacktestResult result={result} />}
      </>}
    </Stack>
  );
}
