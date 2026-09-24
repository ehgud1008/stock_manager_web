import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import { Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import formatDateTime from '../../../utils/formatDateTime';

const formatCollectedAt = (value) => {
  if (!value) return '수집 시각 미제공';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function PriceDataStatusBar({
  baseDate,
  isLatest,
  lastCollectedAt,
  source,
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      alignItems={{ sm: 'center' }}
      justifyContent="space-between"
      gap={1.25}
      sx={{ p: 1.5, mb: 1.5, borderRadius: 2, bgcolor: 'rgba(255,255,255,.025)', border: '1px solid', borderColor: 'divider' }}
    >
      <Stack direction="row" alignItems="center" gap={1}>
        <Chip
          label={isLatest ? '최신 데이터' : '업데이트 필요'}
          color={isLatest ? 'success' : 'warning'}
          size="small"
          variant="outlined"
        />
        {source === 'MOCK' && <Chip label="화면용 시세 샘플" size="small" variant="outlined" />}
      </Stack>
      <Stack direction="row" alignItems="center" gap={0.75} color="text.secondary">
        <AccessTimeRoundedIcon sx={{ fontSize: 16 }} />
        <Typography variant="caption">
          기준일 {formatDateTime(baseDate)} · 수집 {formatCollectedAt(lastCollectedAt)}
        </Typography>
      </Stack>
    </Stack>
  );
}

PriceDataStatusBar.propTypes = {
  baseDate: PropTypes.string,
  isLatest: PropTypes.bool.isRequired,
  lastCollectedAt: PropTypes.string,
  source: PropTypes.string,
};
