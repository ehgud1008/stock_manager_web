import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const TYPES = { BREAKOUT: '돌파 확인', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '돌파 재지지',
  TREND_BREAKDOWN: '추세 훼손', BREAKOUT_FAILURE: '돌파 실패', POSITION_STOP: '손절', TARGET_REACHED: '익절 조건 도달' };
const ENTRY = { IN_RANGE: '신호 발생 당시 진입 구간 내', CHASE_BLOCKED: '현재 추격 진입 보류',
  OUTSIDE_ENTRY_ZONE: '현재 진입 구간 이탈', SCENARIO_UNAVAILABLE: '목표 시나리오 미확정 · 진입 보류',
  AWAIT_CLOSE: '봉 완료 확인 대기', SELL_SIGNAL_CONFLICT: '매도 신호와 충돌 · 신규 진입 보류', INACTIVE: '현재 유효하지 않은 신호' };
const price = value => value == null ? '—' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`;

function signalLabel(signal, scope) {
  const side = signal.side === 'BUY' ? '매수' : signal.side === 'TAKE_PROFIT' ? '익절 조건' :
    scope === 'HELD' ? '매도' : scope === 'NOT_HELD' ? '신규 진입 회피' : '보유 시 매도';
  if (signal.state === 'INVALIDATED') return `${side} 신호 무효화`;
  if (signal.state === 'EXPIRED') return `${side} 신호 만료`;
  if (signal.state === 'PRELIMINARY') return `${side} 예비 신호`;
  if (!['CONFIRMED', 'ACTIVE'].includes(signal.state)) return `${side} 신호 상태 확인 필요`;
  if (signal.side === 'TAKE_PROFIT') return '익절 조건 도달';
  return `${side} 시그널 ${signal.state === 'ACTIVE' ? '유지 중' : '확정'}`;
}

export default function TradeSignalPanel({ report }) {
  if (!report) return null;
  return <Stack gap={1.5} aria-label="매수 매도 시그널">
    <Typography variant="h2">매수·매도 시그널</Typography>
    <Alert severity="info">확정은 규칙 충족을 의미하며 수익 보장·주문 실행이 아닙니다. 종합점수와 별도로 판정합니다.</Alert>
    <Typography variant="caption">보유 상태: {report.positionScope === 'HELD' ? '사용자 입력 보유' : report.positionScope === 'NOT_HELD' ? '미보유' : '미확인'}</Typography>
    {report.completeness === 'INSUFFICIENT_DATA' && <Alert severity="warning">완료된 일봉 표본 부족 또는 중복 날짜로 패턴 신호 판정을 보류했습니다. 보유 가격 접촉 기록은 별도입니다.</Alert>}
    {!report.signals.length && report.completeness === 'READY' && <Typography>현재 정의된 매수·매도 신호 조건에 해당하지 않습니다.</Typography>}
    {report.signals.map(signal => {
      const live = ['CONFIRMED', 'ACTIVE'].includes(signal.state);
      const color = !live ? 'default' : signal.side === 'SELL' ? 'error' : signal.side === 'BUY' ? 'success' : 'warning';
      return <Box key={signal.id} sx={{ p: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Stack gap={1}>
          <Chip label={`${signalLabel(signal, report.positionScope)} · ${TYPES[signal.type] || signal.type}`} color={color} variant="outlined" />
          <Typography variant="caption">발생일 {signal.occurredOn} · 판정 봉 {signal.evaluatedOn} · 경과 {signal.ageBars}봉{signal.validForBars > 0 ? ` / 유효 ${signal.validForBars}봉` : ' · 가격 접촉/종가 이벤트 기록'}{signal.endedOn ? ` · 종료 ${signal.endedOn}` : ''}</Typography>
          <Typography variant="body2">기준 가격 {price(signal.triggerPrice)} · 무효화 가격 {price(signal.invalidationPrice)}</Typography>
          {signal.entryFrom != null && <Typography variant="body2">발생 당시 진입 구간 {price(signal.entryFrom)} ~ {price(signal.entryTo)}</Typography>}
          {ENTRY[signal.entryStatus] && <Alert severity={signal.entryStatus === 'IN_RANGE' ? 'info' : 'warning'}>{ENTRY[signal.entryStatus]}</Alert>}
          {signal.reasons.map((reason, i) => <Typography key={i} variant="body2" color="text.secondary">{reason}</Typography>)}
        </Stack>
      </Box>;
    })}
    {report.warnings.map((warning, i) => <Typography key={i} variant="caption" color="text.secondary">{warning}</Typography>)}
    <Typography variant="caption">신호 평가 시각 {report.evaluatedAt} · {report.version}</Typography>
  </Stack>;
}
TradeSignalPanel.propTypes = { report: PropTypes.object };
