import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Alert, Box, Button, Chip, Grid, LinearProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { getSupportedBackdataTrs, validateKiwoomBackdata, validateKiwoomBackdataBatch } from '../../api/backtestApi';
import PageHeader from '../../components/common/PageHeader';
import SectionCard from '../../components/common/SectionCard';
import ErrorState from '../../components/feedback/ErrorState';
import BacktestValidationResult from '../../features/backtest/components/BacktestValidationResult';
import { buildBatchValidationRequest, buildSingleValidationRequest } from '../../features/backtest/services/backtestRequestBuilder';
import useAsyncData from '../../hooks/useAsyncData';

const REQUIRED_API_IDS = Object.freeze({
  SINGLE: ['ka10081'],
  BATCH: ['ka10081', 'ka10086', 'ka10059'],
});

const initialForm = Object.freeze({
  mode: 'BATCH',
  stockCode: '005930',
  asOfDate: '2025-01-03',
  profile: 'BACKTEST_READY',
  adjustedPrice: '1',
});

export default function BacktestPage() {
  const supportedTrs = useAsyncData(getSupportedBackdataTrs, []);
  const [form, setForm] = useState(initialForm);
  const [run, setRun] = useState({ status: 'idle', data: null, error: null });

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const supportedIds = new Set((supportedTrs.data || []).map((item) => item.apiId));
  const missingApiIds = REQUIRED_API_IDS[form.mode].filter((apiId) => !supportedIds.has(apiId));
  const stockCodeValid = /^\d{6}$/.test(form.stockCode);
  const canRun = supportedTrs.status === 'success' && missingApiIds.length === 0 && stockCodeValid && Boolean(form.asOfDate) && run.status !== 'loading';

  const execute = async ({ continuation = 'N', nextKey = '' } = {}) => {
    setRun({ status: 'loading', data: null, error: null });
    try {
      const payload = form.mode === 'SINGLE'
        ? buildSingleValidationRequest({ ...form, continuation, nextKey })
        : buildBatchValidationRequest(form);
      const response = form.mode === 'SINGLE'
        ? await validateKiwoomBackdata(payload)
        : await validateKiwoomBackdataBatch(payload);
      setRun({ status: 'success', data: response.data, error: null });
    } catch (error) {
      setRun({ status: 'error', data: null, error });
    }
  };

  const validateNextPage = () => execute({
    continuation: 'Y',
    nextKey: run.data?.continuation?.nextKey || '',
  });

  return (
    <>
      <PageHeader eyebrow="BACKTEST / 04" title="백테스트 데이터 사전 검증" description="백테스트에 사용할 키움 백데이터를 호출하고 품질 규칙을 통과하는지 WAS에서 검증합니다." chip="WAS API" />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack gap={2.5}>
            <SectionCard title="검증 조건" caption="백테스트 실행 전 데이터 준비 상태를 확인합니다.">
              <Stack gap={2}>
                <TextField name="mode" select fullWidth label="검증 범위" value={form.mode} onChange={updateForm}>
                  <MenuItem value="BATCH">핵심 데이터 3종 교차검증</MenuItem>
                  <MenuItem value="SINGLE">일봉 데이터 단일 검증</MenuItem>
                </TextField>
                <TextField name="stockCode" fullWidth label="종목코드" value={form.stockCode} onChange={updateForm} error={!stockCodeValid} helperText={!stockCodeValid ? '숫자 6자리 종목코드를 입력하세요.' : '예: 삼성전자 005930'} inputProps={{ maxLength: 6 }} />
                <TextField name="asOfDate" fullWidth label="기준일" type="date" value={form.asOfDate} onChange={updateForm} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField name="profile" select fullWidth label="검증 프로필" value={form.profile} onChange={updateForm}>
                  <MenuItem value="BACKTEST_READY">BACKTEST READY</MenuItem>
                  <MenuItem value="QUICK">QUICK</MenuItem>
                  <MenuItem value="AUDIT">AUDIT</MenuItem>
                </TextField>
                <TextField name="adjustedPrice" select fullWidth label="주가 기준" value={form.adjustedPrice} onChange={updateForm}>
                  <MenuItem value="1">수정주가</MenuItem>
                  <MenuItem value="0">원주가</MenuItem>
                </TextField>
                <Button variant="contained" startIcon={<PlayArrowRoundedIcon />} disabled={!canRun} onClick={() => execute()}>
                  {run.status === 'loading' ? '검증 실행 중' : '백데이터 검증 실행'}
                </Button>
                {run.status === 'loading' && <LinearProgress />}
              </Stack>
            </SectionCard>

            <SectionCard title="지원 전문" caption="GET /api/v1/backdata/trs">
              {supportedTrs.status === 'loading' && <LinearProgress />}
              {supportedTrs.status === 'error' && <ErrorState message={supportedTrs.error?.message} onRetry={supportedTrs.reload} />}
              {supportedTrs.status === 'success' && (
                <Stack gap={1.5}>
                  <Alert severity={missingApiIds.length ? 'warning' : 'success'}>
                    지원 전문 {supportedTrs.data.length}개 · 현재 검증에 필요한 전문 {missingApiIds.length ? '부족' : '확인 완료'}
                  </Alert>
                  <Stack direction="row" gap={1} flexWrap="wrap">
                    {REQUIRED_API_IDS[form.mode].map((apiId) => <Chip key={apiId} label={apiId} color={supportedIds.has(apiId) ? 'primary' : 'error'} variant="outlined" size="small" />)}
                  </Stack>
                </Stack>
              )}
            </SectionCard>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="검증 결과" caption="유효 데이터와 격리 데이터, 품질 이슈를 표시합니다.">
            {run.status === 'idle' && (
              <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <Box><Typography variant="h3">검증 실행 전입니다</Typography><Typography color="text.secondary" mt={1}>왼쪽에서 조건을 확인하고 백데이터 검증을 실행하세요.</Typography></Box>
              </Box>
            )}
            {run.status === 'loading' && (
              <Box sx={{ minHeight: 420, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
                <Box><Typography variant="h3">키움 백데이터를 검증하고 있습니다</Typography><Typography color="text.secondary" mt={1}>전문 호출과 교차 검증이 끝날 때까지 잠시 기다려 주세요.</Typography></Box>
              </Box>
            )}
            {run.status === 'error' && <ErrorState message={run.error?.message} onRetry={() => execute()} />}
            {run.status === 'success' && run.data && <BacktestValidationResult result={run.data} onNextPage={validateNextPage} loading={run.status === 'loading'} />}
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}
