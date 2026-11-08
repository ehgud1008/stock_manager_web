import { useState } from 'react';
import { Alert, MenuItem, Stack, TextField, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import { parsePositionDraft } from '../parsePositionDraft';

export default function PositionContextForm({ onChange }) {
  const [draft, setDraft] = useState({ scope: 'UNKNOWN', openedAt: '', entryPrice: '', stopPrice: '', targets: '', stopPolicy: 'CLOSE' });
  const [error, setError] = useState('');
  const update = (field, value) => {
    const next = { ...draft, [field]: value }; setDraft(next);
    try { const position = parsePositionDraft(next); setError(''); onChange({ position, error: '' }); }
    catch (e) { setError(e.message); onChange({ position: null, error: e.message }); }
  };
  return <Stack gap={1.5} sx={{ mb: 2 }}>
    <Typography variant="caption">기본값은 내 보유종목에 등록한 잔고입니다. 직접 입력한 조건은 이번 분석에만 적용됩니다.</Typography>
    <Typography variant="subtitle2">선택: 이번 분석만 보유 조건 직접 입력</Typography>
    <TextField select label="보유 상태" value={draft.scope} onChange={e => update('scope', e.target.value)}>
      <MenuItem value="UNKNOWN">저장된 보유정보 사용</MenuItem><MenuItem value="NOT_HELD">미보유</MenuItem><MenuItem value="HELD">보유 · 직접 입력</MenuItem>
    </TextField>
    {draft.scope === 'HELD' && <>
      <Stack direction={{ xs: 'column', md: 'row' }} gap={1}>
        <TextField label="진입 시각 (한국시간)" type="datetime-local" value={draft.openedAt} onChange={e => update('openedAt', e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField label="매수가" type="number" value={draft.entryPrice} onChange={e => update('entryPrice', e.target.value)} />
        <TextField label="손절가 (선택)" type="number" value={draft.stopPrice} onChange={e => update('stopPrice', e.target.value)} />
      </Stack>
      <TextField label="목표가 (쉼표 구분, 선택)" value={draft.targets} onChange={e => update('targets', e.target.value)} />
      <TextField select label="손절 판정 정책" value={draft.stopPolicy} onChange={e => update('stopPolicy', e.target.value)}>
        <MenuItem value="CLOSE">완료 일봉 종가 기준</MenuItem><MenuItem value="TOUCH">일봉 저가 접촉 관측 기준</MenuItem>
      </TextField>
      <Typography variant="caption">진입 당일의 일봉 고가·저가로는 진입 이후 접촉인지 알 수 없어 제외합니다. 실시간 감시나 자동 매도 기능이 아닙니다.</Typography>
    </>}
    {error && <Alert severity="warning">{error}</Alert>}
  </Stack>;
}
PositionContextForm.propTypes = { onChange: PropTypes.func.isRequired };
