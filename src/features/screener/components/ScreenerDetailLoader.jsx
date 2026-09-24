import { useEffect, useState } from 'react';
import { Alert, Button, Drawer, Stack, Typography } from '@mui/material';
import { getScreenerItem } from '../../../api/screenerApi';
import { adaptScreenerItem } from '../screenerAdapter';
import ScreenerDetailDrawer from './ScreenerDetailDrawer';

// Parent keys this component by run ID + stock code, so detail state cannot leak between rows.
export default function ScreenerDetailLoader({ row, runId, onClose, ...props }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const stockCode = row.stockCode;
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    getScreenerItem(runId, stockCode, controller.signal).then((item) => {
      if (item.stockCode !== stockCode || item.runId !== runId) throw new Error('요청한 종목 상세와 다릅니다.');
      if (active) setDetail(adaptScreenerItem(item));
    }).catch((e) => { if (active) setError(e.message || '상세를 불러오지 못했습니다.'); });
    return () => { active = false; controller.abort(); };
  }, [runId, stockCode, attempt]);
  if (detail) return <ScreenerDetailDrawer {...props} row={detail} onClose={onClose} />;
  return <Drawer anchor="right" open onClose={onClose} slotProps={{ paper: { role: 'dialog', 'aria-label': `${row.stockName} 상세`, sx: { width: { xs: '100%', sm: 720 }, maxWidth: '100%', boxSizing: 'border-box', p: 3 } } }}>
    <Stack gap={2}><Typography variant="h2">{row.stockName}</Typography>
      {error ? <><Alert severity="error">{error}</Alert><Button onClick={() => { setError(''); setAttempt((value) => value + 1); }}>상세 다시 조회</Button></> : <Typography role="status">종목 상세를 불러오는 중입니다.</Typography>}
      <Button onClick={onClose}>상세 닫기</Button>
    </Stack>
  </Drawer>;
}
