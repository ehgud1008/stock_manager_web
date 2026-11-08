import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Stack, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PropTypes from 'prop-types';

const price = (value) => value.toLocaleString('ko-KR', { maximumFractionDigits: 0 });
const range = (zone) => `${price(zone.lower)}–${price(zone.upper)}원`;
const date = (value) => {
  const text = String(value);
  return /^\d{8}$/.test(text) ? `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}` : text.slice(0, 10);
};
const trendCopy = {
  '상승 추세 후보': '20일 평균이 60일 평균보다 높고, 최근 상승 중입니다.',
  '하락 추세 후보': '20일 평균이 60일 평균보다 낮고, 최근 하락 중입니다.',
  '추세 혼재': '이동평균 기준으로 상승·하락 방향이 뚜렷하지 않습니다.',
};

export default function ChartTechniqueSummary({ result, fibonacciEnabled = true }) {
  if (result.status !== 'READY') return <Alert severity="info" sx={{ my: 1.5 }}>{result.reason}</Alert>;
  const fib = result.fibonacci;
  const applicable = fib.status === 'CANDIDATE';
  const support = result.zones.find((zone) => zone.role === '지지 후보');
  const resistance = result.zones.find((zone) => zone.role === '저항 후보');
  const nearby = result.zones.find((zone) => zone.role === '현재가 인접 구간');
  const trend = result.observations[0];
  const fibDescription = applicable
    ? `${fib.direction === '상승 후 조정' ? '앞선 상승폭의' : '앞선 하락폭의'} ${(fib.retracement * 100).toFixed(1)}%를 ${fib.direction === '상승 후 조정' ? '반납했습니다.' : '회복했습니다.'}`
    : fib.reason;

  return <Stack gap={1.5} sx={{ p: 2, my: 1.5, border: '1px solid', borderColor: 'divider', borderRadius: 2 }} aria-label="자동 차트 기법 분석">
    <Stack direction="row" justifyContent="space-between" gap={1} flexWrap="wrap" alignItems="center">
      <Typography variant="subtitle2">차트 한눈에 보기</Typography>
      <Typography variant="caption" color="text.secondary">일봉 · {date(result.asOf)} 기준</Typography>
    </Stack>
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
      <Stack gap={0.5}>
        <Typography variant="overline" color="text.secondary">지금 흐름</Typography>
        <Typography variant="body2" fontWeight={600}>{result.box ? result.box.state : trend?.replace(' 후보', '')}</Typography>
        <Typography variant="body2" color="text.secondary">{result.box
          ? `최근 가격 범위는 ${range(result.box)}입니다. ${result.box.state === '박스권 내부' ? '아직 범위 안에 있습니다.' : '최신 봉의 마감 여부가 확인되지 않아 잠정 판단입니다.'}`
          : trendCopy[trend]}</Typography>
      </Stack>
      <Stack gap={0.5}>
        <Typography variant="overline" color="text.secondary">가까운 가격 구간</Typography>
        {nearby && <Typography variant="body2">현재가 주변 · {range(nearby)}</Typography>}
        <Typography variant="body2">아래 지지 후보 · {support ? range(support) : '뚜렷한 구간 없음'}</Typography>
        <Typography variant="body2">위 저항 후보 · {resistance ? range(resistance) : '뚜렷한 구간 없음'}</Typography>
        <Typography variant="caption" color="text.secondary">과거 고점·저점이 반복된 위치입니다.</Typography>
      </Stack>
      <Stack gap={0.5}>
        <Typography variant="overline" color="text.secondary">피보나치</Typography>
        <Typography variant="body2" fontWeight={600}>{applicable ? `피보나치 적용 후보 · ${fibonacciEnabled ? '차트 표시 중' : '표시 꺼짐'}` : '미적용'}</Typography>
        <Typography variant="body2" color="text.secondary">{fibDescription}</Typography>
        {applicable && <Typography variant="body2">기준 {price(fib.start.value)}원 → {price(fib.end.value)}원</Typography>}
      </Stack>
    </Box>
    <Typography variant="caption" color="text.secondary">지지·저항은 예상 구간이며 매수·매도 신호가 아닙니다. 최신 봉은 장중 값일 수 있습니다.</Typography>
    <Accordion disableGutters elevation={0} sx={{ bgcolor: 'transparent', '&:before': { display: 'none' } }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 0, minHeight: 36 }}>
        <Typography variant="body2" color="text.secondary">계산 근거와 전체 가격 보기</Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 0 }}>
        <Stack gap={1}>
          <Typography variant="caption">{result.observations.join(' · ')}</Typography>
          {result.zones.map((zone) => <Typography key={zone.lower} variant="body2">{zone.role} {range(zone)} · 기준 고점·저점 {zone.touches}개</Typography>)}
          {result.box && <Typography variant="body2">박스권 {range(result.box)} · {result.box.volumeRatio == null ? '거래량 비교 불가' : `최신 봉 누적 거래량은 직전 20봉 평균의 ${result.box.volumeRatio.toFixed(2)}배`}</Typography>}
          {applicable && <>
            <Typography variant="body2">기준: {date(fib.start.date)} {price(fib.start.value)}원 → {date(fib.end.date)} {price(fib.end.value)}원</Typography>
            <Stack direction="row" gap={0.75} flexWrap="wrap">{fib.levels.map((level) => <Chip key={level.ratio} size="small" variant="outlined" label={`${Number((level.ratio * 100).toFixed(1))}% · ${price(level.value)}원`} />)}</Stack>
            <Typography variant="caption" color="text.secondary">50%는 피보나치 비율과 함께 관행적으로 표시합니다.</Typography>
          </>}
        </Stack>
      </AccordionDetails>
    </Accordion>
  </Stack>;
}
ChartTechniqueSummary.propTypes = { result: PropTypes.object.isRequired, fibonacciEnabled: PropTypes.bool };
