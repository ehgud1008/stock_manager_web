import { Alert, Button, Chip, Stack, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
const money = n => n == null ? '미산정' : `${Number(n).toLocaleString('ko-KR')}원`;
const actions = { HOLD: '보유 유지', REVIEW_HOLDING: '보유 재검토', SELL_PRIORITY: '매도 우선 검토', EXIT_TRIGGERED: '청산 조건 확인', TAKE_PROFIT_REVIEW: '익절 검토', DEFER: '판단 보류', WATCH: '관망', AVOID: '신규 매수 회피', BUY_CANDIDATE: '신규 매수 후보', STRONG_BUY_CANDIDATE: '적극 매수 후보' };
export default function HoldingAnalysisPanel({ analysis }) {
  if (!analysis) return null;
  const h = analysis.holding;
  return <Stack gap={1.5} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }} aria-label="내 보유 기준 분석">
    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center">
      <Typography variant="h6">내 보유 기준 분석</Typography>
      <Chip size="small" label={{ HELD: '보유 중', NOT_HELD: '미보유', UNKNOWN: '보유 미확인' }[analysis.positionStatus]} />
      <Button component={Link} to="/holdings" size="small">보유정보 관리</Button>
    </Stack>
    <Typography variant="body2">{actions[analysis.action] || '판단 보류'} · 분석 가격일 {analysis.priceDate || '미확인'}</Typography>
    {h && <Typography variant="body2">등록 잔고 기준일 {h.balanceDate} · {Number(h.quantity).toLocaleString('ko-KR')}주 · 평균 매입단가 {money(h.averageBuyPrice)}</Typography>}
    {analysis.pnlAmount != null && <>
      <Typography>매입금액 {money(analysis.investedAmount)} · 평가금액 {money(analysis.marketValue)}</Typography>
      <Typography fontWeight={700}>평가손익 {money(analysis.pnlAmount)} ({analysis.pnlPercent}%)</Typography>
      <Typography variant="body2">손절 참고가 {money(analysis.stopPrice)} · 해당 가격 손익 {money(analysis.stopPnlAmount)}</Typography>
      <Typography variant="body2">현재부터 추가 하락금액 {money(analysis.additionalRiskAmount)} · 목표 참고가 {money(analysis.targetPrice)} · 해당 가격 손익 {money(analysis.targetPnlAmount)}</Typography>
    </>}
    {analysis.stopBreached && <Alert severity="warning">손절 참고선을 이미 이탈했습니다. 실제 체결 여부는 별도로 확인하세요.</Alert>}
    {analysis.reasons?.map((reason, i) => <Typography key={i} variant="caption" color="text.secondary">{reason}</Typography>)}
    <Typography variant="caption" color="text.secondary">보유정보 확인 {new Date(analysis.checkedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} · 이 결과에는 분석 시작 시의 잔고가 고정됩니다.</Typography>
  </Stack>;
}
