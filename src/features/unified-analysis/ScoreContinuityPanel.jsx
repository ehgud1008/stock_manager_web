import { Alert, Stack, Typography } from '@mui/material';
import SectionCard from '../../components/common/SectionCard';

const groups = {
  '종목 흐름': ['TREND', 'MOMENTUM', 'VOLUME', 'SUPPLY_DEMAND', 'RELATIVE_STRENGTH'],
  '진입 여건': ['ENTRY_LOCATION', 'ENTRY_REWARD_RISK', 'ENTRY_STOP_DISTANCE'],
  '위험·유동성': ['RISK_STABILITY', 'LIQUIDITY'],
};
const score = value => value == null ? '—' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const signed = value => `${value > 0 ? '+' : ''}${score(value)}`;
const contribution = factor => Number(factor.score) * Number(factor.weight);

function groupScore(factors, codes) {
  const included = factors.filter(f => codes.includes(f.factorCode) && f.score != null && Number(f.weight) > 0);
  const weight = included.reduce((sum, f) => sum + Number(f.weight), 0);
  return weight ? included.reduce((sum, f) => sum + contribution(f), 0) / weight : null;
}

export default function ScoreContinuityPanel({ data, continuity }) {
  if (!continuity) return <SectionCard title="점수 흐름"><Typography variant="body2">이전 분석을 확인하고 있습니다.</Typography></SectionCard>;
  if (continuity.unavailable) return <Alert severity="warning">저장된 점수 이력을 조회하지 못했습니다.</Alert>;
  const current = data.result.analysis;
  const previous = continuity.previous?.result?.analysis;
  const comparable = previous && continuity.older?.quality === data.collectionQuality
    && current.totalScore != null && previous.totalScore != null;
  const currentFactors = current.factors || [];
  const previousFactors = previous?.factors || [];
  const weightsMatch = comparable && currentFactors.every(f => {
    const prior = previousFactors.find(p => p.factorCode === f.factorCode);
    return !prior || Number(prior.weight) === Number(f.weight);
  });
  const changes = weightsMatch ? currentFactors.filter(f => f.score != null && Number(f.weight) > 0)
    .map(f => {
      const prior = previousFactors.find(p => p.factorCode === f.factorCode);
      return prior?.score == null ? null : { code: f.factorCode, delta: contribution(f) - contribution(prior) };
    }).filter(Boolean).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 3) : [];
  const history = (continuity.history || []).filter(item => item.engineVersion === continuity.selected?.engineVersion
    && item.priceBasis === continuity.selected?.priceBasis).slice(0, 20).reverse();
  const signals = analysis => new Set((analysis?.signalReport?.signals || [])
    .filter(s => ['CONFIRMED', 'ACTIVE'].includes(s.state)).map(s => s.type));
  const before = signals(previous);
  const now = signals(current);
  const started = [...now].filter(type => !before.has(type));
  const ended = [...before].filter(type => !now.has(type));

  return <SectionCard title="점수 흐름" caption="저장된 날짜별 결과 · 날짜당 최신 실행 1건">
    <Stack gap={1.25}>
      <Typography variant="body2">{history.map(item => `${item.priceDate.slice(5)} ${score(item.totalScore)}`).join('  →  ') || '이력이 없습니다.'}</Typography>
      {previous ? <>
        <Typography variant="body2">이전 분석 {continuity.older.priceDate} → 현재 {data.result.priceDate}
          {comparable ? ` · ${signed(Number(current.totalScore) - Number(previous.totalScore))}점` : ' · 점수 직접 비교 보류'}</Typography>
        {!comparable && <Typography variant="caption" color="text.secondary">점수가 없거나 자료 상태가 달라 차이를 해석하지 않습니다.</Typography>}
        {Object.entries(groups).map(([label, codes]) => <Typography key={label} variant="body2">{label}: {score(groupScore(currentFactors, codes))}
          {comparable && groupScore(previousFactors, codes) != null && groupScore(currentFactors, codes) != null
            ? ` (${signed(groupScore(currentFactors, codes) - groupScore(previousFactors, codes))})` : ''}</Typography>)}
        {changes.length > 0 && <Typography variant="body2" color="text.secondary">주요 점수 변화: {changes.map(c => `${c.code} ${signed(c.delta)}`).join(' · ')}</Typography>}
        {comparable && !weightsMatch && <Typography variant="caption" color="text.secondary">팩터 가중치가 달라 항목별 기여도 비교를 생략했습니다.</Typography>}
        <Typography variant="body2">신호: 신규 {started.join(', ') || '없음'} · 유지 {[...now].filter(type => before.has(type)).join(', ') || '없음'} · 종료 {ended.join(', ') || '없음'}</Typography>
      </> : <Typography variant="body2" color="text.secondary">비교 가능한 이전 거래일의 저장 분석이 없습니다.</Typography>}
    </Stack>
  </SectionCard>;
}
