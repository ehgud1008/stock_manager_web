import { Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { TARGET_BASIS } from '../scenarioPresentation';

export default function TargetBasisNotice({ scenario, compact = false }) {
  if (!scenario?.targets?.length) return null;
  const synthetic = scenario.targetBasis === TARGET_BASIS.SYNTHETIC;
  const observed = scenario.targetBasis === TARGET_BASIS.OBSERVED;
  const explanation = synthetic ? '확인된 상단 저항이 없어 변동폭·손절 거리로 계산한 목표입니다. 관측 저항이나 도달 예측이 아닙니다.'
    : observed ? '확정 일봉에서 확인한 미돌파 저항 가격을 목표로 사용합니다. 도달을 보장하지 않습니다.'
      : '이 저장 결과에는 목표가 유형이 기록되지 않았습니다. 관측 저항 또는 가정 목표로 단정하지 않습니다.';
  return <Stack gap={0.5} alignItems="flex-start" aria-label="목표가 산출 근거">
    <Chip size="small" variant="outlined" color={synthetic ? 'warning' : 'default'}
      title={explanation}
      label={synthetic ? '신고가 가정 목표 · 2R / 3.5R' : observed ? '관측 저항 목표' : '목표 근거 미기록'} />
    {!compact && <Typography variant="caption" color="text.secondary">{explanation}</Typography>}
  </Stack>;
}
TargetBasisNotice.propTypes = { scenario: PropTypes.object, compact: PropTypes.bool };
