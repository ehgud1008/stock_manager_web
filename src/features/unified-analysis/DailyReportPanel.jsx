import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button, Chip, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useEffect, useRef, useState } from 'react';
import SectionCard from '../../components/common/SectionCard';
import * as api from '../../api/unifiedAnalysisApi';
import NewEntrySummary from '../stock-analysis/components/NewEntrySummary';
import TargetBasisNotice from '../stock-analysis/components/TargetBasisNotice';
import { entryReasonForDisplay } from '../stock-analysis/scenarioPresentation';


const STATES = { DISABLED: '보고서 기능 비활성화', NOT_CREATED: '보고서 미생성', PENDING: '보고서 대기', WORKING: '보고서 작성 중', WAITING_SCAN: '전체 분석 완료 대기', RETRY_WAIT: '자료 확인 재시도', READY: '보고서 완료', FAILED: '보고서 실패' };
const DELIVERY = { DISABLED: '알림 비활성화', PENDING: '발송 대기', SENDING: '발송 중', SENT: '발송 완료', RETRY_WAIT: '발송 재시도 대기', UNKNOWN: '전송 여부 확인 필요 · 자동 재전송 중지', FAILED: '발송 실패', EXPIRED: '발송 기한 만료' };
const ROLES = { SELECTION: '선정 조건', SUPPORT: '보강 근거', GATE: '제외 조건 확인', RISK: '위험 참고' };
const format = value => value == null ? '미확인' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const time = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : '—';
export default function DailyReportPanel({ runId, onDetail, onLoaded }) {
  const [state, setState] = useState({ loading: true });
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);

  const alive = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController(); let timer;
    setState({ loading: true });
    const load = async () => {
      try {
        const data = await api.getDailyReport(runId, controller.signal);
        if (controller.signal.aborted) return;
        setState({ data }); onLoaded?.(runId, data);
        if (['PENDING', 'WORKING', 'WAITING_SCAN', 'RETRY_WAIT', 'NOT_CREATED'].includes(data?.state)
          || ['PENDING', 'SENDING', 'RETRY_WAIT'].includes(data?.notificationState)) timer = setTimeout(load, 5000);
      } catch (e) { if (!controller.signal.aborted) setState({ error: e.message }); }
    };
    load(); return () => { controller.abort(); clearTimeout(timer); };
  }, [runId, refresh, onLoaded]);
  const request = async () => {
    if (busy) return;
    setBusy(true);
    try { await api.requestDailyReport(runId); if (alive.current) setRefresh(n => n + 1); }
    catch (e) { if (alive.current) setState({ error: e.message }); }
    finally { if (alive.current) setBusy(false); }
  };
  const report = state.data?.report;
  const profitability = report?.version?.startsWith('candidate-v7-profitability/');
  return <SectionCard title="장 마감 보고서" caption="시장 평가와 다음 거래일 조건부 전망, 종목 선정 근거를 저장해 보여줍니다.">
    <Stack gap={2}>
      {state.loading && <LinearProgress aria-label="보고서 조회 중" />}
      {state.error && <Alert severity="error" action={<Button onClick={() => setRefresh(n => n + 1)}>다시 조회</Button>}>{state.error}</Alert>}
      {state.data && <Stack direction="row" gap={1} flexWrap="wrap"><Chip label={STATES[state.data.state] || state.data.state} size="small" />
        {state.data.notificationState && <Chip label={DELIVERY[state.data.notificationState] || state.data.notificationState} size="small" variant="outlined" />}</Stack>}
      {state.data?.state === 'NOT_CREATED' && <Button disabled={busy} onClick={request} sx={{ alignSelf: 'flex-start' }}>이 실행의 보고서 생성</Button>}
      {state.data?.state === 'FAILED' && <Alert severity="warning">오늘 종합분석 작업에 실패했습니다. 필수 자료와 실행 상태를 확인하세요.</Alert>}
      {report?.status === 'READY' && <>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5}>
          {report.markets.map(market => <Box key={market.market} sx={{ flex: 1, p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,.025)', border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" gap={1} alignItems="center"><Typography fontWeight={650}>{market.market}</Typography><Chip size="small" label={market.bias} variant="outlined" /></Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 650, mt: 1, fontVariantNumeric: 'tabular-nums' }}>{format(market.dayReturn)}<Typography component="span" color="text.secondary" sx={{ fontSize: 14, ml: 0.5 }}>% · 당일</Typography></Typography>
            <Typography variant="body2" color="text.secondary">상승 종목 {format(market.advancingPercent)}% · EMA20 위 {format(market.aboveEma20Percent)}%</Typography>
          </Box>)}
        </Stack>
        <Alert severity="info">검증 전 규칙 기반 후보입니다. 상승 확률·승률을 뜻하지 않으며, 다음 거래일 진입 조건을 다시 확인해야 합니다.</Alert>
        <Typography variant="body2">거래일 {report.tradeDate} · 다음 거래일 {report.forecastDate}<br />정보 확인 {time(report.informationAsOf)} · 보고서 저장 {time(report.finalizedAt)}</Typography>
        <Accordion disableGutters elevation={0}><AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="body2">시장 전망·판정 근거</Typography></AccordionSummary><AccordionDetails><Stack gap={2}>
        {report.markets.map(market => <Stack key={market.market} gap={0.5}>
          <Typography variant="h6">{market.market} · {market.bias}</Typography>
          <Typography variant="body2">당일 {format(market.dayReturn)}% · 20봉 {format(market.return20)}% · 분석 표본의 상승 비율 {format(market.advancingPercent)}% · EMA20 위 {format(market.aboveEma20Percent)}%</Typography>
          <Typography variant="body2">{market.baseScenario}</Typography>
          <Typography variant="body2">상방: {market.upsideScenario}</Typography>
          <Typography variant="body2">하방: {market.downsideScenario}</Typography>
          {market.cautions.map((warning, i) => <Typography variant="caption" color="text.secondary" key={i}>{warning}</Typography>)}
        </Stack>)}
        </Stack></AccordionDetails></Accordion>
        {report.tierLists && <Typography variant="h6">{profitability ? 'A등급·조건부 B등급 운영 선정' : 'A등급 운영 선정'}</Typography>}
        {profitability && <Typography variant="body2">눌림 회복·돌파 재지지·6→1 전환 후보를 우선 표시합니다. B등급도 비용 차감 후 손익비와 거래대금 조건을 통과해야 선정됩니다.</Typography>}
        <Typography variant="subtitle1">조건부 진입 {report.candidates.filter(stock => stock.disposition === 'ENTRY_CONDITIONAL').length}종목 · 관찰 {report.candidates.filter(stock => stock.disposition === 'WATCH').length}종목</Typography>
        {!!report.candidates.length && !report.candidates.some(stock => stock.disposition === 'ENTRY_CONDITIONAL') && <Alert severity="warning">오늘은 진입 조건을 충족한 종목이 없습니다. 아래는 관찰 대상입니다.</Alert>}
        {!report.candidates.length && <Alert severity="info">{report.tierLists?.activeSignalsTotal > 0 ? '운영 선정 조건을 모두 충족한 종목은 없습니다. 유효 매수 신호와 보류 사유를 아래에서 확인하세요.' : '오늘은 조건을 충족한 종목이 없습니다'}</Alert>}
        {report.candidates.map(stock => <Accordion key={stock.code} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}><Stack gap={0.5}><Typography fontWeight={650}>{stock.name} ({stock.code}) · {stock.disposition === 'WATCH' ? '관찰 대상' : '조건부 진입 검토'}</Typography>
            <Typography variant="caption">시장 대비 20봉 강도 {format(stock.relativeReturn20)}%p · 비용 가정 반영 손익비 {format(stock.netRewardRisk)}배</Typography></Stack></AccordionSummary>
          <AccordionDetails><Stack gap={1.5}>
            {stock.cautions.map((text, i) => <Typography variant="body2" key={i}>{entryReasonForDisplay(text, stock.newEntry)}</Typography>)}
            <NewEntrySummary assessment={stock.newEntry} netRewardRisk={stock.netRewardRisk} minimumNetRewardRisk={stock.evidence.find(e => e.code === 'NET_REWARD_RISK')?.threshold} />
            {!stock.newEntry?.effectiveScenario && <TargetBasisNotice scenario={stock.scenario} />}
            {stock.scenario && <Typography variant="body2">참고 가격: 진입 {format(stock.scenario.entryFrom)}~{format(stock.scenario.entryTo)}원 · 첫 목표 {format(stock.scenario.targets?.[0])}원 · 손절 기준 {format(stock.scenario.stopLoss)}원. 관찰 대상은 가격 구간만으로 진입 조건 충족을 뜻하지 않습니다.</Typography>}
            <Typography variant="body2">진입 구간 이탈·손절 기준 훼손·새 매도 신호 발생 시 재검토합니다. 소폭 갭상승도 허용 진입 구간 안에서만 검토하며, 진입 상단을 넘으면 진입하지 않습니다.</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'block', sm: 'none' } }}>선정 근거 표는 좌우로 밀어서 확인할 수 있습니다.</Typography>
            <div style={{ overflowX: 'auto' }}><Table size="small" sx={{ minWidth: 640 }} aria-label={`${stock.name} 선정 근거`}><TableHead><TableRow>
              {['항목', '관측값', '판정', '역할', '비교 기준'].map(label => <TableCell key={label}>{label}</TableCell>)}
            </TableRow></TableHead><TableBody>{stock.evidence.map(e => <TableRow key={e.code}>
              <TableCell>{e.label}</TableCell><TableCell>{format(e.value)} {e.value == null ? '' : e.unit}</TableCell>
              <TableCell>{e.passed == null ? '참고·미확인' : e.passed ? '충족' : '미충족'}</TableCell><TableCell>{ROLES[e.role] || e.role}</TableCell><TableCell>{e.comparison}</TableCell>
            </TableRow>)}</TableBody></Table></div>
            <Button onClick={() => onDetail(stock)} sx={{ alignSelf: 'flex-start' }}>저장된 종목 분석 보기</Button>
          </Stack></AccordionDetails>
        </Accordion>)}
        {report.tierLists && <>
          <Alert severity="info">A ≥80 · B 70~80 미만 · C 65~70 미만 · D 65 미만 · 미산정은 자료 확인 대상입니다. 유효 신호 목록은 운영 선정 종목과 중복될 수 있습니다. 비교 후보와 신호 대기는 운영 선정 건수에 포함하지 않습니다.</Alert>
          {[...(report.tierLists.activeSignals ? [['A/B등급 유효 매수 신호', report.tierLists.activeSignals, report.tierLists.activeSignalsTotal]] : []), ['B등급 비교 후보', report.tierLists.comparisonB, report.tierLists.comparisonBTotal], ['A/B등급 신호 대기', report.tierLists.signalWaiting, report.tierLists.signalWaitingTotal]].map(([label, stocks, total]) => <Stack key={label} gap={1}>
            <Typography variant="h6">{label} {total}종목 · 표시 {stocks.length}종목</Typography>
            <Typography variant="caption">점수 내림차순·거래대금·종목 코드 순으로 표시합니다. 매수 추천 목록이 아닙니다.</Typography>
            {!stocks.length && <Typography variant="body2">해당 종목 없음</Typography>}
            {stocks.map(stock => <Accordion key={stock.code} disableGutters><AccordionSummary expandIcon={<ExpandMoreIcon />}>{stock.name} ({stock.code}) · {stock.newEntry?.suitability?.tier}등급 · {format(stock.newEntry?.suitability?.score)}점</AccordionSummary><AccordionDetails><Stack gap={1}>
              <Typography variant="body2">{stock.disposition === 'ENTRY_CONDITIONAL' ? '운영 선정' : stock.newEntry?.timing?.status === 'DEFER' ? '자료 확인 필요' : stock.disposition === 'RESEARCH_B' ? 'B등급 비교 대상' : '추가 선정 조건 확인 필요'}</Typography>
              <NewEntrySummary assessment={stock.newEntry} netRewardRisk={stock.netRewardRisk} minimumNetRewardRisk={stock.evidence?.find(e => e.code === 'NET_REWARD_RISK')?.threshold} />
              {stock.cautions.map((text, i) => <Typography key={i} variant="body2">{entryReasonForDisplay(text, stock.newEntry)}</Typography>)}
              <Typography variant="body2">비용 가정 반영 손익비 {format(stock.netRewardRisk)}배</Typography>
              <Button onClick={() => onDetail(stock)}>저장된 종목 분석 보기</Button>
            </Stack></AccordionDetails></Accordion>)}
          </Stack>)}
        </>}
        <Accordion disableGutters><AccordionSummary expandIcon={<ExpandMoreIcon />}>분석 범위와 확인하지 못한 정보</AccordionSummary><AccordionDetails><Stack gap={1}>
          <Typography variant="body2">유효 분석 {report.assessedStocks} / 대상 {report.eligibleStocks}종목 · {report.version}</Typography>
          {report.limitations.map((text, i) => <Typography variant="body2" key={i}>{text}</Typography>)}
        </Stack></AccordionDetails></Accordion>

      </>}
    </Stack>
  </SectionCard>;
}
