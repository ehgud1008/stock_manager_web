import { Alert, Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';

const styles = { SHORT_TERM: '단기 매매', SWING: '스윙', MEDIUM_TERM: '중기 보유', LONG_TERM: '장기 보유', UNDETERMINED: '판단 유보' };
const status = { SUITABLE: '적합', CONDITIONAL: '조건부', UNSUITABLE: '부적합', INSUFFICIENT: '자료 부족' };
const fits = { MATCH: '적합', CONDITIONAL: '조건부 적합', MISMATCH: '현재 성향·여건과 맞지 않음', INSUFFICIENT: '판단 자료 부족' };
const monitoring = { INTRADAY: '장중 수시 확인', DAILY: '하루 한 번 확인', OCCASIONAL: '가끔 확인' };
const actions = { BUY: '매수 검토', SELL: '청산 검토', HOLD: '보유', WAIT: '대기', UNDETERMINED: '판단 유보' };
const nextActions = { CONSIDER_ENTRY: '진입 검토', CONSIDER_EXIT: '청산 검토', HOLD: '보유 유지', WAIT_FOR_CONDITION: '조건 확인까지 대기', REVIEW: '재검토' };
const profiles = { AGGRESSIVE: '공격적 관점', BALANCED: '균형적 관점', CONSERVATIVE: '보수적 관점' };
const periodText = period => period?.minTradingDays == null ? '기간 제안 유보' : `${period.minTradingDays}~${period.maxTradingDays}거래일`;

export default function SuitabilityView({ result }) {
  const market = result.marketAssessment;
  const personal = result.aiReview?.personalization;
  if (!personal) return <Alert severity="info">이전 형식의 분석입니다. 종목·사용자 적합성과 다음 행동은 새 평가에서 확인할 수 있습니다.</Alert>;
  const savedPreferences = result.policy?.preferences;
  return <Stack gap={2}>
    <Alert severity={['MISMATCH', 'INSUFFICIENT'].includes(personal.fit) ? 'warning' : 'info'}>
      <Typography fontWeight={700}>지금 할 일 · {nextActions[personal.nextAction.action]}</Typography>
      <Typography variant="body2">{personal.nextAction.instruction}</Typography>
    </Alert>
    {market && <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
      <Typography fontWeight={700}>종목 자체의 투자 적합성</Typography>
      <Typography variant="caption" color="text.secondary">개인 성향·보유 정보 없이 별도로 분석한 결과</Typography>
      <Typography>{styles[market.recommendedStyle]} · {periodText(market.holdingPeriod)}</Typography>
      <Typography variant="body2">{market.holdingPeriod.reason}</Typography>
      <Typography variant="body2">필요한 확인 빈도: {monitoring[market.requiredMonitoring]}</Typography>
      <Table size="small" aria-label="종목별 투자 방식 적합성"><TableHead><TableRow><TableCell>투자 방식</TableCell><TableCell>평가</TableCell><TableCell>근거</TableCell></TableRow></TableHead>
        <TableBody>{market.styles.map(row => <TableRow key={row.style}><TableCell>{styles[row.style]}</TableCell><TableCell>{status[row.status]}</TableCell><TableCell>{row.reason}</TableCell></TableRow>)}</TableBody></Table>
    </Box>}
    <Box><Typography fontWeight={700}>내 성향을 반영한 전략</Typography>
      <Chip size="small" label={fits[personal.fit]} color={personal.fit === 'MISMATCH' ? 'warning' : 'default'} />
      <Typography>{styles[personal.selectedStyle]} · {periodText(personal.holdingPeriod)}</Typography>
      <Typography variant="body2">{personal.reason}</Typography>
      {savedPreferences && <Typography variant="caption">저장 조건: 공격적 {savedPreferences.aggressive}% · 균형적 {savedPreferences.balanced}% · 보수적 {savedPreferences.conservative}% · {monitoring[savedPreferences.monitoring]}</Typography>}
      <Typography variant="body2">전략에 필요한 확인 빈도: {monitoring[personal.requiredMonitoring]}</Typography>
      <Typography variant="body2">기간 근거: {personal.holdingPeriod.reason}</Typography>
      <Typography variant="body2">조기 청산·재검토: {personal.holdingPeriod.earlyExit}</Typography>
      <Typography variant="body2">기간 경과 후 대응: {personal.holdingPeriod.expiryAction}</Typography>
      <Typography variant="caption" color="text.secondary">보유기간은 전략을 검토하는 범위이며 목표 도달 예상일이 아닙니다.</Typography>
    </Box>
    {personal.perspectives.map(row => <Box key={row.profile}><Typography fontWeight={700}>{profiles[row.profile]}</Typography>
      <Typography variant="body2">진입: {row.entryRule}</Typography><Typography variant="body2">청산: {row.exitRule}</Typography><Typography variant="body2">선택의 장단점: {row.tradeoff}</Typography></Box>)}
    <Box><Typography fontWeight={700}>판단이 바뀌는 조건</Typography><Typography variant="caption" color="text.secondary">저장된 검토 기준입니다. 자동 감시·알림·주문은 실행하지 않습니다.</Typography></Box>
    {personal.transitions.map(t => <Box key={t.id} sx={{ borderLeft: 3, borderColor: t.id === personal.nextAction.transitionId ? 'primary.main' : 'divider', pl: 2 }}>
      <Typography fontWeight={600}>{actions[t.fromAction]} → {actions[t.toAction]}{t.id === personal.nextAction.transitionId ? ' · 우선 확인' : ''}</Typography>
      <Typography variant="body2">조건: {t.trigger}</Typography><Typography variant="body2">무효화: {t.invalidation}</Typography>
      {t.priceCondition && <Typography variant="body2">확정 종가가 {Number(t.priceCondition.price).toLocaleString('ko-KR')}원 {t.priceCondition.operator === 'ABOVE' ? '초과' : '미만'}인지 확인</Typography>}
      <Chip size="small" variant="outlined" label={t.assessmentMode === 'PRICE_CHECK' ? '가격으로 확인 가능' : '추가 AI 해석 필요'} />
    </Box>)}
    <Box><Typography fontWeight={700}>이 결론의 약점</Typography>
      {[['strongestReason', '가장 강한 근거'], ['strongestCounter', '가장 중요한 반대 근거'], ['decisiveUnknown', '결론을 바꿀 미확인 정보'], ['avoidIf', '전략을 피해야 할 상황']].map(([key, title]) => <Typography variant="body2" key={key}>{title}: {personal.fragility[key]}</Typography>)}
    </Box>
  </Stack>;
}
