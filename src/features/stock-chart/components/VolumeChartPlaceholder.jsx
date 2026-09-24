import { Box, Stack, Typography } from '@mui/material';
import { chartPlaceholderData } from '../../../mocks/analysisMockData';

export default function VolumeChartPlaceholder() {
  return (
    <Box aria-label="거래량 Placeholder" sx={{ height: 110, position: 'relative', borderRadius: 2, bgcolor: '#0B1018', overflow: 'hidden' }}>
      <Typography variant="overline" color="text.secondary" sx={{ position: 'absolute', zIndex: 1, top: 10, left: 14 }}>VOLUME</Typography>
      <Stack direction="row" alignItems="flex-end" justifyContent="space-around" sx={{ position: 'absolute', inset: '30px 20px 10px' }}>
        {chartPlaceholderData.volumes.map((value, index) => <Box key={`${value}-${index}`} sx={{ width: { xs: 4, md: 8 }, height: `${value}%`, bgcolor: index % 3 === 0 ? 'rgba(242,120,120,.55)' : 'rgba(113,167,255,.42)', borderRadius: '2px 2px 0 0' }} />)}
      </Stack>
    </Box>
  );
}
