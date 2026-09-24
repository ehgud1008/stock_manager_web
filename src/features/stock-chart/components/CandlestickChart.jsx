import { Box, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function CandlestickChart({ candles, analysis }) {
  const analysisLevels = [
    analysis?.currentPrice,
    analysis?.entryFrom,
    analysis?.entryTo,
    analysis?.stopLoss,
    ...(analysis?.targets || []),
  ].filter((value) => value != null && value !== '' && Number.isFinite(Number(value))).map(Number);
  const minimum = Math.min(...candles.map((candle) => candle.low), ...analysisLevels);
  const maximum = Math.max(...candles.map((candle) => candle.high), ...analysisLevels);
  const range = Math.max(maximum - minimum, 1);
  const toPosition = (value) => ((maximum - value) / range) * 100;
  const lineLevels = [
    { key: 'current', label: '현재가', value: analysis?.currentPrice, color: 'rgba(255,255,255,.65)' },
    { key: 'stop', label: '손절', value: analysis?.stopLoss, color: '#F27878' },
    ...(analysis?.targets || []).map((value, index) => ({ key: `target-${index}`, label: `목표 ${index + 1}`, value, color: '#66D38A' })),
  ].filter((item) => item.value != null && item.value !== '' && Number.isFinite(Number(item.value)));
  const entryTop = analysis?.entryFrom && analysis?.entryTo ? toPosition(Math.max(analysis.entryFrom, analysis.entryTo)) : null;
  const entryBottom = analysis?.entryFrom && analysis?.entryTo ? toPosition(Math.min(analysis.entryFrom, analysis.entryTo)) : null;

  return (
    <Box
      aria-label="가격 캔들 차트"
      sx={{
        position: 'relative',
        height: 330,
        overflowX: 'auto',
        overflowY: 'hidden',
        borderRadius: 2,
        bgcolor: '#0B1018',
        backgroundImage: 'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)',
        backgroundSize: '100% 25%, 12.5% 100%',
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ position: 'absolute', top: 12, left: 16, zIndex: 2 }}>
        PRICE / RELATIVE SAMPLE
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', top: 12, right: 16, zIndex: 2 }}>
        {maximum.toLocaleString('ko-KR', { maximumFractionDigits: 0 })} — {minimum.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}
      </Typography>
      {entryTop != null && (
        <Box sx={{ position: 'absolute', zIndex: 1, left: 20, right: 20, top: `${48 + entryTop * 2.52}px`, height: `${Math.max((entryBottom - entryTop) * 2.52, 3)}px`, bgcolor: 'rgba(113,167,255,.10)', borderTop: '1px dashed rgba(113,167,255,.55)', borderBottom: '1px dashed rgba(113,167,255,.55)', pointerEvents: 'none' }}>
          <Typography variant="caption" sx={{ position: 'absolute', right: 4, top: -18, color: 'secondary.main' }}>진입 구간</Typography>
        </Box>
      )}
      {lineLevels.map((level) => (
        <Box key={level.key} sx={{ position: 'absolute', zIndex: 1, left: 20, right: 20, top: `${48 + toPosition(Number(level.value)) * 2.52}px`, borderTop: `1px dashed ${level.color}`, pointerEvents: 'none' }}>
          <Typography variant="caption" sx={{ position: 'absolute', right: 4, top: -18, color: level.color }}>{level.label} {Number(level.value).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}</Typography>
        </Box>
      ))}
      <Stack
        direction="row"
        alignItems="stretch"
        sx={{
          position: 'absolute',
          top: 48,
          bottom: 30,
          left: 20,
          right: 20,
          minWidth: Math.max(600, candles.length * 24),
        }}
      >
        {candles.map((candle) => {
          const rising = candle.close >= candle.open;
          const color = rising ? 'error.main' : 'secondary.main';
          const wickTop = toPosition(candle.high);
          const wickBottom = toPosition(candle.low);
          const bodyTop = toPosition(Math.max(candle.open, candle.close));
          const bodyBottom = toPosition(Math.min(candle.open, candle.close));

          return (
            <Box key={candle.date} sx={{ position: 'relative', flex: 1, minWidth: 18 }}>
              <Box sx={{ position: 'absolute', top: `${wickTop}%`, height: `${Math.max(wickBottom - wickTop, 1)}%`, left: '50%', borderLeft: '1px solid', borderColor: color, opacity: 0.8 }} />
              <Box sx={{ position: 'absolute', top: `${bodyTop}%`, height: `${Math.max(bodyBottom - bodyTop, 1.5)}%`, left: '25%', right: '25%', bgcolor: color, borderRadius: '1px', opacity: 0.82 }} />
              <Typography variant="caption" color="text.secondary" sx={{ position: 'absolute', top: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)', fontSize: 9, display: Number(candle.date.replace(/\D/g, '')) % 4 === 0 ? 'block' : 'none' }}>
                {candle.date}
              </Typography>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

CandlestickChart.propTypes = {
  candles: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.string.isRequired,
    open: PropTypes.number.isRequired,
    high: PropTypes.number.isRequired,
    low: PropTypes.number.isRequired,
    close: PropTypes.number.isRequired,
    volume: PropTypes.number.isRequired,
  })).isRequired,
  analysis: PropTypes.object,
};
