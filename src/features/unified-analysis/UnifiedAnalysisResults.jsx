import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Divider, Grid, LinearProgress, Stack,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import SectionCard from '../../components/common/SectionCard';
import FactorScorePanel from '../stock-analysis/components/FactorScorePanel';
import TradeSignalPanel from '../stock-analysis/components/TradeSignalPanel';
import StockChartPanel from '../stock-chart/components/StockChartPanel';
import { GAP_LABELS, signed, STAGES } from '../screener/screenerModel';

const number = (value, digits = 1) => value == null ? '—' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits });
const price = value => value == null ? '산출 불가' : `${number(value, 0)}원`;
const stageText = stage => stage == null ? '미판정' : `S${stage}`;
const TRANSITIONS = { FORWARD: '순행', REVERSE: '역행', SKIPPED: '단계 건너뜀', NONE: '변화 없음', UNKNOWN: '미확인' };
const QUALITY = { VALID: '정상', BOUNDARY: '경계 구간', INSUFFICIENT_DATA: '표본 부족' };
const SOURCE = { INPUT: '입력 데이터', ANALYSIS: '종목 평가', SIGNAL: '매매 신호', SCREENER: '추세 분석' };
const WARNINGS = { INSUFFICIENT_EMA_WARMUP: 'EMA 계산에 필요한 일봉 표본이 부족합니다.', EMA_BOUNDARY: '이동평균선이 매우 가까워 스테이지 판정을 보류합니다.',
  STAGE_DURATION_LOWER_BOUND: '스테이지 시작을 확인할 수 없어 표시된 유지 기간은 관찰된 최소 기간입니다.',
  INCOMPLETE_52_WEEK_HISTORY: '52주 전체 이력이 확보되지 않았습니다.' };

function Metric({ label, children, caption, color }) {
  return <SectionCard><Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography sx={{ fontSize: { xs: 27, md: 34 }, fontWeight: 700, my: 1, color: color || 'text.primary' }}>{children}</Typography>
    <Typography variant="caption" color="text.secondary">{caption}</Typography></SectionCard>;
}

function Row({ label, value }) {
  return <Stack direction="row" justifyContent="space-between" gap={2}>
    <Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" textAlign="right" fontWeight={600}>{value}</Typography>
  </Stack>;
}

export default function UnifiedAnalysisResults({ data, saved = false }) {
  const { result, collectionWarnings, collectionQuality } = data;
  const { stock, analysis, screener } = result;
  const stage = STAGES.find(item => item.id === screener.stage);
  const scenario = analysis.scenario;
  const liveSignals = analysis.signalReport.signals.filter(signal => ['CONFIRMED', 'ACTIVE'].includes(signal.state));
  const factors = analysis.factors.map(factor => ({ ...factor, contribution: factor.score == null ? null : factor.score * factor.weight }));
  const rewardRisk = scenario && scenario.entryTo > scenario.stopLoss && scenario.targets?.length
    ? (scenario.targets[0] - scenario.entryTo) / (scenario.entryTo - scenario.stopLoss) : null;
  const qualityLimited = collectionQuality !== 'COMPLETE' || screener.quality !== 'VALID' || analysis.totalScore == null;

  return <Stack gap={2.5} aria-label="종합분석 결과">
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
      <Box><Stack direction="row" gap={1} alignItems="center"><Typography variant="h2">{stock.stockName}</Typography><Chip size="small" variant="outlined" label={stock.marketCode} /></Stack>
        <Typography color="text.secondary" variant="body2" mt={0.75}>{stock.stockCode} · 가격일 {result.priceDate} · 분석 기준 {result.asOf.replace('T', ' ')} (한국시간)</Typography></Box>
      <Chip size="small" variant="outlined" color={qualityLimited ? 'warning' : 'success'} label={qualityLimited ? '일부 항목 확인 필요' : '분석 완료'} />
    </Stack>
    <Grid container spacing={2}>
      <Grid size={{ xs: 6, lg: 3 }}><Metric label="추세 스테이지" caption={stage?.label || QUALITY[screener.quality]} color={stage?.color}>{stageText(screener.stage)}</Metric></Grid>
      <Grid size={{ xs: 6, lg: 3 }}><Metric label="스윙 적합도" caption={analysis.totalScore == null ? '대표점수 산출 보류' : '100점 기준 · 기존 종목 평가'}>{number(analysis.totalScore)}</Metric></Grid>
      <Grid size={{ xs: 6, lg: 3 }}><Metric label="평가 종가" caption={`${result.priceDate} 완료 일봉`}>{price(stock.currentPrice)}</Metric></Grid>
      <Grid size={{ xs: 6, lg: 3 }}><Metric label="유효 매매 신호" caption={analysis.signalReport.completeness === 'READY' ? '확정·유지 신호' : '패턴 신호 표본 부족'}>{analysis.signalReport.completeness === 'READY' ? `${liveSignals.length}개` : '판정 보류'}</Metric></Grid>
    </Grid>

    <SectionCard title="가격 차트" caption={`차트는 조회 시점의 가격 데이터입니다. 진입·목표·손절선은 분석 가격일 ${result.priceDate} 기준이며, 차트를 조회해도 분석 결과는 바뀌지 않습니다.`}>
      <StockChartPanel
        key={`${stock.stockCode}:${result.asOf}`}
        stockCode={stock.stockCode}
        analysis={scenario || undefined}
        refreshKey={result.asOf}
        realData
      />
    </SectionCard>

    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, lg: 7 }}><SectionCard title="추세 구조" caption="EMA 배열과 전환 흐름을 함께 확인하세요." action={<Chip size="small" variant="outlined" label={QUALITY[screener.quality] || '미확인'} />}>
        <Stack gap={2.5}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 0.75 }}>
            {STAGES.map(item => <Tooltip key={item.id} title={`${item.label} · ${item.order}`}><Box sx={{ p: { xs: 0.75, sm: 1.25 }, textAlign: 'center', borderRadius: 2,
              border: '1px solid', borderColor: item.id === screener.stage ? item.color : 'divider', bgcolor: item.id === screener.stage ? `${item.color}18` : 'transparent' }}>
              <Typography fontWeight={700} color={item.id === screener.stage ? item.color : 'text.secondary'}>S{item.id}</Typography>
              <Typography variant="caption" sx={{ fontSize: 10, display: { xs: 'none', sm: 'block' } }}>{item.label}</Typography>
            </Box></Tooltip>)}
          </Box>
          <Stack gap={1.25}>
            <Row label="현재 배열" value={stage?.order || '판정 보류'} />
            <Row label="최근 전환" value={`${stageText(screener.previousDistinctStage)} → ${stageText(screener.stage)} · ${TRANSITIONS[screener.lastTransition] || '미확인'}`} />
            <Row label="현재 단계 유지" value={screener.barsInStage == null ? '미확인' : `${screener.barsInStage}봉${screener.stageDurationComplete ? '' : ' 이상'}`} />
            <Row label="전환 후 경과" value={screener.barsSinceTransition == null ? '미확인' : `${screener.barsSinceTransition}봉`} />
          </Stack>
          <TableContainer><Table size="small" aria-label="종합분석 EMA"><TableHead><TableRow><TableCell>이동평균</TableCell><TableCell align="right">가격</TableCell><TableCell align="right">기울기</TableCell></TableRow></TableHead>
            <TableBody>{['short', 'middle', 'long'].map(key => <TableRow key={key}><TableCell>EMA {screener.config[`${key}Period`]}</TableCell>
              <TableCell align="right">{price(screener.ema?.[`${key}Ema`])}</TableCell><TableCell align="right">{signed(screener.slopes?.[`${key}Slope`])}%</TableCell></TableRow>)}</TableBody>
          </Table></TableContainer>
          <Typography variant="caption" color="text.secondary">기울기는 직전 {screener.config.slopeLookback}봉 대비 변화율입니다.</Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} gap={2}>
            <Chip variant="outlined" label={`단기·중기 ${signed(screener.shortMiddleGap?.signedPercent)}% · ${GAP_LABELS[screener.shortMiddleGap?.state] || '미확인'}`} />
            <Chip variant="outlined" label={`중기·장기 ${signed(screener.middleLongGap?.signedPercent)}% · ${GAP_LABELS[screener.middleLongGap?.state] || '미확인'}`} />
          </Stack>
          <Box><Typography variant="body2" mb={1}>최근 스테이지 흐름 · {Math.min(20, screener.history.length)}봉</Typography>
            <Stack direction="row" gap={0.5} sx={{ overflowX: 'auto', pb: 1 }}>{screener.history.slice(-20).map((point, index) => <Tooltip key={`${point.at}:${index}`} title={`${point.at?.slice(0, 10)} · ${QUALITY[point.quality] || ''}`}>
              <Box sx={{ minWidth: 28, py: 1, borderRadius: 1, textAlign: 'center', bgcolor: `${STAGES[(point.stage || 0) - 1]?.color || '#A5ADBA'}20`, color: STAGES[(point.stage || 0) - 1]?.color || 'text.secondary', fontSize: 12 }}>{point.stage ?? '—'}</Box>
            </Tooltip>)}</Stack>
          </Box>
        </Stack>
      </SectionCard></Grid>
      <Grid size={{ xs: 12, lg: 5 }}><SectionCard title="종목 평가와 가격 구간" caption="같은 종가로 계산한 전략과 시나리오">
        <Stack gap={2}>
          <Typography variant="h2">{analysis.strategy.strategyName}</Typography>
          {analysis.totalScore != null ? <LinearProgress variant="determinate" value={analysis.totalScore} sx={{ height: 6, borderRadius: 4 }} />
            : <Alert severity="info">표본 또는 가격 시나리오가 충분하지 않아 대표점수를 산출하지 않았습니다.</Alert>}
          {(analysis.strategy.reasons || []).map((reason, index) => <Typography key={index} variant="body2" color="text.secondary">{reason}</Typography>)}
          <Divider />
          <Row label="진입 구간" value={scenario ? `${price(scenario.entryFrom)} ~ ${price(scenario.entryTo)}` : '유효 시나리오 없음'} />
          <Row label="목표가" value={scenario?.targets?.length ? scenario.targets.map(price).join(' / ') : '산출 불가'} />
          <Row label="시나리오 손절가" value={price(scenario?.stopLoss)} />
          <Row label="첫 목표 손익비" value={rewardRisk == null ? '산출 불가' : `${number(rewardRisk, 2)}배`} />
          <Typography variant="caption" color="text.secondary">손익비는 진입 상단 기준입니다. 개인 보유 정보는 반영하지 않습니다.</Typography>
          <Divider />
          <Row label="직전 20봉 대비 거래량" value={screener.features?.volumeRatio20 == null ? '산출 불가' : `${number(screener.features.volumeRatio20, 2)}배`} />
          <Row label="직전 20봉 고가 돌파" value={screener.features?.breakout20 == null ? '판정 보류' : screener.features.breakout20 ? '돌파' : '미돌파'} />
          <Row label="52주 고점" value={price(screener.features?.high52Week?.high)} />
          <Row label="52주 고점과의 거리" value={`${number(screener.features?.high52Week?.distancePercent, 2)}%`} />
          {screener.features?.high52Week?.coverage !== 'FULL_WINDOW' && <Typography variant="caption" color="warning.main">52주 정보는 부분 이력 또는 데이터 부족 상태입니다.</Typography>}
        </Stack>
      </SectionCard></Grid>
      <Grid size={{ xs: 12 }}><SectionCard><TradeSignalPanel report={analysis.signalReport} /></SectionCard></Grid>
    </Grid>

    <Box>
      <Accordion disableGutters><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography fontWeight={600}>팩터별 점수와 근거 · {analysis.factors.length}개</Typography></AccordionSummary>
        <AccordionDetails><FactorScorePanel factors={factors} /></AccordionDetails></Accordion>
      <Accordion disableGutters><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography fontWeight={600}>데이터 범위와 확인 사항</Typography></AccordionSummary>
        <AccordionDetails><Stack gap={1.5}>
          <Typography variant="body2">사용 표본: 일봉 {result.dailyBarCount}개 · 주봉 {result.weeklyBarCount}개 · 월봉 {result.monthlyBarCount}개</Typography>
          <Typography variant="body2" color="text.secondary">첫 주·월은 제외하며 마지막 주·월은 가격일까지 반영합니다. {saved ? '선택한 실행에 저장된 결과입니다.' : '이 결과는 현재 화면에서만 유지됩니다.'}</Typography>
          {collectionWarnings.map((message, index) => <Typography key={`collection-${index}`} variant="body2">수집 · {message}</Typography>)}
          {result.warnings.filter(w => w.source !== 'SIGNAL').map((warning, index) => <Typography key={index} variant="body2">{SOURCE[warning.source] || '확인 사항'} · {WARNINGS[warning.message] || warning.message}</Typography>)}
          <Typography variant="caption" color="text.secondary">{result.engineVersion} · {analysis.engineVersion} · {screener.engineVersion}</Typography>
        </Stack></AccordionDetails></Accordion>
    </Box>
  </Stack>;
}
