import { Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function VolumeSeriesChart({ candles }) {
  const maxVolume = Math.max(...candles.map((candle) => candle.volume), 1);

  return (
    <Box aria-label="거래량 차트" sx={{ height: 120, position: 'relative', borderRadius: 2, bgcolor: '#0B1018', overflow: 'hidden' }}>
      <Typography variant="overline" color="text.secondary" sx={{ position: 'absolute', zIndex: 1, top: 10, left: 14 }}>VOLUME</Typography>
      <Stack direction="row" alignItems="flex-end" sx={{ position: 'absolute', inset: '34px 20px 10px', minWidth: Math.max(600, candles.length * 24) }}>
        {candles.map((candle) => (
          <Box key={candle.date} sx={{ flex: 1, minWidth: 18, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', height: '100%' }}>
            <Box sx={{ width: '48%', height: `${Math.max((candle.volume / maxVolume) * 100, 3)}%`, bgcolor: candle.close >= candle.open ? 'rgba(242,120,120,.55)' : 'rgba(113,167,255,.48)', borderRadius: '2px 2px 0 0' }} />
          </Box>
        ))}
      </Stack>
    </Box>
  );
}

VolumeSeriesChart.propTypes = {
  candles: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    open: PropTypes.number.isRequired,
    close: PropTypes.number.isRequired,
    volume: PropTypes.number.isRequired,
  })).isRequired,
};
