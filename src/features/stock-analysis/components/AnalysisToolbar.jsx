import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import { Box, Button, ButtonGroup, FormControlLabel, Stack, Switch, TextField, Tooltip, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { ANALYSIS_MODE, ANALYSIS_MODE_LABEL } from '../../../constants/analysisModes';

export default function AnalysisToolbar({ mode, baseDate, forceRecalculate, running, onModeChange, onBaseDateChange, onForceChange, onExecute }) {
  return (
    <Box component="section" aria-label="종목분석 실행 설정" sx={{ p: { xs: 2, md: 2.25 }, mb: 2.5, borderRadius: 3, border: '1px solid rgba(139,218,99,.22)', background: 'linear-gradient(110deg, rgba(139,218,99,.09), rgba(17,22,32,.96) 42%)' }}>
      <Stack direction={{ xs: 'column', lg: 'row' }} alignItems={{ lg: 'flex-end' }} gap={2}>
        <Box>
          <Typography variant="overline" color="primary.main">ANALYSIS MODE</Typography>
          <ButtonGroup variant="outlined" sx={{ display: 'flex', mt: 0.75 }}>
            <Button onClick={() => onModeChange(ANALYSIS_MODE.SWING)} variant="contained" color="primary" aria-pressed={mode === ANALYSIS_MODE.SWING}>
              {ANALYSIS_MODE_LABEL[ANALYSIS_MODE.SWING]}
            </Button>
            <Tooltip title="분봉 기반 단타 분석은 별도 엔진으로 제공할 예정입니다.">
              <span><Button disabled>단타 · 준비 중</Button></span>
            </Tooltip>
          </ButtonGroup>
        </Box>
        <TextField label="분석 기준일" type="date" value={baseDate} onChange={(event) => onBaseDateChange(event.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ minWidth: 170 }} />
        <FormControlLabel control={<Switch checked={forceRecalculate} onChange={(event) => onForceChange(event.target.checked)} color="primary" />} label={<Box><Typography variant="body2">새로 계산</Typography><Typography variant="caption" color="text.secondary">기존 결과를 사용하지 않음</Typography></Box>} sx={{ ml: { lg: 0.5 } }} />
        <Box flex={1} />
        <Button variant="contained" size="large" startIcon={<PlayArrowRoundedIcon />} onClick={onExecute} disabled={running || !baseDate} sx={{ minWidth: 168 }}>
          {running ? '분석 중…' : '종목분석 실행'}
        </Button>
      </Stack>
    </Box>
  );
}

AnalysisToolbar.propTypes = {
  mode: PropTypes.oneOf(Object.values(ANALYSIS_MODE)).isRequired,
  baseDate: PropTypes.string.isRequired,
  forceRecalculate: PropTypes.bool.isRequired,
  running: PropTypes.bool.isRequired,
  onModeChange: PropTypes.func.isRequired,
  onBaseDateChange: PropTypes.func.isRequired,
  onForceChange: PropTypes.func.isRequired,
  onExecute: PropTypes.func.isRequired,
};
