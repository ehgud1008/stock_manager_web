import ConstructionRoundedIcon from '@mui/icons-material/ConstructionRounded';
import { Box, Chip, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';

export default function NotImplementedState({ compact = false }) {
  return (
    <Box sx={{ py: compact ? 2 : 5, textAlign: 'center' }}>
      <Stack alignItems="center" gap={1.25}>
        <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: 'rgba(240,183,102,.1)', color: 'warning.main' }}>
          <ConstructionRoundedIcon />
        </Box>
        <Chip label="NOT IMPLEMENTED" size="small" color="warning" variant="outlined" />
        <Typography variant="h3">분석 엔진 준비 중</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
          백엔드 분석 로직이 연결되면 이 영역에 결과가 표시됩니다.
        </Typography>
      </Stack>
    </Box>
  );
}

NotImplementedState.propTypes = { compact: PropTypes.bool };
