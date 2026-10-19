import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Chip, LinearProgress, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import * as api from '../../api/unifiedAnalysisApi';

const STATES = { DISABLED: '사후 검증 비활성화', NOT_CREATED: '사후 검증 미등록', PENDING: '평가 대기', WORKING: '평가 중', WAITING_DATA: '후속 거래일 자료 대기', RETRY_WAIT: '평가 재시도 대기', COMPLETE: '20거래일 평가 완료', DATA_INCOMPLETE: '평가 기한 종료 · 자료 미확인', FAILED: '평가 실패' };
const TRADES = { WATCH_ONLY: '관찰만', PENDING: '진입일 대기', DATA_GAP: '경로 미확인', NO_ENTRY_GAP: '진입 구간 밖 · 미진입', NO_ENTRY_UNCERTAIN_FILL: '체결 불확실 · 미진입', CLOSED: '청산', OPEN: '미청산', OPEN_UNLIQUIDATED: '기간 종료 · 청산 미확인' };
const QUALITY = { PENDING: '기간 미도래', MISSING: '자료 대기', PRICE_BASIS_CHANGED: '가격 기준 변경', INVALID_SOURCE: '자료 부적합', IDENTITY_MISMATCH: '종목 불일치' };
const STRATEGIES = { BREAKOUT: '돌파', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '돌파 재지지', TRANSITION_6_TO_1: '6→1 초기 전환' };
const pct = value => value == null ? '미확인' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`;
const value = number => number == null ? '미확인' : Number(number).toLocaleString('ko-KR', { maximumFractionDigits: 2 });

export default function ReportPerformancePanel({ runId }) {
  const [state, setState] = useState({ loading: true });
  const [refresh, setRefresh] = useState(0);
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    generation.current += 1;
    const controller = new AbortController(); let timer;
    setState({ loading: true });
    const load = async () => {
      try {
        const data = await api.getReportPerformance(runId, controller.signal);
        if (controller.signal.aborted) return;
        setState({ data });
        if (['PENDING', 'WORKING', 'WAITING_DATA', 'RETRY_WAIT'].includes(data?.state)) timer = setTimeout(load, 30000);
      } catch (error) { if (!controller.signal.aborted) setState({ error: error.message }); }
    };
    load(); return () => { generation.current += 1; controller.abort(); clearTimeout(timer); };
  }, [runId, refresh]);
  const request = async () => {
    if (busy) return;
    setBusy(true);
    const current = generation.current;
    try { await api.requestReportPerformance(runId); if (current === generation.current) setRefresh(n => n + 1); }
    catch (error) { if (current === generation.current) setState({ error: error.message }); }
    finally { if (current === generation.current) setBusy(false); }
  };
  const result = state.data?.result;
  const stats = result?.metrics;
  const horizons = result?.policy?.version === 'forward-evaluation-v2' ? [1, 3, 5, 10, 20] : [5, 10, 20];
  const quality = state => QUALITY[state] || '미확인';
  return <Stack gap={2}>
    {state.loading && <LinearProgress aria-label="사후 검증 조회 중" />}
    {state.error && <Alert severity="error">{state.error}</Alert>}
    {state.data && <Chip label={STATES[state.data.state] || state.data.state} sx={{ alignSelf: 'flex-start' }} />}
    {state.data?.state === 'DISABLED' && <Alert severity="info">비용을 반영한 모의매매 성과 계산은 비활성화되어 있습니다. 선정 종목의 목표·손절 추적은 위 시나리오 추적에서 별도로 확인할 수 있습니다.</Alert>}
    {state.data?.state === 'NOT_CREATED' && <Button disabled={busy} onClick={request}>이 보고서의 사후 검증 등록</Button>}
    {state.data?.state !== 'DISABLED' && <Button onClick={() => setRefresh(n => n + 1)} sx={{ alignSelf: 'flex-start' }}>평가 새로고침</Button>}
    {['FAILED', 'DATA_INCOMPLETE'].includes(state.data?.state) && <Alert severity="warning">확인하지 못한 성과가 있습니다. 누락을 수익 0%나 정상 완료로 해석하지 마세요.</Alert>}
    {result && <>
      <Alert severity="info">실제 매매 성과가 아닌 일봉 기반 모의 검증입니다. 표본 승률은 미래 승률을 뜻하지 않습니다.</Alert>
      <Typography variant="body2">{result.captureMode === 'FORWARD_CAPTURE' ? '진입일 전에 평가 조건 고정' : '과거 보고서의 사후 등록 · 독립 검증 아님'} · 평가 대상 기준일 {result.throughDate || '대기'} · 기록 {state.data.revision}회</Typography>
      <Typography variant="body2">모의 진입 {stats.entered}/{stats.eligible} · 청산 {stats.closed} (이익 {stats.wins}, 손실 {stats.losses}, 손익 없음 {stats.flat}) · 미청산 {stats.open} · 미확인 {stats.unresolved} · 미진입 {stats.noEntry}</Typography>
      <Typography variant="body2">청산 표본 승률 {pct(stats.winRatePercent)} · 진입률 {pct(stats.fillRatePercent)} · 청산 평균 순수익률 {pct(stats.meanClosedReturnPercent)}</Typography>
      <Typography variant="body2">평균 이익 {pct(stats.meanWinPercent)} · 평균 손실 {pct(stats.meanLossPercent)} · 손익 합계 비율 {value(stats.profitFactor)} · 연속 손실 청산일 {stats.maxConsecutiveLosingExitDates}일</Typography>
      <Typography variant="body2">이 보고서에 균등 배분한 가상 자금: 평가수익률 {pct(stats.cohortReturnPercent)} · 종가 기준 최대 낙폭 {pct(stats.cohortMaxDrawdownPercent)}. 미청산 평가손익을 포함하며 전체 계좌 성과가 아닙니다.</Typography>
      <Typography variant="body2">왕복 수수료·세금 가정 {value(result.policy.roundTripFeeBps)}bp + 매수·매도 각각 체결 차이 {value(result.policy.slippageBps)}bp · 최대 {result.policy.holdingDays}거래일 · 중립 구간 ±{value(result.policy.neutralBandPercent)}%</Typography>
      <Typography variant="body2">선정 기준 {result.reportVersion} · 평가 기준 {result.policy.version}</Typography>
      <Typography variant="subtitle2">후보별 가격 변화와 모의매매</Typography>
      <div style={{ overflowX: 'auto' }}><Table size="small" aria-label="후보 사후 성과"><TableHead><TableRow>
        {['종목', ...horizons.map(days => `${days}거래일 성과`), '모의매매 상태', '진입 / 청산', '청산 순수익률', '미청산 포함 평가'].map(label => <TableCell key={label}>{label}</TableCell>)}
      </TableRow></TableHead><TableBody>{result.stocks.map(stock => <TableRow key={stock.code}>
        <TableCell>{stock.name} ({stock.code})<br />{stock.disposition === 'ENTRY_CONDITIONAL' ? '조건부 진입' : '관찰'} · {STRATEGIES[stock.strategy] || stock.strategy}</TableCell>
        {horizons.map(days => {
          const h = stock.horizons.find(item => item.days === days);
          return <TableCell key={days} sx={{ minWidth: 155 }}>
            {h ? <Stack gap={0.5}>
              <Typography variant="body2">종목 {h.state === 'VALID' ? pct(h.priceReturnPercent) : quality(h.state)}</Typography>
              {h.marketState != null && <>
                <Typography variant="caption">시장 {h.marketState === 'VALID' ? pct(h.marketReturnPercent) : quality(h.marketState)}</Typography>
                <Typography variant="caption">초과 {h.excessReturnPercent == null ? '미확인' : value(h.excessReturnPercent) + '%p'}</Typography>
                <Typography variant="caption">최대 상승 {h.pathState === 'VALID' ? pct(h.maximumRisePercent) : quality(h.pathState)}</Typography>
                <Typography variant="caption">최대 하락 {h.pathState === 'VALID' ? pct(h.maximumFallPercent) : quality(h.pathState)}</Typography>
              </>}
            </Stack> : '미확인'}
          </TableCell>;
        })}
        <TableCell>{TRADES[stock.trade.state] || stock.trade.state}{stock.trade.ambiguousBar ? ' · 같은 봉 목표/손절, 손절 우선' : ''}</TableCell>
        <TableCell>{stock.trade.entryDate ? `${stock.trade.entryDate} · ${value(stock.trade.entryPrice)}원` : '—'}<br />{stock.trade.exitDate ? `${stock.trade.exitDate} · ${value(stock.trade.exitPrice)}원` : '—'}</TableCell>
        <TableCell>{pct(stock.trade.netReturnPercent)}</TableCell><TableCell>{pct(stock.trade.markedReturnPercent)}</TableCell>
      </TableRow>)}</TableBody></Table></div>
      <Typography variant="caption">기간은 거래일 기준이며 선정일 종가 대비 가격 변화입니다. 최대 상승·하락은 기간 중 고가·저가 기준(상승은 0 이상, 하락은 0 이하)이며 고점 대비 낙폭이나 실제 매매 수익률이 아닙니다. 관찰 대상도 추적합니다.</Typography>
      <Typography variant="subtitle2">시장 전망 방향 평가</Typography>
      {result.forecasts.map(f => <Typography key={f.market} variant="body2">{f.market} · {f.date} · 판단 {f.predicted} → 관측 {f.actual || '미확인'} ({pct(f.returnPercent)}) · {f.matched == null ? '평가 대기·미확인' : f.matched ? '방향 일치' : '방향 불일치'}</Typography>)}
      <Typography variant="subtitle2">전략별 표본</Typography>
      {Object.entries(result.byStrategy).map(([strategy, m]) => <Typography key={strategy} variant="body2">{STRATEGIES[strategy] || strategy} · 후보 {m.candidates} · 청산 {m.closed} · 미청산 {m.open} · 미확인 {m.unresolved} · 청산 승률 {pct(m.winRatePercent)} · 평균 순수익 {pct(m.meanClosedReturnPercent)}</Typography>)}
      {result.limitations.map((text, i) => <Typography key={i} variant="caption" color="text.secondary">{text}</Typography>)}
    </>}
  </Stack>;
}
