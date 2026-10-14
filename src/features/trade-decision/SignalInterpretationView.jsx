import { Alert, Box, Chip, Link, Stack, Typography } from '@mui/material';

const stances = { SUPPORTED: '엔진 신호 뒷받침', CHECK_REQUIRED: '추가 확인 필요', RECONSIDER: '엔진 신호 재검토 필요', INSUFFICIENT: '자료 부족 · 해석 유보' };
const actions = { BUY_CANDIDATE: '매수 후보', WATCH: '관찰', WAIT: '대기', AVOID: '진입 회피' };
const sides = { BUY: '매수', SELL: '매도', TAKE_PROFIT: '이익 실현' };
const states = { PRELIMINARY: '예비', CONFIRMED: '확인', ACTIVE: '유효', INVALIDATED: '무효', EXPIRED: '만료' };
const engineNames = { ANALYSIS: '종목분석 신호·전략', SCREENER: '추세 분석', QUALITY: '자료 품질' };
const money = value => value == null ? '미산출' : `${Number(value).toLocaleString('ko-KR')}원`;

function References({ item, sources }) {
  return <Stack gap={0.25}>
    {!!item.engineEvidenceIds?.length && <Typography variant="caption" color="text.secondary">엔진 근거: {item.engineEvidenceIds.map(id => engineNames[id] || id).join(' · ')}</Typography>}
    {(item.sourceIds || []).map(id => {
      const source = sources.find(row => row.id === id); if (!source) return null;
      let href;
      try { const url = new URL(source.url); if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) href = url.href; } catch { /* Render untrusted addresses as text only. */ }
      return <Typography key={id} variant="caption">{href ? <Link href={href} target="_blank" rel="noopener noreferrer">[{id}] {source.title}</Link> : `[${id}] ${source.title}`}</Typography>;
    })}
  </Stack>;
}
function Conditions({ title, rows = [], sources }) {
  if (!rows.length) return null;
  return <Box><Typography fontWeight={700}>{title}</Typography><Stack component="ul" gap={1} sx={{ pl: 2.5, my: 1 }}>{rows.map((item, i) => <Box component="li" key={i}><Typography variant="body2">{item.text}</Typography><References item={item} sources={sources} /></Box>)}</Stack></Box>;
}
export default function SignalInterpretationView({ result }) {
  const interpretation = result.report?.signalInterpretation;
  if (!interpretation) return <Alert severity="info">이전 형식의 리포트입니다. 매매 신호 종합 해석은 최신 자료 재수집·새 분석 시 생성됩니다.</Alert>;
  const sources = result.evidence?.sources || [];
  const analysis = result.engine?.evidence?.ANALYSIS;
  const timing = result.signalContext;
  const scenario = analysis?.scenario;
  return <Stack gap={1.5} component="section" aria-label="매매 신호 종합 해석" sx={{ p: 2, border: 1, borderColor: 'primary.main', borderRadius: 2 }}>
    <Typography variant="h6">매매 신호 종합 해석</Typography>
    <Stack direction="row" gap={1} flexWrap="wrap"><Chip label={`엔진 전략: ${actions[analysis?.strategy?.action] || '미확인'}`} variant="outlined" /><Chip label={stances[interpretation.stance] || '해석 유보'} color={interpretation.stance === 'RECONSIDER' ? 'warning' : 'default'} /></Stack>
    {!!analysis?.signalReport?.signals?.length && <Stack direction="row" gap={0.5} flexWrap="wrap">{analysis.signalReport.signals.map((signal, i) => <Chip size="small" variant="outlined" key={signal.id || i} label={`${sides[signal.side] || signal.side} · ${states[signal.state] || signal.state} · ${signal.evaluatedOn || '기준일 미확인'}`} />)}</Stack>}
    <Typography variant="body2">{interpretation.reason}</Typography>
    <References item={interpretation} sources={sources} />
    <Typography variant="caption" color="text.secondary">엔진 신호를 외부 자료로 해석한 결과입니다. 신호 뒷받침은 매수 추천이나 승률을 뜻하지 않습니다. 보유량·매수가·위험 허용 수준을 반영한 개인별 주문 판단은 아닙니다.</Typography>
    <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
      <Typography fontWeight={600}>자료 시점·가격 참고</Typography>
      <Typography variant="body2">엔진 가격 기준일 {result.engine?.priceDate || '미확인'} · 수집 시점 {timing?.collectedAt || result.evidence?.collectedAt || '미확인'}</Typography>
      {timing?.status === 'WITHIN_WINDOW' ? <Typography variant="caption">기준일 차이 {timing.calendarDayGap}일(달력 기준). 최신 거래일 또는 현재 가격 확인을 뜻하지 않습니다.</Typography> : <Alert severity="warning" sx={{ mt: 1 }}>엔진 기준일이 오래되었거나 시점 확인이 필요합니다. 최신 종목분석 후 해석을 다시 확인하세요.</Alert>}
      {scenario ? <><Typography variant="body2" mt={1}>저장된 엔진 진입 구간: {money(scenario.entryFrom)} ~ {money(scenario.entryTo)}</Typography><Typography variant="body2">목표가: {(scenario.targets || []).map(money).join(' / ') || '미산출'} · 손절가: {money(scenario.stopLoss)}</Typography><Typography variant="caption">저장된 엔진 기준 가격입니다. 현재 적용 여부는 신호 상태와 아래 조건을 함께 확인하세요.</Typography></> : <Typography variant="body2" mt={1}>저장된 엔진 가격 계획이 없어 가격을 표시하지 않습니다.</Typography>}
    </Box>
    <Conditions title="엔진과 외부 근거의 충돌" rows={interpretation.conflicts} sources={sources} />
    {!interpretation.conflicts?.length && <Typography variant="body2" color="text.secondary">이번 리포트에서 명시한 충돌은 없습니다. 반대 근거가 없다는 뜻은 아닙니다.</Typography>}
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
      <Conditions title="미보유 · 진입 검토 전 확인" rows={interpretation.nonHolderChecks} sources={sources} />
      <Conditions title="보유 · 유지 판단 재검토 조건" rows={interpretation.holderChecks} sources={sources} />
    </Box>
    <Conditions title="이번 해석을 다시 검토할 조건" rows={interpretation.invalidationConditions} sources={sources} />
    {!!interpretation.missingInformation?.length && <Alert severity="info"><Typography fontWeight={600}>아직 부족한 정보</Typography>{interpretation.missingInformation.map((text, i) => <Typography variant="body2" key={i}>{text}</Typography>)}</Alert>}
  </Stack>;
}
