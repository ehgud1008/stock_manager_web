import { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Button, Chip, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import * as api from '../../api/unifiedAnalysisApi';

const STATES = { WAITING_ENTRY_DAY: '다음 거래일 진입 확인 대기', IN_PROGRESS: '시나리오 진행 중', TARGET_REACHED: '1차 목표 도달', STOP_REACHED: '손절 기준 도달', AMBIGUOUS: '목표·손절 동시 접촉 · 순서 미확인', NO_ENTRY: '진입 조건 미충족', WATCH_ONLY: '관찰 대상 · 진입 가정 없음', PERIOD_ENDED: '20거래일 추적 종료', WAITING_DATA: '마감 자료 대기', DATA_GAP: '경로 미확인', NO_SCENARIO: '저장된 가격 시나리오 없음', BASELINE_MISSING: '선정일 원본 확인 필요', CALENDAR_UNAVAILABLE: '거래일 달력 확인 필요', REPORT_LATE: '장 시작 전 확정 여부 확인 필요' };
const DATA = { NOT_DUE: '후속 거래일 대기', CURRENT: '확보한 일봉 확인 완료', WAITING_DATA: '당일 마감 자료 대기', DATA_GAP: '누락·부적합 자료 확인 필요' };
const QUALITY = { MISSING: '자료 대기', PRICE_BASIS_CHANGED: '수정주가 기준 변경', INVALID_SOURCE: '자료 부적합', IDENTITY_MISMATCH: '종목 불일치' };
const number = value => value == null ? '미확인' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const price = value => value == null ? '미확인' : `${number(value)}원`;
const pct = value => value == null ? '미확인' : `${number(value)}%`;
const time = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : '미확인';
const color = state => state === 'TARGET_REACHED' ? 'success' : ['STOP_REACHED', 'AMBIGUOUS', 'DATA_GAP'].includes(state) ? 'warning' : 'default';
const touch = (day, field) => !day.candle || day.candle.volume <= 0 || day.candle.high <= day.candle.low ? '미확인' : day[field] ? '접촉' : '미접촉';

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
      {data.stocks.length > 0 && <div style={{ overflowX: 'auto' }}><Table size="small" aria-label="선정 종목 시나리오 추적"><TableHead><TableRow>
        {['종목', '고정 진입 구간', '고정 1차 목표 / 손절', '최근 확인 일봉', '시나리오 상태', '종가 기준 거리'].map(label => <TableCell key={label}>{label}</TableCell>)}
      </TableRow></TableHead><TableBody>{data.stocks.map(stock => <TableRow key={stock.code}>
        <TableCell sx={{ minWidth: 150 }}>{onDetail ? <Button onClick={() => onDetail(stock)}>{stock.name}</Button> : stock.name}<br />{stock.code} · {stock.disposition === 'ENTRY_CONDITIONAL' ? '조건부 진입' : '관찰'}<br />선정일 종가 {price(stock.selectionClose)}</TableCell>
        <TableCell sx={{ minWidth: 155 }}>{stock.scenario ? `${price(stock.scenario.entryFrom)} ~ ${price(stock.scenario.entryTo)}` : '시나리오 없음'}</TableCell>
        <TableCell sx={{ minWidth: 160 }}>목표 {price(stock.scenario?.targets?.[0])}<br />손절 {price(stock.scenario?.stopLoss)}</TableCell>
        <TableCell sx={{ minWidth: 150 }}>{stock.latestPriceDate || '후속 일봉 대기'}<br />{price(stock.latestClose)}<br />선정일 대비 {pct(stock.selectionReturnPercent)}<br />확인 {stock.observedDays}/{stock.expectedDays}거래일</TableCell>
        <TableCell sx={{ minWidth: 210 }}><Chip size="small" color={color(stock.status)} label={STATES[stock.status] || stock.status} /><Typography variant="caption" display="block" mt={1}>{DATA[stock.dataState] || stock.dataState}</Typography>{stock.entryDate && <Typography variant="caption" display="block">모의 진입 조건 확인 {stock.entryDate}</Typography>}{stock.eventDate && <Typography variant="caption" display="block">판정일 {stock.eventDate}</Typography>}</TableCell>
        <TableCell sx={{ minWidth: 150 }}>1차 목표까지 {pct(stock.targetDistancePercent)}<br />손절까지 여유 {pct(stock.stopDistancePercent)}<Typography variant="caption" display="block">최근 확인 종가 대비 · 음수는 기준 통과</Typography></TableCell>
      </TableRow>)}</TableBody></Table></div>}
      {data.stocks.map(stock => <Accordion key={stock.code} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography>{stock.name} · 일별 관측과 판정 근거</Typography></AccordionSummary>
        <AccordionDetails><Stack gap={1.5}>
          {stock.notes.map((note, index) => <Typography variant="body2" key={index}>{note}</Typography>)}
          {stock.history.length === 0 ? <Typography>후속 거래일 자료가 아직 없습니다. 선정 종목과 고정 시나리오는 위 목록에서 확인할 수 있습니다.</Typography> : <div style={{ overflowX: 'auto' }}><Table size="small" aria-label={`${stock.name} 일별 관측`}><TableHead><TableRow>
            {['거래일', '시가 / 고가 / 저가 / 종가', '1차 목표 / 손절 접촉', '당시 상태와 근거', '자료 출처'].map(label => <TableCell key={label}>{label}</TableCell>)}
          </TableRow></TableHead><TableBody>{stock.history.map(day => <TableRow key={day.date}>
            <TableCell>{day.date}<br />{day.quality === 'VALID' ? '일봉 확인' : QUALITY[day.quality] || day.quality}</TableCell>
            <TableCell>{day.candle ? `${price(day.candle.open)} / ${price(day.candle.high)} / ${price(day.candle.low)} / ${price(day.candle.close)}` : '미확인'}</TableCell>
            <TableCell>목표 {stock.scenario ? touch(day, 'targetTouched') : '기준 없음'}<br />손절 {stock.scenario ? touch(day, 'stopTouched') : '기준 없음'}</TableCell>
            <TableCell>{STATES[day.status] || day.status}<br />{day.note}</TableCell>
            <TableCell>{time(day.collectedAt)}<br />{day.sourceRunId ? `저장 실행 ${day.sourceRunId}` : '저장 자료 대기'}</TableCell>
          </TableRow>)}</TableBody></Table></div>}
        </Stack></AccordionDetails>
      </Accordion>)}
      {data.notes.map((note, index) => <Typography key={index} variant="caption" color="text.secondary">{note}</Typography>)}
    </>}
  </Stack>;
}
