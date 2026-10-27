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
    <Typography variant="body2" fontWeight={600}>
      {assessment.status === 'ELIGIBLE' ? '공통 신규 진입 조건 충족 · 리포트 추가 조건은 별도 적용' : '공통 신규 진입 조건 미통과'}
    </Typography>
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
