import { Alert, Box, Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

const ACTIONS = {
  STRONG_BUY_CANDIDATE: ['적극 매수 후보', 'success'], BUY_CANDIDATE: ['매수 후보', 'success'],
  WATCH: ['관망', 'default'], AVOID: ['신규 매수 회피', 'warning'], HOLD: ['보유 유지', 'success'],
  REVIEW_HOLDING: ['보유 재검토', 'warning'], SELL_PRIORITY: ['매도 우선', 'error'],
  EXIT_TRIGGERED: ['청산 조건 충족', 'error'], TAKE_PROFIT_REVIEW: ['익절 검토', 'info'], DEFER: ['판단 보류', 'warning'],
};

export default function TradeJudgmentPanel({ judgment }) {
  if (!judgment) return <Alert severity="info">이 결과에는 매매판단이 저장되어 있지 않습니다. 새 분석을 실행하면 함께 제공됩니다.</Alert>;
  return <Stack gap={1.5} aria-label="매매판단" sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
    <Box><Typography variant="h6">매매판단</Typography>
      <Typography variant="caption" color="text.secondary">
        가격일 {judgment.priceDate || '미확인'} · 판단 기준 {judgment.asOf ? new Intl.DateTimeFormat('ko-KR', {
          timeZone: 'Asia/Seoul', dateStyle: 'short', timeStyle: 'medium',
        }).format(new Date(judgment.asOf)) : '미확인'} (한국시간)
      </Typography>
    </Box>
    {[['notHeld', '미보유 시'], ['held', '보유 시']].map(([key, title]) => {
      const decision = judgment[key];
      const [label, color] = ACTIONS[decision?.action] || ['판단 미확인', 'warning'];
      return <Box key={key}>
        <Stack direction="row" alignItems="center" gap={1} mb={0.75}><Typography fontWeight={700}>{title}</Typography><Chip size="small" label={label} color={color} variant="outlined" /></Stack>
        {decision?.reasons?.map(reason => <Typography key={reason} variant="body2">{reason}</Typography>)}
        {decision?.reviewConditions?.map(condition => <Typography key={condition} variant="body2" color="text.secondary" mt={0.5}>재검토 조건: {condition}</Typography>)}
      </Box>;
    })}
    <Typography variant="caption" color="text.secondary">보유 정보: {{ HELD: '입력한 보유 기준', NOT_HELD: '미보유로 입력', UNKNOWN: '미확인 · 보유 시 판단은 조건부' }[judgment.positionScope] || '미확인'}</Typography>
    {judgment.limitations?.map(text => <Typography key={text} variant="caption" color="text.secondary">{text}</Typography>)}
    <Typography variant="caption" color="text.secondary">판단 정책 {judgment.policyVersion}</Typography>
  </Stack>;
}
TradeJudgmentPanel.propTypes = { judgment: PropTypes.object };
