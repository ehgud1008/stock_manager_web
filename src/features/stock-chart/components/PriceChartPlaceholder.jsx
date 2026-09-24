import { Box, Stack, Typography } from '@mui/material';
import { chartPlaceholderData } from '../../../mocks/analysisMockData';

export default function PriceChartPlaceholder() {
  return (
    <Box aria-label="캔들 차트 Placeholder" sx={{ position: 'relative', height: 310, overflow: 'hidden', borderRadius: 2, bgcolor: '#0B1018', backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)', backgroundSize: '100% 25%, 12.5% 100%' }}>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-around" sx={{ position: 'absolute', inset: '26px 30px 28px 22px' }}>
        {chartPlaceholderData.candles.map((value, index) => {
          const up = index === 0 || value >= chartPlaceholderData.candles[index - 1];
          return (
            <Box key={`${value}-${index}`} sx={{ position: 'relative', width: { xs: 4, md: 7 }, height: `${value}%`, maxHeight: 230, borderLeft: '1px solid', borderColor: up ? 'error.main' : 'secondary.main', opacity: 0.75 }}>
              <Box sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: `${(index % 4) * 8 + 12}%`, width: { xs: 3, md: 7 }, height: `${23 + (index % 3) * 8}%`, bgcolor: up ? 'error.main' : 'secondary.main', borderRadius: '1px' }} />
            </Box>
          );
        })}
      </Stack>
      <Typography variant="overline" color="text.secondary" sx={{ position: 'absolute', top: 14, left: 18 }}>CANDLE CHART PLACEHOLDER</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', bottom: 8, right: 14 }}>실제 시세 데이터 아님</Typography>
    </Box>
  );
}
