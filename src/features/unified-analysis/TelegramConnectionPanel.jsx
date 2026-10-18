import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Link, Stack, Typography } from '@mui/material';
import { checkTelegramConnection } from '../../api/portfolioApi';

export default function TelegramConnectionPanel({ enabled }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(null);
  useEffect(() => () => { pending.current?.abort(); }, []);
  const check = async () => {
    if (pending.current || !enabled) return;
    const controller = new AbortController(); pending.current = controller;
    setBusy(true); setError(''); setResult(null);
    try {
      const response = await checkTelegramConnection(controller.signal);
      if (!controller.signal.aborted) setResult(response);
    } catch (e) { if (!controller.signal.aborted) setError(e.message); }
    finally { if (!controller.signal.aborted) { pending.current = null; setBusy(false); } }
  };
  return <Stack gap={1}>
    <Typography variant="h6">텔레그램 알림봇 연결</Typography>
    <Typography variant="body2">1. <Link href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">BotFather</Link>에서 봇을 만들고, 만든 봇과의 개인 대화에서 /start를 보내세요.</Typography>
    <Typography variant="body2">2. 발급된 토큰과 수신 대화방 ID를 서버 설정에 등록하세요. 토큰은 이 화면에 입력하지 않습니다.</Typography>
    <Typography variant="body2">3. 인증·대화방 확인 후 아래 연결 테스트로 실제 수신을 확인하세요. 자동 알림은 장 마감 분석과 보고서 작성이 끝난 뒤 발송됩니다.</Typography>
    {!enabled && <Alert severity="info">서버의 운영 확인 기능을 켜면 연결 확인을 사용할 수 있습니다.</Alert>}
    <Button disabled={!enabled || busy} onClick={check} sx={{ alignSelf: 'flex-start' }}>{busy ? '연결 확인 중' : '봇 인증·대화방 확인'}</Button>
    <Typography variant="caption">이 확인은 메시지를 보내거나 자동 발송 설정을 변경하지 않습니다.</Typography>
    {error && <Alert severity="error">{error}</Alert>}
    {result && <Alert severity={result.state === 'VERIFIED' ? 'success' : 'warning'}>
      {result.message}{result.botUsername ? ' · @' + result.botUsername : ''}
      <br />자동 알림 {result.automaticDeliveryEnabled ? '켜짐' : '꺼짐'}
    </Alert>}
  </Stack>;
}
