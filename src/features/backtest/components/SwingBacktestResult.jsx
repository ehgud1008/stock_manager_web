import {
  Alert, Box, Chip, Grid, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';
import PropTypes from 'prop-types';
import SectionCard from '../../../components/common/SectionCard';

const statusLabels = {
  CLOSED: '청산', CLOSED_LATE: '청산 지연', OPEN: '보유 중', PENDING_ENTRY: '다음 거래일 대기',
  WINDOW_ENDED: '기간 내 미진입', NO_FILL: '체결 제외', DATA_GAP: '데이터 부족',
  ALREADY_HELD: '기보유', POSITION_LIMIT: '보유 한도', INSUFFICIENT_CASH: '자금 부족',
};

const amount = (value) => value == null ? '—' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`;
const percent = (value) => value == null ? '—' : `${Number(value).toFixed(2)}%`;

function TradeTable({ trades }) {
  if (!trades.length) return <Typography color="text.secondary">표시할 거래가 없습니다.</Typography>;
  return (
    <TableContainer>
      <Table size="small" sx={{ minWidth: 770 }}>
        <TableHead><TableRow>
          {['선정일', '종목', '종가 / 돌파 기준', '상태', '진입일 / 모의가', '수량', '청산일 / 모의가', '순손익'].map(
            (label) => <TableCell key={label}>{label}</TableCell>,
          )}
        </TableRow></TableHead>
        <TableBody>
          {trades.map(({ signal, entryDate, entryPrice, quantity, exitDate, exitPrice, netPnl, status }) => (
            <TableRow key={`${signal.date}-${signal.stockCode}`}>
              <TableCell>{signal.date}</TableCell><TableCell>{signal.stockCode}</TableCell>
              <TableCell>{amount(signal.close)} / {amount(signal.breakoutPrice)}</TableCell>
              <TableCell>{statusLabels[status] || status}</TableCell>
              <TableCell>{entryDate ? `${entryDate} / ${amount(entryPrice)}` : '—'}</TableCell>
              <TableCell>{quantity == null ? '—' : Number(quantity).toLocaleString('ko-KR')}</TableCell>
              <TableCell>{exitDate ? `${exitDate} / ${amount(exitPrice)}` : '—'}</TableCell>
              <TableCell>{amount(netPnl)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
TradeTable.propTypes = { trades: PropTypes.array.isRequired };

function EquityChart({ points, capital }) {
  if (!points.length) return <Typography color="text.secondary">첫 거래일 평가를 기다리고 있습니다.</Typography>;
  const values = points.filter(({ value }) => value != null).map(({ value }) => Number(value));
  if (!values.length) return <Typography color="text.secondary">평가 가능한 가격이 없습니다.</Typography>;
  const min = Math.min(capital, ...values);
  const max = Math.max(capital, ...values);
  const center = max === min ? 50 : 10 + 80 * (capital - min) / (max - min);
  return (
    <Stack gap={1}>
      <Box sx={{ display: 'flex', gap: 0.5, height: 100, position: 'relative', borderBottom: 1, borderColor: 'divider' }}
        aria-label="거래일별 계좌 평가액">
        <Box aria-hidden sx={{ position: 'absolute', left: 0, right: 0, bottom: `${center}%`, borderTop: 1, borderColor: 'divider' }} />
        {points.map(({ date, value }) => {
          const height = value == null ? 0 : max === min ? 50 : 10 + 80 * (value - min) / (max - min);
          return (
            <Box key={date} title={`${date} · ${amount(value)}`} sx={{ flex: 1, position: 'relative' }}>
              <Box sx={{ position: 'absolute', bottom: `${Math.min(center, height)}%`, left: 0, right: 0,
                height: `${value == null ? 0 : Math.max(2, Math.abs(height - center))}%`,
                bgcolor: value >= capital ? 'primary.main' : 'warning.main', borderRadius: 0.5 }} />
            </Box>
          );
        })}
      </Box>
      <Stack direction="row" justifyContent="space-between" color="text.secondary">
        <Typography variant="caption">{points[0].date}</Typography>
        <Typography variant="caption">{points.at(-1).date}</Typography>
      </Stack>
    </Stack>
  );
}
EquityChart.propTypes = { points: PropTypes.array.isRequired, capital: PropTypes.number.isRequired };

export default function SwingBacktestResult({ result }) {
  const { run, mode, status, summary, settledSessions, capturedSessions, equity, trades, followUpTrades, coverage } = result;
  const sessionCount = run.sessions.length;
  const missing = coverage.filter((day) => day.status !== 'COMPLETE');
  const metrics = [
    ['거래 승률', percent(summary.winRate), `이익 ${summary.wins} / 청산 ${summary.closed}건`],
    ['거래당 평균 순손익', amount(summary.averageNetPnl), '청산 거래 · 비용 반영'],
    ['계좌 수익률', percent(summary.returnPercent), '보유분 종가 평가 포함'],
    ['최대낙폭', percent(summary.drawdownPercent), '고점 대비 하락폭'],
  ];
  return (
    <Stack gap={2.5}>
      <SectionCard title={mode === 'PAPER' ? '25거래일 모의검증' : '과거 백테스트 결과'}
        caption={`${run.sessions[0]} ~ ${run.sessions.at(-1)} · ${run.settings.stockCodes.join(', ')}`}
        action={<Chip label={{ COMPLETE: '완료', PARTIAL: '자료 일부 누락', RUNNING: '진행 중' }[status]} size="small" />}>
        <Stack gap={1.5}>
          <Typography>
            검증 {settledSessions}/{sessionCount}거래일 · 데이터 확보 {capturedSessions}일
            {settledSessions > 0 && ` · ${run.sessions[settledSessions - 1]} 기준`}
          </Typography>
          <LinearProgress variant="determinate" value={settledSessions / sessionCount * 100} />
          <Typography variant="body2" color="text.secondary">
            최대 {run.settings.maxPositions}종목 · {run.settings.holdingDays}거래일 보유 · 초기 자금 {amount(run.settings.capital)}
            {' · '}편도 비용 {run.settings.feeBps}bp · 슬리피지 {run.settings.slippageBps}bp
          </Typography>
          <Typography>선정 {summary.selected} → 진입 {summary.entered} → 청산 {summary.closed} → 이익 {summary.wins} · 보유 중 {summary.open}</Typography>
          {summary.closed < 10 && <Alert severity="info">청산 거래가 10건 미만입니다. 승률을 해석하기에 표본이 적습니다.</Alert>}
          {!!missing.length && (
            <Alert severity="warning">
              데이터가 불완전한 거래일 {missing.length}일. 확보된 가격으로 재현한 거래 기준입니다.
              <Box component="details" sx={{ mt: 1 }}>
                <Box component="summary" sx={{ cursor: 'pointer' }}>누락 날짜와 종목 보기</Box>
                {missing.map((day) => <Typography key={day.date} variant="body2">{day.date} · {day.unavailableStocks.join(', ')}</Typography>)}
              </Box>
            </Alert>
          )}
        </Stack>
      </SectionCard>
      <Grid container spacing={1.5}>
        {metrics.map(([label, value, caption]) => (
          <Grid key={label} size={{ xs: 6, lg: 3 }}>
            <SectionCard><Typography variant="body2">{label}</Typography><Typography variant="h3" my={0.5}>{value}</Typography>
              <Typography variant="caption" color="text.secondary">{caption}</Typography></SectionCard>
          </Grid>
        ))}
      </Grid>
      <SectionCard title="일별 계좌 평가액" caption={`초기 자금 ${amount(run.settings.capital)} 기준 · 최근 평가 ${amount(equity.at(-1)?.value)}`}>
        <EquityChart points={equity} capital={Number(run.settings.capital)} />
      </SectionCard>
      <SectionCard title="선정과 거래 내역"><TradeTable trades={trades} /></SectionCard>
      {!!followUpTrades.length && (
        <SectionCard title="검증 종료 후 청산" caption="25거래일 종료 성적은 종료일 기준으로 유지됩니다.">
          <TradeTable trades={followUpTrades} />
        </SectionCard>
      )}
    </Stack>
  );
}
SwingBacktestResult.propTypes = { result: PropTypes.object.isRequired };
