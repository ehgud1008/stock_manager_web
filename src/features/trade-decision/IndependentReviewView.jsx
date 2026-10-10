import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import DecisionPlanView, { MetricReferences } from './DecisionPlanView';
import SuitabilityView from './SuitabilityView';

const actions = { BUY: '매수 검토', SELL: '매도 검토', HOLD: '보유 유지', WAIT: '진입 대기', UNDETERMINED: '판단 유보' };
const strength = { ASSERTIVE: '적극적', CONDITIONAL: '조건부', CAUTIOUS: '보수적' };
const alignment = { AGREE: '엔진과 동의', PARTIAL: '엔진과 부분 동의', DISAGREE: '엔진과 다른 판단' };
const kinds = { OBSERVED: '관측 가격', CALCULATED: '계산 참고선', PROJECTION: '가정한 전망' };
const strategies = { MAIN: '주 전략', ALTERNATIVE: '대안 전략', DEFENSIVE: '방어 전략' };
const scenarios = { UPSIDE: '상승 시나리오', RANGE: '기본·횡보 시나리오', DOWNSIDE: '하락 시나리오' };
const evidenceNames = { MARKET_DATA: '저장 일봉·거래량', TREND: '추세 지표', FACTORS: '분석 요인', VALUATION: '엔진 전략 평가', SIGNALS: '매매 신호',
  QUALITY: '자료 품질', HORIZON: '선택 기간', PRICE_STRUCTURE: '가격 구조', WEEKLY: '주봉 추세', TIME_RULE: '재검토 시점', HOLDING: '보유 조건', POSITION: '보유 상태', PLAN: '엔진 가격 계획' };
const price = value => `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}원`;
const refs = ids => ids?.map(id => evidenceNames[id] || id).join(' · ');

function Explanation({ title, value, policy }) {
  if (!value) return null;
  return <Box><Typography fontWeight={700}>{title}</Typography><Typography variant="body2" sx={{ whiteSpace: 'pre-line', my: 0.5 }}>{value.text}</Typography>
    <MetricReferences ids={value.metricIds} metrics={policy.metrics} /><Typography variant="caption" color="text.secondary">근거: {refs(value.evidenceIds)}</Typography></Box>;
}

function PriceLevel({ label, level, policy }) {
  const parts = level.sourcePath.split('/');
  const bar = parts[1] === 'marketData' ? policy.marketData?.candles?.[Number(parts[3])] : null;
  const metric = parts[1] === 'metrics' ? policy.metrics?.[parts[2]] : null;
  const origin = bar ? `${bar[0]} ${['', '시가', '고가', '저가', '종가'][Number(parts[4])]}` : metric?.label || '저장 가격';
  const sourceValue = bar ? bar[Number(parts[4])] : metric?.value;
  return <Box sx={{ p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap"><Typography fontWeight={600}>{label} {price(level.value)}</Typography><Chip size="small" variant="outlined" label={kinds[level.kind]} /></Stack>
    <Typography variant="body2">{level.basis}</Typography>
    <Typography variant="caption" color="text.secondary">기준: {origin}{sourceValue != null ? ` ${price(sourceValue)}` : ''}
      {level.adjustmentPct != null ? ` × (1 + ${level.adjustmentPct} / 100), 소수 둘째 자리 반올림` : ' · 관측값 반올림'}</Typography>
  </Box>;
}

export default function IndependentReviewView({ result }) {
  const { aiReview: review, policy, strategyCalculations = [] } = result;
  const independent = review.independent;
  return <Stack gap={2}>
    <SuitabilityView result={result} />
    <Stack direction="row" gap={1} flexWrap="wrap"><Chip label="AI 독립 분석" color="primary" variant="outlined" /><Chip label={`판단 태도: ${strength[independent.strength]}`} /><Chip label={alignment[independent.alignment]} /></Stack>
    <Typography variant="caption" color="text.secondary">판단 태도는 성공 확률이 아닙니다. 가격의 근거 참조와 산술을 검사했으며, 전망이나 해석의 정확성을 검증한 것은 아닙니다.</Typography>
    <Explanation title="AI 핵심 판단" value={review.detail?.conclusion} policy={policy} />
    <Box><Typography fontWeight={700}>엔진과 AI 비교</Typography><Typography variant="body2">엔진: {actions[policy.engineAssessment] || '판단 유보'} · AI: {result.finalAction === 'BUY' && result.context?.positionStatus === 'HELD' ? '추가 매수 검토' : actions[result.finalAction]}</Typography>
      <Explanation title="일치·충돌 근거" value={independent.engineComparison} policy={policy} /></Box>
    <Typography variant="h6">AI 제안 가격 전략</Typography>
    {!independent.strategies.length && <Alert severity="info">AI 가격 전략 미제시: {independent.strategyOmissionReason || '제안할 근거가 부족합니다. 누락 정보와 조건을 확인하세요.'}</Alert>}
    {independent.strategies.map(strategy => {
      const calculation = strategyCalculations.find(row => row.strategyId === strategy.id);
      return <Stack key={strategy.id} gap={1} sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
        <Typography fontWeight={700}>{strategies[strategy.id]} · {strategy.horizonTradingDays}거래일{review.planId === strategy.id ? ' · 선택 전략' : ''}</Typography>
        <Typography variant="body2">{strategy.rationale}</Typography>
        <PriceLevel label="진입 하단" level={strategy.entryLow} policy={policy} /><PriceLevel label="진입 상단" level={strategy.entryHigh} policy={policy} />
        {strategy.targets.map((level, i) => <PriceLevel key={i} label={`${i + 1}차 목표`} level={level} policy={policy} />)}
        <PriceLevel label="손절 참고선" level={strategy.stop} policy={policy} />
        {calculation && <Box><Typography variant="body2" fontWeight={600}>서버 재계산 · {calculation.referenceKind === 'CURRENT_PRICE' ? '분석 종가' : '진입 상단'} {price(calculation.referencePrice)} 기준</Typography>
          <Typography variant="body2">손절까지 하락 폭 {calculation.lossPct}%</Typography>
          {calculation.targets.map((target, i) => <Typography key={i} variant="body2">{i + 1}차 목표 상승 여력 {target.upsidePct}% · 손익비 {target.rewardRisk}배</Typography>)}
          {calculation.costBasisReturnPct != null && <Typography variant="body2">매수가 대비 평가손익 {calculation.costBasisReturnPct}%</Typography>}
          <Typography variant="caption" color="text.secondary">목표 도달을 가정한 가격 거리입니다. 기대수익률·도달 확률이 아니며 비용은 제외합니다.</Typography></Box>}
        <Typography variant="body2">가정: {strategy.assumptions.join(' · ')}</Typography>
        <Typography variant="body2">무효화: {strategy.invalidation}</Typography><Typography variant="body2">시간 조건: {strategy.timeCondition}</Typography>
        <Typography variant="caption" color="text.secondary">근거: {refs(strategy.evidenceIds)}</Typography>
      </Stack>;
    })}
    {review.scenarios.map(scenario => <Stack key={scenario.conditionId} gap={0.5} sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 2 }}>
      <Typography fontWeight={700}>{scenarios[scenario.conditionId]}{scenario.strategyId ? ` · ${strategies[scenario.strategyId]}` : ''}</Typography>
      {[['trigger', '확인 조건'], ['development', '예상 전개·가정'], ['response', '대응'], ['newInvestorAction', '신규 진입자'], ['holderAction', '보유자'], ['invalidation', '무효화'], ['timeCondition', '재검토 시점']]
        .map(([field, title]) => <Typography key={field} variant="body2">{title}: {scenario[field]}</Typography>)}
      <MetricReferences ids={scenario.metricIds} metrics={policy.metrics} />
    </Stack>)}
    {[['horizonAssessment', '선택 기간의 적합성'], ['entryPlan', '진입과 취소 조건'], ['exitPlan', '보유·청산 대응'], ['timeReview', '재검토 계획']].map(([field, title]) => <Explanation key={field} title={title} value={review.detail?.[field]} policy={policy} />)}
    {[['supportingReasons', '판단 근거'], ['opposingReasons', '반대 근거·틀릴 가능성']].map(([field, title]) => <Box key={field}><Typography fontWeight={700}>{title}</Typography>
      {review[field].map((r, i) => <Typography key={i} variant="body2">{r.explanation} ({refs([r.evidenceId])})</Typography>)}</Box>)}
    {!!review.missingInformation.length && <Alert severity="info">누락 정보: {review.missingInformation.join(' · ')}</Alert>}
    <Typography variant="body2">우선 재검토: {review.reviewConditionIds.map(id => scenarios[id]).join(' · ')}</Typography>
    <Accordion disableGutters><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography>저장된 엔진 참고 계획·자료 범위</Typography></AccordionSummary>
      <AccordionDetails><Typography variant="body2">자료 기준일 {policy.priceDate} · 저장 일봉 {policy.marketData?.candles?.length || 0}개 · 외부 뉴스 검색 없음</Typography><DecisionPlanView policy={policy} /></AccordionDetails></Accordion>
  </Stack>;
}
