import { Box, Typography } from '@mui/material';

export default function EmptyState() {
  return (
    <Box sx={{ minHeight: 220, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
      <Box><Typography variant="h3">표시할 데이터가 없습니다</Typography><Typography color="text.secondary" mt={1}>조건을 변경한 뒤 다시 시도해 주세요.</Typography></Box>
    </Box>
  );
}
