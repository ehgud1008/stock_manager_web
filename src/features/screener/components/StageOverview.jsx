import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { STAGES } from '../screenerModel';

export default function StageOverview({ counts = {}, selected, onSelect }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }, gap: 1.25 }}>
    {STAGES.map((stage) => {
      const active = Number(selected) === stage.id;
      const count = counts[stage.id] ?? 0;
      return <ButtonBase key={stage.id} onClick={() => onSelect(active ? 'ALL' : String(stage.id))} aria-pressed={active} aria-label={`Stage ${stage.id} ${stage.label} 필터`} sx={{ textAlign: 'left', display: 'block', p: 1.75, borderRadius: 2, border: '1px solid', borderColor: active ? stage.color : 'divider', bgcolor: active ? `${stage.color}12` : 'rgba(255,255,255,.015)', transition: 'background .15s, border-color .15s', '&:hover': { borderColor: stage.color, bgcolor: `${stage.color}0D` }, '&.Mui-focusVisible': { outline: `2px solid ${stage.color}`, outlineOffset: 3 } }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="overline" sx={{ color: stage.color, letterSpacing: '.1em' }}>STAGE {stage.id}</Typography><Box sx={{ width: 6, height: 6, bgcolor: stage.color, borderRadius: '50%' }} /></Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.8} mb={1}>
          <Typography sx={{ fontSize: 30, fontWeight: 600, lineHeight: 1.2 }}>{count}<Box component="span" ml={0.5} fontSize={11} color="text.secondary">종목</Box></Typography>
          <Box component="svg" viewBox="0 0 45 32" aria-hidden="true" sx={{ width: 45, height: 32 }}>{['#8BDA63', '#71A7FF', '#D5A3EB'].map((color, index) => <line key={color} x1="3" x2="42" y1={6 + stage.lines[index] * 10} y2={6 + stage.lines[index] * 10} stroke={color} strokeWidth="2" strokeLinecap="round" />)}</Box>
        </Stack>
        <Typography fontSize={13} fontWeight={600}>{stage.label}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10.5 }}>{stage.order}</Typography>
      </ButtonBase>;
    })}
  </Box>;
}
