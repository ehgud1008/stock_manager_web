import CloudOffRoundedIcon from '@mui/icons-material/CloudOffRounded';
import DataArrayRoundedIcon from '@mui/icons-material/DataArrayRounded';
import { Box, Button, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { PRICE_DATA_STATUS } from '../../../constants/priceDataStatuses';

export default function PriceDataState({ status, message, onRetry }) {
  const failed = status === PRICE_DATA_STATUS.COLLECTION_FAILED;
  const title = failed ? '가격 데이터 수집 실패' : '가격 데이터 부족';
  const description = message || (
    failed
      ? '수집 서버 상태를 확인한 뒤 다시 시도해 주세요.'
      : '차트를 표시하기 위한 최소 가격 데이터가 아직 충분하지 않습니다.'
  );

  return (
    <Box sx={{ minHeight: 360, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Stack alignItems="center" gap={1.25}>
        <Box sx={{ width: 52, height: 52, display: 'grid', placeItems: 'center', borderRadius: 2.5, bgcolor: failed ? 'rgba(242,120,120,.08)' : 'rgba(240,183,102,.08)', color: failed ? 'error.main' : 'warning.main' }}>
          {failed ? <CloudOffRoundedIcon /> : <DataArrayRoundedIcon />}
        </Box>
        <Typography variant="h3">{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 380 }}>{description}</Typography>
        {onRetry && <Button variant="outlined" color="inherit" size="small" onClick={onRetry}>다시 조회</Button>}
      </Stack>
    </Box>
  );
}

PriceDataState.propTypes = {
  status: PropTypes.oneOf(Object.values(PRICE_DATA_STATUS)).isRequired,
  message: PropTypes.string,
  onRetry: PropTypes.func,
};
