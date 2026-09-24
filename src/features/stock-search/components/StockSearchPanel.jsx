import { Box, Button, ButtonGroup, Stack, Typography } from '@mui/material';
import { useState } from 'react';
import { ANALYSIS_MODE } from '../../../constants/analysisModes';
import StockSearchAutocomplete from './StockSearchAutocomplete';

export default function StockSearchPanel() {
  const [mode, setMode] = useState(ANALYSIS_MODE.SWING);

  return (
    <Box component="section" aria-label="종목 분석 시작" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, border: '1px solid rgba(139,218,99,.22)', background: 'linear-gradient(115deg, rgba(139,218,99,.09), rgba(17,22,32,.94) 48%)', boxShadow: '0 18px 60px rgba(0,0,0,.18)' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ lg: 'flex-end' }} gap={2}>
        <Box flex={1} minWidth={0}>
          <Typography variant="overline" color="primary.main">QUICK ANALYSIS</Typography>
          <Box mt={1}>
            <StockSearchAutocomplete navigationState={{ analysisMode: mode }} />
          </Box>
        </Box>
        <Box>
          <Typography variant="caption" color="text.secondary" display="block" mb={1}>분석 모드</Typography>
          <ButtonGroup variant="outlined" aria-label="분석 모드">
            <Button color={mode === ANALYSIS_MODE.SWING ? 'primary' : 'inherit'} variant={mode === ANALYSIS_MODE.SWING ? 'contained' : 'outlined'} onClick={() => setMode(ANALYSIS_MODE.SWING)}>SWING</Button>
            <Button color={mode === ANALYSIS_MODE.SHORT_TERM ? 'primary' : 'inherit'} variant={mode === ANALYSIS_MODE.SHORT_TERM ? 'contained' : 'outlined'} onClick={() => setMode(ANALYSIS_MODE.SHORT_TERM)}>SHORT TERM</Button>
          </ButtonGroup>
        </Box>
      </Stack>
    </Box>
  );
}
