import { Box, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const FACTOR_LABELS = {
  DAILY_TECHNICAL: '일봉 기술점수',
  WEEKLY_TECHNICAL: '주봉 기술점수',
  MONTHLY_TECHNICAL: '월봉 기술점수',
  SUPPLY_DEMAND: '수급',
  VALUE_QUALITY: '가치·수익성',
  TREND: '추세',
  MOMENTUM: '모멘텀',
  VOLUME: '거래량',
  RELATIVE_STRENGTH: '시장·업종 상대강도',
  RISK_STABILITY: '변동성·낙폭 부담',
  LIQUIDITY: '유동성',
  ENTRY_LOCATION: '진입 위치',
  ENTRY_REWARD_RISK: '손익비·손절 부담',
  ENTRY_STOP_DISTANCE: '구조적 손절 거리',
};
const formatNumber = (value, digits = 1) => Number(value ?? 0).toLocaleString('ko-KR', { maximumFractionDigits: digits });

export default function FactorScorePanel({ factors }) {
  if (!factors.length) return <Typography color="text.secondary">계산된 팩터가 없습니다.</Typography>;
  return (
    <Stack gap={1.25}>
      {factors.map((factor) => (
        <Box key={factor.factorCode} sx={{ p: 1.75, borderRadius: 2.25, bgcolor: 'rgba(255,255,255,.025)', border: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
            <Box minWidth={0}>
              <Stack direction="row" alignItems="center" gap={1}>
                <Typography fontWeight={650}>{factor.factorCode === 'ENTRY_REWARD_RISK' && factors.some(f => f.factorCode === 'ENTRY_STOP_DISTANCE')
                  ? '손익비' : FACTOR_LABELS[factor.factorCode] || factor.factorCode}</Typography>
                <Chip label={factor.score == null ? '산출 불가' : Number(factor.weight) === 0 ? '참고 · 미합산' : `실효 비중 ${formatNumber(Number(factor.weight) * 100)}%`} size="small" variant="outlined" />
              </Stack>
              <Typography variant="body2" color="text.secondary" mt={0.5}>{factor.reason}</Typography>
            </Box>
            <Box textAlign="right" flexShrink={0}>
              <Typography sx={{ fontSize: 24, fontWeight: 700 }}>{factor.score == null ? '—' : formatNumber(factor.score)}</Typography>
              <Typography variant="caption" color="text.secondary">기여 {factor.contribution == null ? '—' : formatNumber(factor.contribution)}</Typography>
            </Box>
          </Stack>
          {factor.score != null && <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, Number(factor.score)))} sx={{ height: 4, borderRadius: 4, mt: 1.25 }} />}
        </Box>
      ))}
    </Stack>
  );
}

FactorScorePanel.propTypes = { factors: PropTypes.arrayOf(PropTypes.shape({ factorCode: PropTypes.string.isRequired, score: PropTypes.number, weight: PropTypes.number.isRequired, contribution: PropTypes.number, reason: PropTypes.string.isRequired })).isRequired };
