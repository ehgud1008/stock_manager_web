import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import DateRangeRoundedIcon from '@mui/icons-material/DateRangeRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import { Alert, Box, Chip, Grid, LinearProgress, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const TIMEFRAMES = [
  {
    key: 'daily',
    label: '일봉',
    role: '진입 타이밍',
    periods: '20 · 60 · 180일선',
    threshold: 60,
    passLabel: '타이밍 양호',
    waitLabel: '조정 · 대기',
    Icon: TodayRoundedIcon,
  },
  {
    key: 'weekly',
    label: '주봉',
    role: '스윙 중심 추세',
    periods: '5 · 20 · 40주선',
    threshold: 65,
    passLabel: '추세 유효',
    waitLabel: '추세 확인',
    Icon: DateRangeRoundedIcon,
  },
  {
    key: 'monthly',
    label: '월봉',
    role: '장기 방향 필터',
    periods: '6 · 12 · 24개월선',
    threshold: 40,
    passLabel: '진입 허용',
    waitLabel: '장기 약세',
    Icon: CalendarMonthRoundedIcon,
  },
];

const formatScore = (value) => value == null
  ? '—'
  : Number(value).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const decisionMessage = (result) => {
  if (result.suitabilityScores) return { severity: 'info', text: '가격 구조 참고 점수입니다. 일봉·주봉은 추세 항목에 반영되며, 월봉은 단독 회피 조건이 아닙니다.' };
  if (result.strategyCode === 'SWING_PULLBACK_WAIT') {
    return { severity: 'warning', text: '주봉 추세는 유효하지만 일봉 타이밍이 약해 눌림목 확인 후 진입을 기다립니다.' };
  }
  if (result.strategyAction === 'AVOID' && Number(result.timeframeScores?.monthly) < 40) {
    return { severity: 'error', text: '월봉 장기 추세가 기준점수보다 낮아 신규 진입을 회피합니다.' };
  }
  return null;
};

export default function TimeframeScorePanel({ result }) {
  const scores = result.timeframeScores || {};
  const message = decisionMessage(result);

  return (
    <Stack gap={2}>
      {message && <Alert severity={message.severity}>{message.text}</Alert>}
      <Grid container spacing={1.5}>
        {TIMEFRAMES.map(({ key, label, role, periods, threshold, passLabel, waitLabel, Icon }) => {
          const score = scores[key];
          const available = score != null;
          const passed = available && Number(score) >= threshold;
          const color = !available ? 'default' : passed ? 'success' : key === 'monthly' ? 'error' : 'warning';
          return (
            <Grid key={key} size={{ xs: 12, md: 4 }}>
              <Box sx={{ height: '100%', p: 2, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', bgcolor: 'rgba(255,255,255,.025)' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" gap={2}>
                  <Stack direction="row" gap={1.25} alignItems="center">
                    <Box sx={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 2, color: 'primary.main', bgcolor: 'rgba(139,218,99,.08)' }}>
                      <Icon fontSize="small" />
                    </Box>
                    <Box>
                      <Typography fontWeight={700}>{label}</Typography>
                      <Typography variant="caption" color="text.secondary">{result.suitabilityScores ? '가격 구조 참고' : role}</Typography>
                    </Box>
                  </Stack>
                  <Chip label={available ? (result.suitabilityScores ? '중복 합산 제외' : passed ? passLabel : waitLabel) : '산출 불가'} color={result.suitabilityScores ? 'default' : color} size="small" variant="outlined" />
                </Stack>
                <Stack direction="row" alignItems="baseline" gap={0.5} mt={2}>
                  <Typography sx={{ fontSize: 32, fontWeight: 750, lineHeight: 1 }}>{formatScore(score)}</Typography>
                  <Typography variant="body2" color="text.secondary">/ 100</Typography>
                </Stack>
                <LinearProgress color={color === 'default' ? 'primary' : color} variant="determinate" value={available ? Math.max(0, Math.min(100, Number(score))) : 0} sx={{ height: 5, borderRadius: 5, mt: 1.5 }} />
                <Stack direction="row" justifyContent="space-between" mt={1.25}>
                  <Typography variant="caption" color="text.secondary">{result.suitabilityScores ? '직전 8봉과 이전 8봉의 고점·저점 비교' : periods}</Typography>
                  <Typography variant="caption" color="text.secondary">기준 {threshold.toFixed(1)}점</Typography>
                </Stack>
              </Box>
            </Grid>
          );
        })}
      </Grid>
      <Typography variant="caption" color="text.secondary">
        각 점수에는 이동평균 추세, 수익률 모멘텀, RSI, MACD, 일목균형표, 거래량이 함께 반영됩니다.
      </Typography>
    </Stack>
  );
}

TimeframeScorePanel.propTypes = {
  result: PropTypes.shape({
    strategyCode: PropTypes.string,
    strategyAction: PropTypes.string,
    timeframeScores: PropTypes.shape({
      daily: PropTypes.number,
      weekly: PropTypes.number,
      monthly: PropTypes.number,
    }),
  }).isRequired,
};
