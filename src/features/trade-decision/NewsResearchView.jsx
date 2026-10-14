import { Alert, Box, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';

const importanceNames = { HIGH: '높음', MEDIUM: '중간', LOW: '낮음', UNDETERMINED: '판단 유보' };
const evidenceNames = { ORIGINAL: '공식 자료 확보', SNIPPET: '검색 요약 수준', TITLE_ONLY: '제목 수준' };
const changes = { NEW: '처음 분석한 사건', UNCHANGED: '해석 유지', STRENGTHENED: '기존 해석 강화', WEAKENED: '기존 해석 약화', INVALIDATED: '기존 해석 재검토', UNDETERMINED: '변화 판단 유보' };
const number = value => typeof value === 'string' && /^\d+$/.test(value) ? BigInt(value).toLocaleString('ko-KR') : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });

export function BusinessResearchView({ result }) {
  const context = result.report.businessContext;
  if (!context) return null;
  const profile = result.evidence.companyProfile;
  const revenue = result.evidence.annualRevenue;
  return <Stack gap={1.5}>
    <Box><Typography variant="h6">기업·사업 연결 근거</Typography><Typography variant="body2" mt={0.5}>{context.description}</Typography>
      <Typography variant="caption" color="text.secondary">{context.status === 'OFFICIAL_EVIDENCE' ? `공식 문서 참조: ${context.sourceIds.join(', ')}` : '공식 사업 근거 미확인 · 업종이나 매출 비중을 추정하지 않습니다.'}</Typography></Box>
    {profile?.status === 'OFFICIAL_API' && <Typography variant="body2">DART 법인명 {profile.corpName} · 공시 업종코드 {profile.industryCode || '미제공'} · {profile.source}</Typography>}
    {result.evidence.productSearch && <Typography variant="body2">공시에서 추출한 제품명으로 추가 검색: {result.evidence.productSearch}</Typography>}
    {revenue && <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}><Typography fontWeight={600}>기업 규모 참고 · 별도 매출액 {number(revenue.value)}원</Typography><Typography variant="caption">{revenue.period} · {revenue.periodDetail} · {revenue.scope} · 출처 {revenue.sourceId}. 개별 계약 비율의 분모로 자동 대체하지 않습니다.</Typography></Box>}
    {result.report.engineChanged && <Alert severity="info">이전 리포트와 엔진 입력도 달라졌습니다. 해석 변화가 뉴스 변화만으로 발생했다고 볼 수 없습니다.</Alert>}
  </Stack>;
}
export function EventResearchView({ event, evidence }) {
  if (!event.importance) return null;
  const question = event.criticalQuestion;
  const metrics = (evidence.materialityMetrics || []).filter(metric => event.importance.metricIds.includes(metric.id));
  return <Stack gap={1.5}>
    <Stack direction="row" gap={1} flexWrap="wrap"><Chip size="small" variant="outlined" label={`기업 영향 중요도: ${importanceNames[event.importance.level]}`} /><Chip size="small" variant="outlined" label={`근거: ${evidenceNames[event.evidenceQuality?.level] || '확인 필요'}`} /></Stack>
    <Typography variant="body2">중요도 판단 이유: {event.importance.reason}</Typography>
    <Typography variant="caption" color="text.secondary">중요도는 호재 여부·수익률·확률이 아닙니다. 표기된 제공처 {event.evidenceQuality?.publisherCount ?? 0}개 · 독립적인 교차 확인은 미확정입니다.</Typography>
    {metrics.map(metric => <Box key={metric.id} sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
      <Typography fontWeight={700}>공시 기재 규모 비교 · {number(metric.ratioPct)}%</Typography>
      <Typography variant="body2">계약금액 {number(metric.amount)}원 ÷ 최근매출액 {number(metric.revenue)}원 × 100</Typography>
      <Typography variant="caption">{metric.period} · {metric.scope} · 출처 {metric.sourceId}</Typography>
      <Typography variant="body2" mt={0.5}>{metric.limitation}</Typography>
    </Box>)}
    {event.conflict && <Box><Typography fontWeight={700}>상충하는 근거</Typography><Typography variant="body2">{event.conflict.explanation}</Typography>
      <Typography variant="caption" color="text.secondary">지지 자료: {event.conflict.supportingSourceIds.join(', ') || '미확보'} · 반대 자료: {event.conflict.opposingSourceIds.join(', ') || '미확보'}</Typography></Box>}
    {question && <Stack gap={0.75} sx={{ borderLeft: 3, borderColor: 'primary.main', pl: 1.5 }}>
      <Typography fontWeight={700}>판단을 바꿀 핵심 질문 · {question.question}</Typography>
      {[['known','현재 확인'],['unknown','아직 모르는 것'],['nextEvidence','다음 확인 자료'],['positiveCondition','해석을 강화하는 조건'],['negativeCondition','해석을 약화하는 조건']].map(([key,label]) => <Typography variant="body2" key={key}>{label}: {question[key]}</Typography>)}
    </Stack>}
    <Box><Typography fontWeight={700}>이전 분석 대비 · {changes[event.changeType]}</Typography><Typography variant="body2">{event.changeReason}</Typography>
      {event.linkStatus === 'AI_PROPOSED_LINK' && <Alert severity="info" sx={{ mt: 1 }}>서로 다른 자료를 AI가 같은 사건 후보로 연결했습니다. 정정·후속 관계가 확정된 것은 아닙니다.</Alert>}
      {event.documentChange === 'SAME_CONTENT' && <Typography variant="caption" color="text.secondary">연결된 문서 내용은 동일합니다. 새 사실과 해석 변경을 구분해서 확인하세요.</Typography>}
      {event.previousInterpretation && <TableContainer sx={{ mt: 1 }}><Table size="small" aria-label={`${event.title} 이전 해석 비교`} sx={{ minWidth: 480, tableLayout: 'fixed' }}><TableHead><TableRow><TableCell>이전 해석</TableCell><TableCell>현재 해석</TableCell></TableRow></TableHead><TableBody><TableRow><TableCell sx={{ verticalAlign: 'top' }}>{event.previousInterpretation}</TableCell><TableCell sx={{ verticalAlign: 'top' }}>{event.interpretation}</TableCell></TableRow></TableBody></Table></TableContainer>}
    </Box>
  </Stack>;
}
