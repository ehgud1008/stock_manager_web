import { Alert, Box, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

const metricText = metric => metric?.value == null ? '산출 불가' : `${Number(metric.value).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}${metric.unit}`;
export function MetricReferences({ ids = [], metrics = {} }) {
  return <Stack direction="row" gap={1} flexWrap="wrap">{ids.filter(id => metrics[id]).map(id => <Chip key={id} size="small" variant="outlined" title={metrics[id].basis} label={`${metrics[id].label}: ${metricText(metrics[id])}`} />)}</Stack>;
}
export default function DecisionPlanView({ policy, onSelectPeriod }) {
  const h = policy?.horizonPlan;
  if (!h) return null;
  const metrics = h.metrics || {};
  return <Stack gap={1.5}>
    <Typography fontWeight={700}>{h.horizonTradingDays}거래일 가격 계획 · {h.focus}</Typography>
    <Typography variant="caption" color="text.secondary">가격일 {policy.priceDate} · 관측 {h.lookbackBars}거래일 · 현재 시세가 아닌 저장 종가 기준</Typography>
    {h.status !== 'AVAILABLE' && <Alert severity="warning">{h.reason}</Alert>}
    {h.status === 'AVAILABLE' && <>
      <Stack direction="row" gap={1} flexWrap="wrap"><MetricReferences ids={['CURRENT', 'ENTRY_LOW', 'ENTRY_HIGH', 'STOP', 'TARGET_ONE', 'TARGET_TWO']} metrics={metrics} /></Stack>
      <MetricReferences ids={['UPSIDE_ONE', 'UPSIDE_TWO', 'LOSS_PCT', 'RR_ONE', 'RR_TWO', 'PNL_PCT', 'HELD_BARS']} metrics={metrics} />
      <Typography variant="caption">손익비 기준: {h.riskReference === 'CURRENT_PRICE' ? '현재 종가' : '진입 상단'} · 목표까지의 상승 여력은 기대수익률이 아닙니다.</Typography>
      {['ENTRY_LOW', 'ENTRY_HIGH', 'STOP', 'TARGET_ONE', 'TARGET_TWO'].filter(id => metrics[id]).map(id => <Box key={id}>
        <Typography variant="body2" fontWeight={600}>{metrics[id].label} {metricText(metrics[id])}</Typography>
        <Typography variant="caption" color="text.secondary">{metrics[id].basis}</Typography>
      </Box>)}
      <Alert severity={h.distanceAssessment === 'STRETCHED' ? 'warning' : 'info'}>
        {h.distanceAssessment === 'STRETCHED' ? '첫 목표까지 거리가 선택 기간의 변동폭 참고치보다 큽니다.' : '첫 목표까지 거리가 선택 기간의 변동폭 참고치 이내입니다.'}
        {' '}{h.distanceExplanation}
      </Alert>
      <Typography variant="body2">{h.reason}</Typography>
    </>}
    {metrics.REVIEW_AFTER && <Typography variant="body2">{metricText(metrics.REVIEW_AFTER)} 재검토 · {h.timeRule}</Typography>}
    {h.signalExpiresBeforeHorizon && <Alert severity="info">현재 신호의 유효기간이 예정 기간보다 짧습니다. 기간 전체에 신호가 유지된다고 가정하지 않습니다.</Alert>}
    {h.holdingAgeAvailable === false && <Typography variant="caption">매수일이 저장 이력보다 이전이라 경과 거래일은 산출하지 않았습니다.</Typography>}
    {policy.comparisons?.length > 0 && <TableContainer><Table size="small" aria-label="보유기간별 가격 계획 비교">
      <TableHead><TableRow>{['기간', '목표', '손절', '손익비', '관측 구간 / 상태'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
      <TableBody>{policy.comparisons.map(row => <TableRow key={row.horizonTradingDays} selected={row.horizonTradingDays === h.horizonTradingDays}>
        <TableCell>{onSelectPeriod ? <Box component="button" type="button" onClick={() => onSelectPeriod(row.horizonTradingDays)} sx={{ cursor: 'pointer', color: 'primary.main', border: 0, bgcolor: 'transparent' }}>{row.horizonTradingDays}거래일</Box> : `${row.horizonTradingDays}거래일`}</TableCell>
        <TableCell>{metricText(row.metrics?.TARGET_ONE)}</TableCell><TableCell>{metricText(row.metrics?.STOP)}</TableCell><TableCell>{metricText(row.metrics?.RR_ONE)}</TableCell>
        <TableCell>{row.lookbackBars}거래일 · {row.status === 'AVAILABLE' ? (row.distanceAssessment === 'STRETCHED' ? '목표 거리 재검토' : '가격 계획 산출') : row.reason}</TableCell>
      </TableRow>)}</TableBody>
    </Table></TableContainer>}
    <Typography variant="caption" color="text.secondary">계산 규칙은 성과 미검증 상태이며, 수수료·세금·갭 위험은 가격에 포함하지 않았습니다. 제시 가격은 주문용 호가 보정을 하지 않은 참고값입니다.</Typography>
  </Stack>;
}
