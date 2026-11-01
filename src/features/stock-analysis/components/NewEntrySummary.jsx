import { Box, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const PATTERNS = { BREAKOUT: '돌파', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '돌파 재지지' };
const price = value => value == null ? '미확인' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });

export default function NewEntrySummary({ assessment }) {
  if (!assessment) return null;
  const signal = assessment.selectedSignal;
  const scenario = assessment.effectiveScenario;
  const rejected = assessment.signals?.filter(item => !item.eligible) || [];
  return <Box aria-label="공통 진입 근거">
    {assessment.suitability && <>
      <Typography variant="body2" fontWeight={600}>적합도 {assessment.suitability.tier === 'UNSCORED' ? '미산정' : `${assessment.suitability.tier}등급`} · {assessment.suitability.score == null ? '점수 없음' : `${assessment.suitability.score}점`}</Typography>
      <Typography variant="body2">진입 상태: {assessment.timing?.signalWaiting ? '신호 대기' : ({ ELIGIBLE: '점수 외 진입 조건 충족', WATCH: '진입 보류', AVOID: '진입 회피', DEFER: '자료 확인 필요' }[assessment.timing?.status] || '미확인')}</Typography>
      {assessment.timing?.reasons?.map(text => <Typography key={text} variant="body2">{text}</Typography>)}
      {assessment.suitability.weaknesses?.map(text => <Typography key={text} variant="caption" display="block">주요 감점: {text}</Typography>)}
      <Typography variant="caption">티어는 적합도 구간이며 상승 확률이 아닙니다. B등급은 비교 대상이며 운영 매수 후보가 아닙니다.</Typography>
    </>}
    <Typography variant="body2" fontWeight={600}>
      {assessment.suitability ? (assessment.status === 'ELIGIBLE' ? 'A등급 운영 진입 자격 충족 · 리포트 추가 조건은 별도 적용' : '운영 신규 진입 보류 · 아래 판정 근거 확인') : (assessment.status === 'ELIGIBLE' ? '공통 신규 진입 조건 충족 · 리포트 추가 조건은 별도 적용' : '공통 신규 진입 조건 미통과')}
    </Typography>
    {assessment.suitability && assessment.reasons?.map(text => <Typography key={text} variant="body2">{text}</Typography>)}
    {signal && <Typography variant="body2">검사 기준 신호: {PATTERNS[signal.type] || signal.type} · 발생일 {signal.occurredOn} · 경과 {signal.ageBars}봉</Typography>}
    {scenario && <Typography variant="body2">
      {assessment.status === 'ELIGIBLE' ? '유효 진입 구간' : '신호 참고 구간 · 진입 보류'}: {price(scenario.entryFrom)}~{price(scenario.entryTo)}원 · 첫 목표 {price(scenario.targets?.[0])}원 · 손절 {price(scenario.stopLoss)}원
    </Typography>}
    {scenario && <Typography variant="caption" color="text.secondary">신호 구간과 시나리오 구간이 겹치는 범위입니다. 목표·손절은 분석 시나리오 기준입니다.</Typography>}
    {!!rejected.length && <Box component="details" mt={0.5}>
      <Typography component="summary" variant="body2">선택하지 않은 신호 {rejected.length}개</Typography>
      {rejected.map((item, index) => <Typography key={`${item.signalId}-${index}`} variant="body2" color="text.secondary">
        {PATTERNS[item.type] || item.type} · 경과 {item.ageBars}봉: {item.reasons?.join(' ')}
      </Typography>)}
    </Box>}
  </Box>;
}
NewEntrySummary.propTypes = { assessment: PropTypes.object };
