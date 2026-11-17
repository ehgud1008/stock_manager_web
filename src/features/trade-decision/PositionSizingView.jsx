import { Alert, Button, Stack, Typography } from '@mui/material';

const statuses = {
  ACCOUNT_RISK_MISSING: '계좌 위험 설정이 없어 수량을 산출하지 않았습니다.', ACCOUNT_RISK_UNAVAILABLE: '계좌 위험 설정을 조회하지 못해 수량을 산출하지 않았습니다.',
  ACCOUNT_RISK_STALE: '계좌 금액 확인일이 판단 당일과 달라 수량을 산출하지 않았습니다.', ACCOUNT_RISK_INVALID: '계좌 위험 설정의 금액·비중을 확인해야 합니다.',
  POSITION_UNKNOWN: '보유정보 조회에 실패했습니다.', POSITION_UNCONFIRMED: '해당 종목의 명시적인 미보유 등록이 필요합니다.', POSITION_STALE: '미보유 정보의 기준일이 판단 당일과 다릅니다.',
  NEW_ENTRY_ONLY: '보유 종목의 추가매수·부분 매도 수량은 아직 지원하지 않습니다.', PLAN_INVALID: '가격 계획이 유효하지 않아 수량을 계산하지 않았습니다.',
  ZERO_CAPACITY: '현금·허용 손실·최대 비중 한도 내에서 매수할 수 있는 수량이 0주입니다.',
  NO_REDUCTION_NEEDED: '계좌 위험·비중 한도 초과가 없어 부분 매도 수량을 정하지 않았습니다. 임의의 익절 비율은 적용하지 않습니다.',
  FULL_EXIT_REVIEW_REQUIRED: '한도를 맞추려면 전량 축소가 필요합니다. 부분 매도로 확정하지 않고 별도 청산 검토가 필요합니다.',
  STOP_REFERENCE_BREACHED: '현재 분석 가격이 손절 참고선 이하이므로 추가매수·부분 축소 수량을 확정하지 않았습니다.',
};
const limits = { CASH_LIMIT: '현금', LOSS_LIMIT: '허용 손실', POSITION_WEIGHT_LIMIT: '종목 비중', QUANTITY_LIMIT: '수량 상한' };
const number = value => value == null ? '미산출' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });

export default function PositionSizingView({ result }) {
  const sizing = result.riskSizing;
  const held = sizing?.policyVersion === 'position-sizing-v2-held' && (sizing?.heldQuantity != null || ['ADD', 'REDUCE', 'SELL', 'HOLD'].includes(sizing?.action));
  const reducing = held && sizing.action === 'REDUCE';
  const selling = held && sizing.action === 'SELL';
  const quantityLabel = reducing ? '부분 매도' : selling ? '전량 매도' : held ? '추가매수' : '신규 매수';
  if (!sizing) return <Typography variant="body2">매수 수량 미산출: 이 저장 결과에는 계좌 위험 계산이 없습니다. 계좌 설정 후 새 통합 판단을 실행하세요.</Typography>;
  return <Stack gap={1.2} aria-label="계좌 위험과 수량 계산">
    <Typography fontWeight={600}>저장 당시 계좌 위험·수량 계산</Typography>
    {sizing.status !== 'READY' && <Alert severity="info">수량 미산출 또는 제한: {held && sizing.status === 'POSITION_STALE' ? '보유 정보의 기준일이 판단 당일과 다릅니다.' : statuses[sizing.status] || '계좌·보유정보를 확인하세요.'}</Alert>}
    {held && sizing.heldQuantity != null && <Typography variant="body2">저장 당시 보유 수량: {number(sizing.heldQuantity)}주</Typography>}
    {held && sizing.existingExposure != null && <Typography variant="body2">기존 보유 평가액 {number(sizing.existingExposure)}원 · 손절 참고선까지의 계획 위험 {number(sizing.existingStopRisk)}원</Typography>}
    {reducing && <Typography variant="body2">부분 매도는 계좌 위험·비중 한도 초과분만 줄입니다. 임의의 익절 비율을 적용하지 않으며, 기존 매수가 대비 확정 손익을 뜻하지 않습니다.</Typography>}
    {['READY', 'ZERO_CAPACITY'].includes(sizing.status) && !reducing && !selling && <>
      <Typography>조건 충족 시 {quantityLabel} 수량 상한: {number(sizing.maxBuyQuantity)}주</Typography>
      <Typography variant="body2">현금 기준 {number(sizing.cashLimitQuantity)}주 · 손실 기준 {number(sizing.riskLimitQuantity)}주 · 비중 기준 {number(sizing.weightLimitQuantity)}주 중 가장 작은 수량을 적용합니다.</Typography>
      <Typography variant="body2">제한 기준: {(sizing.reasons || []).map(reason => limits[reason] || reason).join(' · ')}</Typography>
      <Typography variant="body2">예상 매수 금액 {number(sizing.estimatedPurchaseAmount)}원 · 손절 참고가 기준 계획 손실 {number(sizing.estimatedLossAtStop)}원</Typography>
      <Typography variant="body2">주당 비용 포함 매수 기준 {number(sizing.unitPurchaseCost)}원 · 비용 차감 손절 기준 {number(sizing.netStopReference)}원 · 주당 계획 손실 {number(sizing.unitRisk)}원</Typography>
      <Typography variant="body2">{result.quantity != null ? `저장 당시 ${quantityLabel} 검토 수량: ${number(result.quantity)}주` : held ? '저장 당시 최종 의견에서 추가매수 수량은 확정하지 않았습니다.' : '저장 당시 최종 의견이 신규 매수가 아니므로 매수 검토 수량은 확정하지 않았습니다.'}</Typography>
    </>}
    {(reducing || selling) && sizing.status === 'READY' && <Typography>저장 당시 {quantityLabel} 검토 수량: {result.quantity == null ? '미확정' : `${number(result.quantity)}주`} · 계획상 잔여 {number(sizing.remainingQuantity)}주</Typography>}
    {held && !reducing && !selling && sizing.remainingLossBudget != null && <Typography variant="body2">추가로 사용할 수 있는 손실 한도 {number(sizing.remainingLossBudget)}원 · 비중 한도 {number(sizing.remainingPositionBudget)}원</Typography>}
    <Typography variant="caption">계좌 설정 버전 {sizing.accountRevision ?? '미확인'} · 확인일 {sizing.balanceDate || '미확인'} · {held ? '보유' : '미보유'} 정보 버전 {sizing.holdingRevision ?? '미확인'}</Typography>
    <Typography variant="caption">{reducing || selling ? '분석 기준가격·고정 잔고를 사용한 매도 검토 수량입니다.' : '진입 구간 상단을 사용한 개별 판단의 매수 상한입니다.'} 비용 가정은 왕복 {number(sizing.roundTripFeeBps)}bp, 편도 체결 차이 {number(sizing.slippageBps)}bp입니다. 손절 체결·실제 손실 한도·주문 가능 수량을 보장하지 않으며, 다른 판단의 현금은 예약하지 않습니다. 설정이나 잔고 변경 후에는 새 판단이 필요합니다.</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap"><Button component="a" href="/settings#account-risk" target="_blank" rel="noopener noreferrer">계좌 위험 설정</Button><Button component="a" href="/holdings" target="_blank" rel="noopener noreferrer">{held ? '보유 정보 확인' : '미보유 정보 확인'}</Button></Stack>
  </Stack>;
}
