import { Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function IndicatorChartPlaceholder({ indicator }) {
  return (
    <Box aria-label={`${indicator} Placeholder`} sx={{ height: 110, position: 'relative', borderRadius: 2, bgcolor: '#0B1018', overflow: 'hidden', backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px)', backgroundSize: '100% 50%' }}>
      <Stack direction="row" justifyContent="space-between" sx={{ position: 'absolute', top: 10, left: 14, right: 14 }}><Typography variant="overline" color="text.secondary">{indicator}</Typography><Typography variant="caption" color="text.secondary">PLACEHOLDER</Typography></Stack>
      <Box sx={{ position: 'absolute', left: '5%', right: '5%', bottom: indicator === 'RSI' ? '38%' : '52%', height: 2, bgcolor: indicator === 'RSI' ? 'warning.main' : 'primary.main', opacity: 0.65, transform: indicator === 'RSI' ? 'skewY(-2deg)' : 'skewY(3deg)', boxShadow: indicator === 'MACD' ? '28px 12px 0 rgba(113,167,255,.55)' : 'none' }} />
    </Box>
  );
}

IndicatorChartPlaceholder.propTypes = { indicator: PropTypes.oneOf(['RSI', 'MACD']).isRequired };
