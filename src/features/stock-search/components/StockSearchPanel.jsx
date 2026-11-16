import { Box, Stack, Typography } from '@mui/material';
import StockSearchAutocomplete from './StockSearchAutocomplete';

export default function StockSearchPanel() {
  return (
    <Box component="section" aria-label="종목 분석 시작" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, border: '1px solid rgba(139,218,99,.22)', background: 'linear-gradient(115deg, rgba(139,218,99,.09), rgba(17,22,32,.94) 48%)', boxShadow: '0 18px 60px rgba(0,0,0,.18)' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ lg: 'flex-end' }} gap={2}>
        <Box flex={1} minWidth={0}>
          <Typography variant="h3">개별 종목 분석</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.75}>종목명이나 코드를 검색해 가격 차트와 분석을 확인하세요.</Typography>
          <Box mt={1}>
            <StockSearchAutocomplete />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
