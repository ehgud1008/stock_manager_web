import { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Accordion, AccordionDetails, AccordionSummary, Alert, Button, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

const STATES = { WAITING_ENTRY_DAY: '다음 거래일 진입 확인 대기', IN_PROGRESS: '시나리오 진행 중', TARGET_REACHED: '1차 목표 도달', STOP_REACHED: '손절 기준 도달', AMBIGUOUS: '목표·손절 동시 접촉 · 순서 미확인', NO_ENTRY: '진입 조건 미충족', WATCH_ONLY: '관찰 대상 · 진입 가정 없음', PERIOD_ENDED: '20거래일 추적 종료', WAITING_DATA: '마감 자료 대기', DATA_GAP: '경로 미확인', NO_SCENARIO: '저장된 가격 시나리오 없음', BASELINE_MISSING: '선정일 원본 확인 필요', CALENDAR_UNAVAILABLE: '거래일 달력 확인 필요', REPORT_LATE: '장 시작 전 확정 여부 확인 필요' };
const DATA = { NOT_DUE: '후속 거래일 대기', CURRENT: '확보한 일봉 확인 완료', WAITING_DATA: '당일 마감 자료 대기', DATA_GAP: '누락·부적합 자료 확인 필요' };
const QUALITY = { MISSING: '자료 대기', PRICE_BASIS_CHANGED: '수정주가 기준 변경', INVALID_SOURCE: '자료 부적합', IDENTITY_MISMATCH: '종목 불일치' };
const number = value => value == null ? '미확인' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const price = value => value == null ? '미확인' : `${number(value)}원`;
const pct = value => value == null ? '미확인' : `${number(value)}%`;
const time = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : '미확인';
const color = state => state === 'TARGET_REACHED' ? 'success' : ['STOP_REACHED', 'AMBIGUOUS', 'DATA_GAP'].includes(state) ? 'warning' : 'default';
const touch = (day, field) => !day.candle || day.candle.volume <= 0 || day.candle.high <= day.candle.low ? '미확인' : day[field] ? '접촉' : '미접촉';

export default function ScenarioMonitoringTable({ rows, showSelection = false, onDetail, onReport, onRemove, deleted = false, busy = false }) {
  if (showSelection) return <CompactMonitoringTable rows={rows} onDetail={onDetail} onReport={onReport} onRemove={onRemove} deleted={deleted} busy={busy} />;
  return <Stack gap={1.5}>
    <div style={{ overflowX: 'auto' }}><Table size="small" aria-label={showSelection ? '전체 선정 종목 시나리오 추적' : '선정 종목 시나리오 추적'}><TableHead><TableRow>
      {[...(showSelection ? ['선정일 / 추적 기간'] : []), '종목', '고정 진입 구간', '고정 1차 목표 / 손절', '최근 확인 일봉', '시나리오 상태', '종가 기준 거리'].map(label => <TableCell key={label}>{label}</TableCell>)}
    </TableRow></TableHead><TableBody>{rows.map(row => {
      const stock = row.stock;
      return <TableRow key={`${row.runId}:${row.code}`}>
        {showSelection && <TableCell sx={{ minWidth: 180 }}><Typography fontWeight={600}>{row.selectionDate}</Typography><Typography variant="caption" display="block">{row.firstTrackingDate || '달력 확인 필요'} ~ {row.lastTrackingDate || '달력 확인 필요'}</Typography><Typography variant="caption" display="block">실행 {row.runId.slice(0, 8)}</Typography>{onReport && <Button size="small" onClick={() => onReport(row.runId)}>원본 보고서</Button>}</TableCell>}
        <TableCell sx={{ minWidth: 150 }}>{onDetail ? <Button onClick={() => onDetail(row)}>{stock?.name || row.name}</Button> : stock?.name || row.name}<br />{row.code}{stock && <> · {stock.disposition === 'ENTRY_CONDITIONAL' ? '조건부 진입' : '관찰'}<br />선정일 종가 {price(stock.selectionClose)}</>}</TableCell>
        {!stock ? <TableCell colSpan={5}><Alert severity="error">이 선정 이력의 추적 자료를 조회하지 못했습니다. 원본 보고서와 저장 자료를 확인하세요.</Alert></TableCell> : <>
          <TableCell sx={{ minWidth: 155 }}>{stock.scenario ? `${price(stock.scenario.entryFrom)} ~ ${price(stock.scenario.entryTo)}` : '시나리오 없음'}</TableCell>
          <TableCell sx={{ minWidth: 160 }}>목표 {price(stock.scenario?.targets?.[0])}<br />손절 {price(stock.scenario?.stopLoss)}</TableCell>
          <TableCell sx={{ minWidth: 150 }}>{stock.latestPriceDate || '후속 일봉 대기'}<br />{price(stock.latestClose)}<br />선정일 대비 {pct(stock.selectionReturnPercent)}<br />확인 {stock.observedDays}/{stock.expectedDays}거래일</TableCell>
          <TableCell sx={{ minWidth: 210 }}><Chip size="small" color={color(stock.status)} label={STATES[stock.status] || stock.status} /><Typography variant="caption" display="block" mt={1}>{DATA[stock.dataState] || stock.dataState}</Typography>{stock.entryDate && <Typography variant="caption" display="block">모의 진입 조건 확인 {stock.entryDate}</Typography>}{stock.eventDate && <Typography variant="caption" display="block">판정일 {stock.eventDate}</Typography>}</TableCell>
          <TableCell sx={{ minWidth: 150 }}>1차 목표까지 {pct(stock.targetDistancePercent)}<br />손절까지 여유 {pct(stock.stopDistancePercent)}<Typography variant="caption" display="block">최근 확인 종가 대비 · 음수는 기준 통과</Typography></TableCell>
        </>}
      </TableRow>;
    })}</TableBody></Table></div>
    {rows.filter(row => row.stock).map(row => {
      const stock = row.stock;
      return <Accordion key={`${row.runId}:${row.code}`} disableGutters>
        <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography>{stock.name}{showSelection ? ` · ${row.selectionDate} · ${row.runId.slice(0, 8)}` : ''} · 일별 관측과 판정 근거</Typography></AccordionSummary>
        <AccordionDetails><Stack gap={1.5}>
          <OutcomeDetails stock={stock} />
          {stock.notes.map((note, index) => <Typography variant="body2" key={index}>{note}</Typography>)}
          {stock.history.length === 0 ? <Typography>후속 거래일 자료가 아직 없습니다. 선정 종목과 고정 시나리오는 위 목록에서 확인할 수 있습니다.</Typography> : <div style={{ overflowX: 'auto' }}><Table size="small" aria-label={`${stock.name}${showSelection ? ` ${row.selectionDate} ${row.runId.slice(0, 8)}` : ''} 일별 관측`}><TableHead><TableRow>
            {['거래일', '시가 / 고가 / 저가 / 종가', '1차 목표 / 손절 접촉', '당시 상태와 근거', '자료 출처'].map(label => <TableCell key={label}>{label}</TableCell>)}
          </TableRow></TableHead><TableBody>{stock.history.map(day => <TableRow key={day.date}>
            <TableCell>{day.date}<br />{day.quality === 'VALID' ? '일봉 확인' : QUALITY[day.quality] || day.quality}</TableCell>
            <TableCell>{day.candle ? `${price(day.candle.open)} / ${price(day.candle.high)} / ${price(day.candle.low)} / ${price(day.candle.close)}` : '미확인'}</TableCell>
            <TableCell>목표 {stock.scenario ? touch(day, 'targetTouched') : '기준 없음'}<br />손절 {stock.scenario ? touch(day, 'stopTouched') : '기준 없음'}</TableCell>
            <TableCell>{STATES[day.status] || day.status}<br />{day.note}</TableCell>
            <TableCell>{time(day.collectedAt)}<br />{day.sourceRunId ? `저장 실행 ${day.sourceRunId}` : '저장 자료 대기'}</TableCell>
          </TableRow>)}</TableBody></Table></div>}
        </Stack></AccordionDetails>
      </Accordion>;
    })}
  </Stack>;
}

function OutcomeDetails({ stock }) {
  const result = stock.outcome;
  if (!result) return <Alert severity="info">이 응답에는 새 검증 요약이 없습니다. 서버 업데이트 후 새로고침하세요.</Alert>;
  return <Stack gap={1}>
    <Alert severity={result.result === 'AMBIGUOUS' ? 'warning' : 'info'}>{result.summary}</Alert>
    <Typography>모의 진입 {result.entryDate || '없음'} · {price(result.entryPrice)} / 모의 청산 {result.exitDate || '미확정'} · {price(result.exitPrice)}</Typography>
    <Typography>비용 차감 전 손익 {pct(result.grossReturnPercent)} · 비용 반영 모의 수익 {pct(result.netReturnPercent)} · 미청산 평가손익 {pct(result.markedReturnPercent)}</Typography>
    {result.conservativeReturnPercent != null && <Alert severity="warning">선후 순서를 확인할 수 없어 확정 손익이 아닙니다. 손절 우선 가정 모의 손익: {pct(result.conservativeReturnPercent)}</Alert>}
    <Typography variant="body2">확인된 모의 보유 {result.holdingDays}거래일 · 왕복 수수료·세금 {result.roundTripFeeBps}bp · 편도 체결 차이 {result.slippageBps}bp</Typography>
    <Typography variant="caption">{result.policyVersion} · 현재 비용 가정으로 조회한 모의 결과입니다. 실제 체결 및 별도 등록 평가의 고정 정책과 구분합니다.</Typography>
  </Stack>;
}

function CompactMonitoringTable({ rows, onDetail, onReport, onRemove, deleted, busy }) {
  const [selected, setSelected] = useState(null);
  const detail = selected && (rows.find(row => row.runId === selected.runId && row.code === selected.code) || selected);
  return <>
    <div style={{ overflowX: 'auto' }}><Table size="small" aria-label="전체 선정 종목 시나리오 추적"><TableHead><TableRow>
      {['선정일', '종목', '검증 결과', '모의 손익', '최근 확인', '관리'].map(label => <TableCell key={label}>{label}</TableCell>)}
    </TableRow></TableHead><TableBody>{rows.map(row => {
      const stock = row.stock; const outcome = stock?.outcome;
      const label = { TIME_PROFIT: '기간 종료 · 수익', TIME_LOSS: '기간 종료 · 손실', TIME_FLAT: '기간 종료 · 보합' }[outcome?.result] || STATES[stock?.status] || '자료 확인 필요';
      return <TableRow key={`${row.runId}:${row.code}`}>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{row.selectionDate}<Typography variant="caption" display="block">{row.runId.slice(0, 8)}</Typography></TableCell>
        <TableCell sx={{ minWidth: 140, maxWidth: 220 }}><Typography noWrap title={stock?.name || row.name}>{onDetail ? <Button onClick={() => onDetail(row)} sx={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stock?.name || row.name}</Button> : stock?.name || row.name}</Typography><Typography variant="caption">{row.code}</Typography></TableCell>
        <TableCell sx={{ maxWidth: 230 }}><Typography variant="body2">{label}</Typography>{!stock ? <Typography color="error">추적 자료를 조회하지 못했습니다</Typography> : <Typography variant="caption" display="block">{stock.eventDate || DATA[stock.dataState]}</Typography>}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{outcome?.netReturnPercent != null ? <>종료 {pct(outcome.netReturnPercent)}</> : outcome?.markedReturnPercent != null ? <>평가 {pct(outcome.markedReturnPercent)}</> : '미확정'}{outcome?.result === 'AMBIGUOUS' && <Typography variant="caption" display="block">순서 미확인</Typography>}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{stock?.latestPriceDate || '후속 일봉 대기'}<Typography variant="caption" display="block">선정일 대비 {pct(stock?.selectionReturnPercent)}</Typography></TableCell>
        <TableCell><Stack direction="row" flexWrap="wrap"><Button size="small" onClick={() => setSelected(row)}>상세보기</Button>{onReport && <Button size="small" onClick={() => onReport(row.runId)}>원본 보고서</Button>}{onRemove && <Button size="small" color={deleted ? 'primary' : 'error'} disabled={busy} onClick={() => onRemove(row)}>{deleted ? '복원' : '목록에서 삭제'}</Button>}</Stack></TableCell>
      </TableRow>;
    })}</TableBody></Table></div>
    <Dialog open={!!detail} onClose={() => setSelected(null)} maxWidth="lg" fullWidth aria-labelledby="monitoring-detail-title">
      <DialogTitle id="monitoring-detail-title">{detail?.name || detail?.stock?.name} · {detail?.selectionDate} 선정 검증</DialogTitle>
      <DialogContent dividers sx={{ overflowWrap: 'anywhere' }}>{detail?.stock ? <Stack gap={2}>
        <OutcomeDetails stock={detail.stock} />
        <Typography>추적 기간 {detail.firstTrackingDate || '미확인'} ~ {detail.lastTrackingDate || '미확인'} · 실행 {detail.runId}</Typography>
        <ScenarioMonitoringTable rows={[detail]} onDetail={onDetail} />
      </Stack> : <Alert severity="error">원본 보고서와 추적 자료를 확인하세요.</Alert>}</DialogContent>
      <DialogActions><Button onClick={() => setSelected(null)}>닫기</Button></DialogActions>
    </Dialog>
  </>;
}
