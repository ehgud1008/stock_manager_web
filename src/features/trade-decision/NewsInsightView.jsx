import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, Link, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { BusinessResearchView, EventResearchView } from './NewsResearchView';
import SignalInterpretationView from './SignalInterpretationView';

const relation = { SUPPORTS: '엔진 근거 지지', WEAKENS: '엔진 근거 약화', UNRELATED: '직접 관련 낮음', UNCERTAIN: '영향 판단 유보' };
const depth = { TITLE_ONLY: '제목만 확보', SEARCH_SNIPPET: '검색 요약 확보', FILING_TITLE: '공시 접수 목록', OFFICIAL_DOCUMENT: '공시 원문 발췌', OFFICIAL_STRUCTURED: '공식 API 계정 정보' };
const topic = { COMPANY: '기업 뉴스', SECTOR: '관련 업황', DISCLOSURE: '공시', BUSINESS: '사업·재무 기준', ORIGINAL: '공시 원문', PRODUCT: '제품 관련 업황' };
const status = { COLLECTED: '자료 확보', NO_MATCH: '검색 범위 내 자료 미확보', NOT_CONFIGURED: '미설정', FAILED: '조회 실패' };
const engineNames = { QUALITY: '자료 품질', ANALYSIS: '종목 점수·신호', SCREENER: '추세 분석' };
function safeNewsUrl(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : null; } catch { return null; }
}
function SourceLinks({ ids = [], sources }) {
  return <Stack gap={0.5}>{ids.map(id => {
    const source = sources.find(item => item.id === id); if (!source) return null;
    const href = safeNewsUrl(source.url);
    return <Typography key={id} variant="caption">{href ? <Link href={href} target="_blank" rel="noopener noreferrer">[{id}] {source.title}</Link> : `[${id}] ${source.title}`}</Typography>;
  })}</Stack>;
}
export default function NewsInsightView({ result }) {
  const { evidence, report, engine, changes } = result;
  const sources = evidence.sources || [];
  return <Stack gap={2}>
    <Stack direction="row" gap={1} flexWrap="wrap"><Chip label="뉴스·업황 보강 리포트" color="primary" /><Chip label={`출처 ${sources.length}건`} variant="outlined" /></Stack>
    <Typography variant="caption" color="text.secondary">엔진 가격 기준일 {engine.priceDate} · 외부 자료 수집 {new Date(evidence.collectedAt).toLocaleString('ko-KR')} · 검색 기간 {evidence.windowStart} ~ {evidence.windowEnd}</Typography>
    {result.modelSourceIds && <Typography variant="caption" color="text.secondary">수집 {sources.length}건 중 AI 제공 {result.modelSourceIds.length}건 · 공식 자료 우선 · 긴 원문은 관련 문단을 발췌합니다.</Typography>}
    <Alert severity="info">현재 수집한 정보를 저장된 엔진 분석에 보강합니다. 엔진 기준일 이후의 자료가 포함될 수 있으며, 당시 판단이나 백테스트 결과가 아닙니다.</Alert>
    <SignalInterpretationView result={result} />
    <Box><Typography variant="h6">이번 분석에 추가되는 정보</Typography><Typography sx={{ whiteSpace: 'pre-line', my: 1 }}>{report.summary}</Typography><SourceLinks ids={report.summarySourceIds} sources={sources} /></Box>
    <BusinessResearchView result={result} />
    {changes?.previousId ? <Typography variant="body2">이전 리포트 대비 새로 수집된 자료 {changes.newSourceIds.length}건. {changes.meaning}</Typography> : <Typography variant="body2" color="text.secondary">처음 저장된 리포트로 이전 자료와의 비교는 없습니다.</Typography>}
    <Typography variant="body2" color="text.secondary">{evidence.sectorScope === 'USER_QUERY' ? `업황 검색어: ${evidence.sectorQuery} · 사용자가 지정한 검색 범위이며 확인된 업종 분류는 아닙니다.` : '업황은 종목명과 관련된 산업 기사 범위로 검색했습니다. 전체 섹터 시황을 포괄하지 않습니다.'}</Typography>
    {!report.events.length && <Alert severity="warning">현재 자료에서 추가 해석할 핵심 사건을 제시하지 못했습니다. 관련 사건이 없다고 판단한 것은 아닙니다.</Alert>}
    {report.events.map((event, index) => {
      const source = sources.find(item => item.id === event.quoteSourceId);
      return <Stack key={index} gap={1.5} sx={{ border: 1, borderColor: 'divider', p: 2, borderRadius: 2 }}>
        <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center"><Typography fontWeight={700}>{event.title}</Typography><Chip size="small" label={relation[event.engineRelation]} variant="outlined" /></Stack>
        <Box><Typography variant="caption" fontWeight={700}>수집 자료에서 확인한 표현 · {depth[source?.depth]}</Typography>
          <Typography component="blockquote" sx={{ m: 0, mt: 0.5, pl: 1.5, borderLeft: 3, borderColor: 'divider' }}>{event.factQuote}</Typography>
          <Typography variant="caption" color="text.secondary">게시·접수일 {source?.publishedDate || '미확인'} · {source?.eventDate ? `계약체결일 ${source.eventDate}` : '사건 발생일 원문 확인 필요'}</Typography></Box>
        <EventResearchView event={event} evidence={evidence} />
        <Typography variant="body2">종목 연결 근거: {event.relevance}</Typography>
        <TableContainer><Table size="small" aria-label={`${event.title} 엔진과 외부 정보 비교`} sx={{ tableLayout: 'fixed', minWidth: 500 }}>
          <TableHead><TableRow><TableCell sx={{ width: '50%' }}>저장된 엔진 근거</TableCell><TableCell>외부 정보를 반영한 AI 해석</TableCell></TableRow></TableHead>
          <TableBody><TableRow><TableCell sx={{ verticalAlign: 'top', bgcolor: 'action.hover' }}>
            <Typography variant="body2">{event.engineEvidenceIds.length ? event.engineEvidenceIds.map(id => engineNames[id] || id).join(' · ') : '직접 연결할 엔진 근거 미확인'}</Typography>
            {event.engineEvidenceIds.includes('ANALYSIS') && <Typography variant="body2">종합 점수 {engine.evidence?.ANALYSIS?.totalScore ?? '미산출'}</Typography>}
            {event.engineEvidenceIds.includes('SCREENER') && <Typography variant="body2">추세 단계 {engine.evidence?.SCREENER?.stage ?? '미산출'} · 자료 상태 {engine.evidence?.SCREENER?.quality ?? '미확인'}</Typography>}
            <Typography variant="caption" color="text.secondary">가격·신호·시나리오는 종합분석 엔진 결과를 유지합니다.</Typography>
          </TableCell><TableCell sx={{ verticalAlign: 'top', borderLeft: 1, borderLeftColor: 'divider' }}><Typography variant="body2">{event.interpretation}</Typography></TableCell></TableRow></TableBody>
        </Table></TableContainer>
        <Typography variant="body2">영향 경로·가정: {event.impactPath}</Typography>
        <Typography variant="body2">반대 근거·확인하지 못한 조건: {event.counterEvidence}</Typography>
        <SourceLinks ids={event.sourceIds} sources={sources} />
      </Stack>;
    })}
    {!!report.nextChecks.length && <Box><Typography variant="h6">다음에 확인할 정보</Typography>{report.nextChecks.map((check, i) => <Stack key={i} gap={0.5} sx={{ mt: 1.5 }}><Typography fontWeight={600}>{check.what}</Typography><Typography variant="body2">{check.why}</Typography><SourceLinks ids={check.sourceIds} sources={sources} /></Stack>)}</Box>}
    <Alert severity="info">{report.limitations.join(' ')}</Alert>
    <Accordion disableGutters><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography>수집 범위와 출처 전체 보기</Typography></AccordionSummary><AccordionDetails><Stack gap={2}>
      {evidence.coverage.map((item, i) => <Box key={i}><Typography fontWeight={600}>{topic[item.topic]} · {item.provider} · {status[item.status]} ({item.count}건)</Typography><Typography variant="body2">{item.detail}</Typography></Box>)}
      {sources.map(source => <Box key={source.id}><SourceLinks ids={[source.id]} sources={sources} /><Typography variant="caption" color="text.secondary">{source.publisher} · {source.publishedDate || '게시일 미확인'} · {depth[source.depth]} · {source.topics.map(t => topic[t]).join(' / ')}{source.contextOutsideWindow ? ' · 검색 기간 외 사업 기준 자료' : ''}</Typography>{source.excerpt && <Typography variant="body2">{source.excerpt}</Typography>}
        {source.originalStatus === 'UNAVAILABLE_OR_UNSUPPORTED' && <Typography variant="caption" color="warning.main">원문 확보 또는 구조 해석 실패 · 확보 수준에서만 분석</Typography>}
        {!!source.passages?.length && <Accordion disableGutters><AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}><Typography variant="body2">공시 근거 문단 보기</Typography></AccordionSummary><AccordionDetails><Stack gap={1}>{source.passages.map((passage,i) => <Typography key={i} variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{passage}</Typography>)}</Stack></AccordionDetails></Accordion>}
      </Box>)}
    </Stack></AccordionDetails></Accordion>
  </Stack>;
}
