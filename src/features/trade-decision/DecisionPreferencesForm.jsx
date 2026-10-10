import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { preferencesValid, presets } from './decisionPreferences';

export default function DecisionPreferencesForm({ value, onChange, disabled }) {
  const update = (key, selected) => onChange({ ...value, [key]: selected });
  return <Stack gap={1.5}>
    <Typography fontWeight={700}>내 위험 성향과 대응 여건</Typography>
    <Stack direction="row" gap={1}>{[['aggressive', '공격적'], ['balanced', '균형적'], ['conservative', '보수적']].map(([key, label]) => <Button key={key} disabled={disabled} variant="outlined" onClick={() => onChange({ ...value, ...presets[key] })}>{label} 기본값</Button>)}</Stack>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>{[['aggressive', '공격적 비율'], ['balanced', '균형적 비율'], ['conservative', '보수적 비율']].map(([key, label]) => <TextField key={key} type="number" label={`${label} (%)`} value={value[key]} disabled={disabled} onChange={e => update(key, e.target.value === '' ? '' : Number(e.target.value))} inputProps={{ min: 0, max: 100, step: 1 }} />)}</Stack>
    {!preferencesValid(value) && <Alert severity="warning">성향 비율은 정수로 입력하고 합계가 100%가 되도록 맞춰주세요.</Alert>}
    <Typography variant="caption" color="text.secondary">비율은 시나리오의 강조 정도입니다. 자금 배분이나 성공 확률이 아니며, 공격적 성향도 매수를 보장하지 않습니다.</Typography>
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} flexWrap="wrap">
      {[
        ['monitoring', '확인 가능한 빈도', [['INTRADAY', '장중 수시 확인'], ['DAILY', '하루 한 번'], ['OCCASIONAL', '가끔 확인']]],
        ['entryPreference', '진입 선호', [['EARLY', '기회를 일찍 포착'], ['CONFIRMED', '확인 후 진입']]],
        ['volatilityTolerance', '가격 변동 수용', [['LOW', '낮은 변동 선호'], ['MODERATE', '보통'], ['HIGH', '큰 변동도 감수']]],
        ['lossResponse', '손실 대응', [['QUICK', '빠른 손절 선호'], ['STRUCTURAL', '근거 유지 시 기다림']]],
      ].map(([key, label, options]) => <TextField select key={key} label={label} value={value[key]} onChange={e => update(key, e.target.value)} disabled={disabled} sx={{ minWidth: 185 }}>{options.map(([id, text]) => <MenuItem key={id} value={id}>{text}</MenuItem>)}</TextField>)}
    </Stack>
  </Stack>;
}
