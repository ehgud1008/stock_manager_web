import { useEffect, useState } from 'react';
import { Alert, Button, LinearProgress, Stack, Typography } from '@mui/material';
import ScenarioMonitoringTable from './ScenarioMonitoringTable';
import * as api from '../../api/unifiedAnalysisApi';

const time = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : '미확인';

export default function ScenarioMonitoringPanel({ runId, onDetail }) {
  const [state, setState] = useState({ loading: true });
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); let timer;
    setState({ loading: true });
    const load = async () => {
      try {
        const data = await api.getScenarioMonitoring(runId, controller.signal);
        if (controller.signal.aborted) return;
        setState({ data });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState(old => ({ ...old, loading: false, error: error.message }));
      }
      if (!controller.signal.aborted) timer = setTimeout(load, 60000);
    };
    load();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [runId, refresh]);
  const data = state.data;
  return <Stack gap={2}>
    <Alert severity="info">선정 당시 진입 구간·1차 목표·손절을 고정하고 이후 20거래일의 마감 일봉으로 추적합니다. 실시간 시세나 실제 보유·체결 상태가 아닙니다. 화면을 닫아도 매일 저장되는 마감 분석 자료로 이후 경로를 확인할 수 있습니다.</Alert>
    <Button onClick={() => setRefresh(n => n + 1)} sx={{ alignSelf: 'flex-start' }}>시나리오 추적 새로고침</Button>
    {state.loading && <LinearProgress aria-label="선정 종목 추적 조회 중" />}
    {state.error && <Alert severity="error">시나리오 추적 자료를 조회하지 못했습니다. {state.error}{data ? ' 이전 조회 내용을 표시합니다.' : ''}</Alert>}
    {data?.state === 'WAITING_REPORT' && <Alert severity="info">확정된 선정 보고서가 준비되면 종목과 원래 목표·손절을 표시합니다.</Alert>}
    {data?.state === 'READY' && <>
      <Typography variant="body2">선정 기준일 {data.selectionDate} · 추적 {data.firstTrackingDate || '달력 확인 필요'} ~ {data.lastTrackingDate || '달력 확인 필요'} · 조회 {time(data.checkedAt)}</Typography>
      {data.stocks.length === 0 && <Alert severity="info">이 보고서에 선정된 종목이 없습니다.</Alert>}
      {data.stocks.length > 0 && <ScenarioMonitoringTable rows={data.stocks.map(stock => ({ runId, selectionDate: data.selectionDate, code: stock.code, name: stock.name, stock }))} onDetail={onDetail ? row => onDetail(row.stock) : undefined} />}
      {data.notes.map((note, index) => <Typography key={index} variant="caption" color="text.secondary">{note}</Typography>)}
    </>}
  </Stack>;
}
