import { useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';

export default function ScreenerRunDialog({ open, mode, interval, busy, error, onClose, onStart }) {
  const [market, setMarket] = useState('ALL');
  const [codes, setCodes] = useState('');
  const stockCodes = [...new Set(codes.trim().split(/[\s,]+/).filter(Boolean))].sort();
  const invalid = stockCodes.length > 5000 || stockCodes.some((code) => !/^[0-9A-Z]{6}$/.test(code));
  return <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" aria-labelledby="run-dialog-title">
    <DialogTitle id="run-dialog-title">{mode === 'SWING' ? '스윙 일봉' : `단타 ${interval}분봉`} 엔진 실행</DialogTitle>
    <DialogContent><Stack gap={2} mt={1}>
      <Alert severity="info">실제 키움 API를 호출해 새 결과를 생성합니다. ST로 분류된 종목만 분석·저장하며 ETF 등 다른 분류·미분류 종목은 저장하지 않고 건너뜁니다. ST에는 우선주도 포함됩니다.</Alert>
      <TextField select label="분석 대상 시장" value={market} onChange={(event) => setMarket(event.target.value)} disabled={busy}>
        {[['ALL', '전체 시장'], ['KOSPI', 'KOSPI'], ['KOSDAQ', 'KOSDAQ']].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
      </TextField>
      <TextField label="종목 코드 (선택)" value={codes} onChange={(event) => setCodes(event.target.value.toUpperCase())} disabled={busy} placeholder="005930, 000660" helperText={invalid ? '6자리 종목 코드를 쉼표 또는 공백으로 구분해 주세요. 최대 5,000개입니다.' : '비워두면 선택한 시장의 전체 종목을 분석합니다.'} error={invalid} />
      <Typography variant="body2">실행 범위: {stockCodes.length ? `${stockCodes.length}개 지정 종목` : '선택 시장 전체 종목'}</Typography>
      {!stockCodes.length && <Alert severity="warning">전체 시장 수집은 오래 걸릴 수 있습니다. 첫 연동은 소수 종목으로 확인하는 것을 권장합니다.</Alert>}
      <Typography variant="caption" color="text.secondary">확정 봉만 사용합니다. 일봉은 다음 날 0시부터 반영되며, 분봉 결과는 실시간 시세가 아닌 실행 기준 스냅샷입니다.</Typography>
      {error && <Alert severity="error">{error}</Alert>}
    </Stack></DialogContent>
    <DialogActions><Button disabled={busy} onClick={onClose}>취소</Button><Button variant="contained" disabled={busy || invalid} onClick={() => onStart({ mode, interval, market, stockCodes })}>{busy ? '요청 중…' : '분석 시작'}</Button></DialogActions>
  </Dialog>;
}
