import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingState() {
  return (
    <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Box><CircularProgress size={26} /><Typography color="text.secondary" mt={1.5}>데이터를 불러오는 중입니다.</Typography></Box>
    </Box>
  );
}
