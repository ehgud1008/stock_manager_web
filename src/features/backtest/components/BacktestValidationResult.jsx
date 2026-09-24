import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import { Alert, Box, Button, Chip, Divider, Grid, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const severityColor = (severity) => {
  if (severity === 'FATAL' || severity === 'ERROR') return 'error';
  if (severity === 'WARNING') return 'warning';
  return 'info';
};

export default function BacktestValidationResult({ result, onNextPage, loading }) {
  const summary = result.summary || {};
  const metrics = [
    { label: '전체 레코드', value: summary.totalRecords ?? 0 },
    { label: '유효 레코드', value: summary.validRecords ?? 0 },
    { label: '격리 레코드', value: summary.quarantinedRecords ?? 0 },
    { label: '검증 이슈', value: summary.issueCount ?? 0 },
  ];
  const issues = result.issues || [];
  const sourceCalls = result.sourceCalls || [];
  const hasNext = Boolean(result.continuation?.hasNext && result.continuation?.nextKey);

  return (
    <Stack gap={2.5}>
      <Alert
        severity={result.backtestReady ? 'success' : 'warning'}
        icon={result.backtestReady ? <CheckCircleOutlineRoundedIcon /> : <WarningAmberRoundedIcon />}
      >
        <strong>{result.backtestReady ? '백테스트 사용 가능' : '백테스트 사용 전 보정 필요'}</strong>
        <br />검증 실행 ID · {result.runId}
      </Alert>

      <Grid container spacing={1.25}>
        {metrics.map((metric) => (
          <Grid size={{ xs: 6, md: 3 }} key={metric.label}>
            <Box sx={{ p: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,.025)' }}>
              <Typography variant="caption" color="text.secondary">{metric.label}</Typography>
              <Typography variant="h2" mt={0.75}>{Number(metric.value).toLocaleString('ko-KR')}</Typography>
            </Box>
          </Grid>
        ))}
      </Grid>

      {(result.apiId || sourceCalls.length > 0) && (
        <Box>
          <Typography variant="h3" mb={1.25}>호출 전문</Typography>
          <Stack direction="row" gap={1} flexWrap="wrap">
            {result.apiId && <Chip label={`${result.apiId} · ${result.apiName || result.datasetType}`} color="primary" variant="outlined" />}
            {sourceCalls.map((call) => <Chip key={call.apiId} label={`${call.apiId} · ${call.recordCount}건`} variant="outlined" />)}
          </Stack>
        </Box>
      )}

      <Divider />

      <Box>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2} mb={1.25}>
          <Typography variant="h3">검증 이슈</Typography>
          <Chip label={`${issues.length}건`} size="small" variant="outlined" />
        </Stack>
        {issues.length === 0 ? (
          <Typography variant="body2" color="text.secondary">발견된 검증 이슈가 없습니다.</Typography>
        ) : (
          <Stack gap={1}>
            {issues.slice(0, 20).map((issue, index) => (
              <Alert key={`${issue.code}-${issue.recordIndex}-${index}`} severity={severityColor(issue.severity)}>
                <strong>{issue.code}</strong> · {issue.message}
                <Typography variant="caption" display="block" mt={0.5}>전문 {issue.apiId || '—'} · 종목 {issue.stockCode || '—'} · 기준일 {issue.businessDate || '—'}</Typography>
              </Alert>
            ))}
          </Stack>
        )}
      </Box>

      {hasNext && <Button variant="outlined" onClick={onNextPage} disabled={loading}>다음 연속 데이터 검증</Button>}
    </Stack>
  );
}

BacktestValidationResult.propTypes = {
  result: PropTypes.object.isRequired,
  onNextPage: PropTypes.func,
  loading: PropTypes.bool,
};
