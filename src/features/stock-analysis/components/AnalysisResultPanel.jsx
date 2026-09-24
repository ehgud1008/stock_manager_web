import { Box, Chip, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import PropTypes from 'prop-types';
import TradeSignalPanel from './TradeSignalPanel';

const formatPrice = (value) => value == null ? '산출 전' : `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`;
const formatScore = (value) => value == null ? '—' : Number(value).toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const ACTION_META = {
  BUY_CANDIDATE: { label: '매수 후보', color: 'success' },
  WATCH: { label: '관찰', color: 'secondary' },
  WAIT: { label: '대기', color: 'warning' },
  AVOID: { label: '회피', color: 'error' },
};

function MetricRow({ label, value, color }) {
  return <Stack direction="row" justifyContent="space-between" gap={2}><Typography variant="body2" color="text.secondary">{label}</Typography><Typography variant="body2" fontWeight={650} textAlign="right" color={color}>{value}</Typography></Stack>;
}

MetricRow.propTypes = { label: PropTypes.string.isRequired, value: PropTypes.node.isRequired, color: PropTypes.string };

export default function AnalysisResultPanel({ result }) {
  const action = ACTION_META[result.strategyAction] || { label: result.status, color: 'default' };
  const suitability = result.suitabilityScores;
  const assessment = result.swingAssessment;
  const actionLabel = suitability?.status === 'UNAVAILABLE' ? '분석 보류'
    : suitability ? { BUY_CANDIDATE: '매수 검토', WATCH: '관찰', WAIT: '진입 대기', AVOID: '회피' }[result.strategyAction] : action.label;
  const score = Number(result.totalScore || 0);
  const riskRate = result.entryTo && result.stopLoss ? ((result.entryTo - result.stopLoss) / result.entryTo) * 100 : null;

  return (
    <Stack gap={2.25}>
      <TradeSignalPanel report={result.signalReport} />
      <Box>
        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" gap={1}>
          <Box>
            <Typography variant="overline" color="text.secondary">{suitability ? '스윙 매매 적합도' : 'TOTAL SCORE'}</Typography>
            <Stack direction="row" alignItems="baseline" gap={0.75}>
              <Typography sx={{ fontSize: 52, fontWeight: 700, lineHeight: 1 }}>{formatScore(result.totalScore)}</Typography>
              <Typography color="text.secondary">/ 100</Typography>
              {result.scoreGrade && <Chip label={`${result.scoreGrade} 등급`} size="small" variant="outlined" />}
            </Stack>
          </Box>
          <Chip label={actionLabel} size="small" color={action.color} variant="outlined" />
        </Stack>
        {result.totalScore != null && <LinearProgress variant="determinate" value={score} sx={{ mt: 2, height: 5, borderRadius: 5 }} />}
      </Box>
      {suitability && <Stack gap={1}>
        <Typography variant="body2" color={suitability.status === 'COMPLETE' ? 'text.secondary' : 'warning.main'}>
          {suitability.status === 'UNAVAILABLE' ? `${assessment?.detailLabel || '핵심 데이터 부족'} · 대표점수 산출 보류` : suitability.status === 'PROVISIONAL' ? '잠정 점수 · 누락 항목의 비중은 상승 영역 안에서 재배분' : '산출 완료'}
          {' · '}항목 {suitability.availableFactors}/{suitability.totalFactors}
        </Typography>
        <MetricRow label="상승 조건 · 60%" value={formatScore(suitability.rise)} />
        <MetricRow label="진입 조건 · 30%" value={formatScore(suitability.entry)} />
        <MetricRow label="위험 부담 · 10% (높을수록 양호)" value={formatScore(suitability.risk)} />
        <Typography variant="caption" color="text.secondary">초기 규칙 기반 적합도이며 상승 확률이 아닙니다. 버전이 다른 점수는 직접 비교하지 마세요.</Typography>
      </Stack>}
      {assessment && <Stack gap={1}>
        <MetricRow label="스윙 유형" value={assessment.setupLabel} />
        <MetricRow label="판정 상세" value={assessment.detailLabel} />
        {assessment.scenarioStatus === 'UNAVAILABLE' && <Typography variant="body2" color="warning.main">
          목표 시나리오를 산출하지 못했습니다. 부분 항목 점수는 표시하지만, 이를 낮은 적합도 점수나 매수 판단으로 대체하지 않습니다.
        </Typography>}
      </Stack>}
      <Divider />
      <Box>
        <Typography variant="overline" color="primary.main">STRATEGY</Typography>
        <Typography variant="h2" mt={0.5}>{result.strategyName || '전략 산출 전'}</Typography>
        <Typography variant="caption" color="text.secondary">{result.strategyCode || result.analysisMode}</Typography>
      </Box>
      <Stack gap={1.45}>
        <MetricRow label="현재가" value={formatPrice(result.currentPrice)} />
        <MetricRow label="진입 구간" value={result.entryFrom == null ? '유효 시나리오 없음' : `${formatPrice(result.entryFrom)} – ${formatPrice(result.entryTo)}`} />
        <MetricRow label="목표가" value={result.targets.length ? result.targets.map(formatPrice).join(' / ') : '유효 시나리오 없음'} color="success.main" />
        <MetricRow label="손절가" value={formatPrice(result.stopLoss)} color="error.main" />
        <MetricRow label="진입 상단 기준 위험률" value={riskRate == null ? '산출 불가' : `${riskRate.toFixed(1)}%`} />
      </Stack>
      <Typography variant="caption" color="text.secondary">계산 버전 {result.engineVersion}</Typography>
      <Stack direction="row" justifyContent="space-between" sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(139,218,99,.06)', border: '1px solid rgba(139,218,99,.12)' }}>
        <Typography variant="caption" color="primary.main">과거 표본 {result.historicalSampleCount}건</Typography>
        <Typography variant="caption" color="text.secondary">데이터 {result.dataQualityStatus}</Typography>
      </Stack>
    </Stack>
  );
}

AnalysisResultPanel.propTypes = { result: PropTypes.object.isRequired };
