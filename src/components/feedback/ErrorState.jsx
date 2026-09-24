import { Alert, AlertTitle, Button, Stack } from '@mui/material';
import PropTypes from 'prop-types';

export default function ErrorState({ message, onRetry }) {
  return (
    <Alert severity="error" role="alert" sx={{ alignItems: 'center' }}>
      <AlertTitle>데이터를 불러오지 못했습니다</AlertTitle>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} gap={2}>
        <span>{message || '잠시 후 다시 시도해 주세요.'}</span>
        {onRetry && <Button size="small" color="inherit" variant="outlined" onClick={onRetry}>다시 시도</Button>}
      </Stack>
    </Alert>
  );
}

ErrorState.propTypes = { message: PropTypes.string, onRetry: PropTypes.func };
