import { Alert, Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { summarizeSignals } from '../signalPresentation';

export default function SignalSummary({ report }) {
  const summary = summarizeSignals(report);
  return <Stack gap={1} aria-label="신호 한눈에 보기">
    <Typography variant="body2" fontWeight={700}>신호 한눈에 보기</Typography>
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 1 }}>
      {['buy', 'sell', 'entry'].map((key, index) => <Alert key={key} severity={summary[key].color} sx={{ minWidth: 0, alignItems: 'flex-start', '& .MuiAlert-message': { minWidth: 0 } }}>
        <Typography variant="caption">{['매수 조건', '매도·익절 조건', '신규 진입 상태'][index]}</Typography>
        <Typography fontWeight={750} sx={{ my: 0.5, overflowWrap: 'anywhere' }}>{summary[key].label}</Typography>
        <Typography variant="body2">{summary[key].description}</Typography>
      </Alert>)}
    </Box>
    <Typography variant="caption" color="text.secondary">분석 시점 기준입니다. 확정은 규칙 충족을 뜻하며 수익 보장·주문 실행이 아닙니다. 점수와 신호는 별도로 판정합니다.</Typography>
  </Stack>;
}

SignalSummary.propTypes = { report: PropTypes.object };
