import { Alert, Box, Button, Chip, Divider, Drawer, IconButton, Stack, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { GAP_LABELS, signed, STAGES, watchKey } from '../screenerModel';
import { formatNumber, formatTime, QUALITY_LABELS, TRANSITION_LABELS } from '../screenerAdapter';
import StockChartPanel from '../../stock-chart/components/StockChartPanel';
import ScreenerStockAnalysis from './ScreenerStockAnalysis';

function Metric({ label, value }) {
  return <Stack direction="row" justifyContent="space-between" gap={2}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={600} textAlign="right">{value}</Typography></Stack>;
}
const stageName = (stage) => stage == null ? '미확인' : `S${stage}`;
const yesNo = (value) => value == null ? '미평가' : value ? '돌파' : '미돌파';

export default function ScreenerDetailDrawer({ row, snapshot, mode, watched, onWatch, onClose }) {
  const meta = STAGES[(row?.stage || 0) - 1] || { label: QUALITY_LABELS[row?.quality] || '미판정', color: '#A5ADBA', order: '스테이지를 확정할 수 없습니다.' };
  const saved = row && watched.includes(watchKey(mode, row.stockCode));
  const high = row?.high52Week;
  return <Drawer anchor="right" open={Boolean(row)} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 720 }, maxWidth: '100%', boxSizing: 'border-box', bgcolor: '#101620', p: { xs: 2.5, sm: 3 }, overflowY: 'auto' }, role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'screener-detail-title' }}>
    {row && <Stack gap={2.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center"><Typography variant="overline" color="primary.main">STAGE DETAIL / 엔진 결과</Typography><IconButton onClick={onClose} aria-label="상세 닫기"><CloseRoundedIcon /></IconButton></Stack>
      <Box><Typography id="screener-detail-title" variant="h2">{row.stockName}</Typography><Typography variant="body2" color="text.secondary" mt={0.8}>{row.stockCode} · {row.market} · {mode === 'SWING' ? '스윙' : '단타'} / {snapshot.timeframe}</Typography></Box>
      <StockChartPanel key={row.stockCode} stockCode={row.stockCode} basic realData />
      <ScreenerStockAnalysis key={`${row.stockCode}:${mode}`} stockCode={row.stockCode} mode={mode} />
      <Divider />
      <Typography variant="h3">저장된 스크리너 판정</Typography>
      <Alert severity={row.quality === 'VALID' && row.sourceComplete ? 'info' : 'warning'} variant="outlined">
        {QUALITY_LABELS[row.quality] || row.quality} · {row.status === 'ANALYZED' ? row.sourceComplete ? '원본 조회 완료' : '원본 조회 범위 부족' : '정상 분석 결과 없음'}{row.errorCode ? ` · ${row.errorCode}` : ''}
      </Alert>
      <Box sx={{ p: 2.5, border: `1px solid ${meta.color}40`, borderRadius: 2.5, background: `linear-gradient(120deg, ${meta.color}15, transparent)` }}>
        <Stack direction="row" alignItems="center" gap={2}><Typography sx={{ fontSize: 42, fontWeight: 600, color: meta.color }}>{row.stage ? `S${row.stage}` : '—'}</Typography><Box><Typography fontWeight={600}>{meta.label}</Typography><Typography variant="body2" color="text.secondary">{meta.order}</Typography></Box></Stack>
        <Typography variant="body2" mt={1}>{stageName(row.previousDistinctStage)} → {stageName(row.stage)} · {row.barsInStage == null ? '유지기간 미확인' : `${row.barsInStage}${snapshot.unit}${row.stageDurationComplete ? '' : ' 이상'} 유지`}</Typography>
        {row.barsInStage != null && !row.stageDurationComplete && <Typography variant="caption" color="text.secondary">시작을 확인할 수 없어 관찰된 기간의 하한값입니다.</Typography>}
      </Box>
      <Box><Typography variant="h3" mb={1.5}>최근 {row.history.length}{snapshot.unit} 스테이지</Typography>
        {row.history.length ? <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${row.history.length}, 1fr)`, gap: 0.6 }}>{row.history.map((stage, index) => {
          const color = STAGES[(stage || 0) - 1]?.color || '#A5ADBA';
          return <Tooltip key={index} title={`${row.historyTimes[index]} · ${QUALITY_LABELS[row.historyQuality[index]] || ''}`}><Stack alignItems="center" gap={0.75}><Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{row.labels[index]}</Typography><Box sx={{ width: '100%', textAlign: 'center', py: 1.1, borderRadius: 1, color, bgcolor: `${color}12`, border: '1px solid', borderColor: index === row.history.length - 1 ? color : 'transparent' }}>{stage == null ? '—' : `S${stage}`}</Box></Stack></Tooltip>;
        })}</Box> : <Typography variant="body2" color="text.secondary">저장된 스테이지 이력이 없습니다.</Typography>}
      </Box>
      <Stack gap={1.2}>
        <Metric label="직전 봉 스테이지" value={stageName(row.previousBarStage)} />
        <Metric label="직전의 다른 스테이지" value={stageName(row.previousDistinctStage)} />
        <Metric label="현재 스테이지 진입" value={`${formatTime(row.stageStartedAt)} · ${TRANSITION_LABELS[row.transitionDirection]}`} />
        <Metric label="이번 봉에서 변경" value={row.stage == null || row.previousBarStage == null ? '미확인' : row.stageChanged ? '변경됨' : '유지 중'} />
      </Stack>
      <Divider />
      <Box><Typography variant="h3">EMA와 기울기</Typography><Typography variant="caption" color="text.secondary">기울기는 직전 {row.slopeLookback}봉 대비 변화율 · 표시값만 반올림</Typography>
        <Table size="small" aria-label="EMA 상세 값" sx={{ mt: 1, '& td, & th': { px: 0, py: 1.2 } }}><TableHead><TableRow><TableCell>종가 기준 EMA</TableCell><TableCell align="right">값 (원)</TableCell><TableCell align="right">기울기 (%)</TableCell></TableRow></TableHead><TableBody>{row.ema.map((value, index) => <TableRow key={index}><TableCell><Box component="span" sx={{ color: ['#8BDA63', '#71A7FF', '#D5A3EB'][index] }}>●</Box> EMA{row.emaPeriods[index]}</TableCell><TableCell align="right">{formatNumber(value)}</TableCell><TableCell align="right">{signed(row.slopes[index])}</TableCell></TableRow>)}</TableBody></Table>
      </Box>
      <Stack gap={1.2}>
        <Metric label="단기–중기 간격" value={`${signed(row.shortMiddleGap)}%`} />
        <Metric label="중기–장기 간격" value={`${signed(row.middleLongGap)}%`} />
        <Metric label="중·장기 사이 거리" value={GAP_LABELS[row.bandState]} />
        <Typography variant="caption" color="text.secondary">간격의 부호는 선의 위치, 확대·축소는 거리의 변화를 뜻합니다. 간격 확대가 곧 상승을 의미하지는 않습니다.</Typography>
      </Stack>
      <Divider />
      <Stack gap={1.2}>
        <Typography variant="h3">관찰 정보</Typography>
        <Metric label="관찰 유입" value={row.observationSource} />
        <Metric label="거래대금 (마지막 분석 봉)" value={row.tradingAmount100m == null ? '미제공' : `${formatNumber(row.tradingAmount100m)}억원`} />
        <Metric label="직전 20봉 평균 대비 거래량" value={row.volumeRatio == null ? '미산출' : `${formatNumber(row.volumeRatio)}배`} />
        <Metric label="직전 20봉 고가 돌파" value={yesNo(row.breakout20)} />
        <Metric label="분석 기준 (KST)" value={snapshot.asOf} />
        <Metric label="마지막 봉 확정 (KST)" value={formatTime(row.effectiveAt)} />
        <Metric label="52주 고점" value={high?.high == null ? '미산출' : `${formatNumber(high.high)}원`} />
        <Metric label="52주 고점과의 거리" value={high?.distancePercent == null ? '미산출' : `${formatNumber(high.distancePercent)}%`} />
        <Metric label="52주 고점 돌파" value={yesNo(high?.breakout)} />
        <Metric label="52주 이력 범위" value={{ FULL_WINDOW: '창 범위 확보', HISTORY_SHORT: '부분 이력', NO_DATA: '데이터 없음' }[high?.coverage] || '미확인'} />
        <Typography variant="caption" color="text.secondary">52주는 달력 기준 일봉으로 계산합니다. 기준일 {high?.referenceDate || '—'} · 창 시작 {high?.inclusiveWindowStart || '—'}. 장중 당일 일봉이 없으면 부분 이력입니다.</Typography>
      </Stack>
      {row.warnings.length > 0 && <Alert severity="warning"><Typography variant="body2" fontWeight={600}>데이터·판정 경고</Typography>{row.warnings.map((warning) => <Typography key={warning} variant="caption" display="block" sx={{ overflowWrap: 'anywhere' }}>{warning}</Typography>)}</Alert>}
      <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(255,255,255,.035)' }}><Stack direction="row" justifyContent="space-between" mb={1}><Typography variant="body2" fontWeight={600}>스크리너 자체 점수 / 최종 신호</Typography><Chip label="미평가" size="small" variant="outlined" /></Stack><Typography variant="caption" color="text.secondary">상단 종목분석의 점수·전략과 별개입니다. 스크리너는 현재 스테이지 자체를 매수 신호로 판정하지 않습니다.</Typography></Box>
      <Button fullWidth variant={saved ? 'outlined' : 'contained'} startIcon={saved ? <StarRoundedIcon /> : <StarBorderRoundedIcon />} onClick={() => onWatch(row.stockCode)}>{saved ? '관찰종목에서 해제' : '관찰종목에 추가'}</Button>
      <Typography variant="caption" color="text.secondary" textAlign="center">관찰종목은 이 브라우저에 모드별로 저장됩니다. · {row.engineVersion || '엔진 결과 없음'}</Typography>
    </Stack>}
  </Drawer>;
}
