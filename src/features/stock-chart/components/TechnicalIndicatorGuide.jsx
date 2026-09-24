import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Stack,
  Typography,
} from '@mui/material';

const INDICATORS = [
  {
    name: '이동평균선 (5·20·60·120)',
    description: '5·20·60·120기간의 평균가격을 이은 선입니다. 단기부터 장기까지 가격 방향과 지지·저항 흐름을 확인합니다.',
  },
  {
    name: '볼린저밴드 (20, 2)',
    description: '20기간 평균선을 중심으로 표준편차 2배 범위를 표시합니다. 밴드가 넓어지면 변동성 확대, 좁아지면 변동성 축소로 해석합니다.',
  },
  {
    name: '일목균형표 (9·26·52)',
    description: '전환선·기준선과 구름대를 이용해 추세 방향과 지지·저항 구간을 함께 살펴봅니다.',
  },
  {
    name: '거래량 (VOL)',
    description: '해당 기간에 거래된 주식 수입니다. 가격 움직임에 거래량이 동반되는지 확인해 움직임의 힘을 판단합니다.',
  },
  {
    name: 'RSI (14)',
    description: '최근 상승과 하락의 강도를 0~100으로 나타냅니다. 일반적으로 70 이상은 과열, 30 이하는 침체 여부를 살피는 참고 구간입니다.',
  },
  {
    name: 'MACD (12·26·9)',
    description: '단기와 장기 이동평균의 차이를 이용해 추세 방향과 모멘텀 변화를 확인합니다.',
  },
];

export default function TechnicalIndicatorGuide() {
  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        mt: 1.5,
        bgcolor: 'rgba(11,16,24,.72)',
        border: '1px solid rgba(255,255,255,.07)',
        borderRadius: '12px !important',
        '&::before': { display: 'none' },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreRoundedIcon fontSize="small" />}
        aria-controls="technical-indicator-guide-content"
        id="technical-indicator-guide-header"
        sx={{ px: 2, minHeight: 56 }}
      >
        <Stack>
          <Typography variant="subtitle2">차트 보조지표 안내</Typography>
          <Typography variant="caption" color="text.secondary">
            현재 차트에서 사용하는 지표의 의미를 간단히 확인하세요.
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails id="technical-indicator-guide-content" sx={{ pt: 0, px: 2, pb: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            gap: 1,
          }}
        >
          {INDICATORS.map((indicator) => (
            <Box
              key={indicator.name}
              sx={{
                p: 1.25,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,.025)',
                border: '1px solid rgba(255,255,255,.055)',
              }}
            >
              <Typography variant="subtitle2" mb={0.35}>{indicator.name}</Typography>
              <Typography variant="body2" color="text.secondary" lineHeight={1.65}>
                {indicator.description}
              </Typography>
            </Box>
          ))}
        </Box>
        <Typography variant="caption" color="text.disabled" display="block" mt={1.25}>
          보조지표는 단독 매매 신호가 아니며 가격·거래량과 함께 참고해야 합니다.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
