import { Alert, Button, Stack, Typography } from '@mui/material';

const statuses = { VALID: '저장 자료 기준 유효', REVIEW_REQUIRED: '재검토 필요', EXPIRED: '판단 만료', UNVERIFIABLE: '유효기간 확인 불가' };
const reasons = {
  NEW_TRADING_SESSION_COMPLETED: '분석 이후 새 거래일의 장 마감 자료 확인 시점이 지났습니다. 최신 종합분석으로 신호를 다시 확인하세요.',
  SIGNAL_EXPIRED: '저장된 신호의 남은 유효 거래일이 지났습니다.',
  ANALYSIS_EXPIRED: '분석 자료의 최대 검토 기한이 지났습니다.',
  ANALYSIS_FUTURE: '분석 기준 시각이 현재보다 미래입니다.',
  CALENDAR_UNAVAILABLE: '거래일 달력의 적용 범위 또는 분석 가격일을 확인해야 합니다.',
  CALENDAR_CHANGED: '거래일 달력이 변경돼 기존 기한을 다시 확인해야 합니다.',
  SIGNAL_DATA_UNAVAILABLE: '신호의 기준일·경과 봉 수·유효 봉 수를 확인할 수 없습니다.',
  VALIDITY_POLICY_UNAVAILABLE: '이 판단의 유효기간 정책을 확인할 수 없습니다.',
  VALIDITY_DATA_INVALID: '유효기간 계산 자료를 확인할 수 없습니다.',
};
const format = value => value ? new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '확인 불가';

export default function DecisionValidityNotice({ state, busy, onRefreshAnalysis, onReviewResearch, refreshSnapshot }) {
  const validity = state?.data;
  const refreshMethod = validity?.refreshMethod || 'COLLECT';
  return <Stack gap={1} aria-label="판단 유효 상태">
    {!validity && !state?.error && <Typography variant="body2">현재 판단 유효기간을 확인하고 있습니다.</Typography>}
    {state?.error && <Alert severity="warning">현재 유효 상태를 확인하지 못했습니다: {state.error}. 저장된 의견을 최신 판단으로 사용하지 마세요.</Alert>}
    {validity && <Alert severity={validity.status === 'VALID' && !state.error ? 'info' : 'warning'}>
      <Stack gap={1}>
        <Typography fontWeight={600}>{statuses[validity.status] || '유효기간 확인 불가'}</Typography>
        {(validity.reasonCodes || []).map(reason => <Typography key={reason} variant="body2">{reasons[reason] || '자료를 보완한 뒤 새 판단이 필요합니다.'}</Typography>)}
        <Typography variant="body2">검토 기한: {format(validity.validUntil)} · 다음 확인: {validity.requiresAnalysisRefresh ? '지금 재분석 필요' : format(validity.nextReviewAt)}</Typography>
        <Typography variant="body2">경과 거래일: {validity.elapsedTradingDays == null ? '확인 불가' : `${validity.elapsedTradingDays}${validity.elapsedCountCapped ? ' 이상' : ''}`}{validity.signalRemainingTradingDays != null ? ` · 신호 잔여 거래일: ${validity.signalRemainingTradingDays}` : ''}</Typography>
        <Typography variant="caption">한국시간 기준 · 조회 시각 {format(validity.evaluatedAt)}. 저장된 자료의 검토 기한이며 최신 가격·신호를 조회하거나 주문을 허용한 결과는 아닙니다.</Typography>
        {validity.derivedFromLegacy && <Typography variant="caption">이전 판단은 당시 결과를 보존하고 현재 정책에 따른 재검토 안내를 별도로 표시합니다.</Typography>}
        {validity.requiresAnalysisRefresh && <Typography variant="body2">최신 종합분석 수집 → 새 분석의 뉴스·공시 확인 → 새 통합 판단 순서로 다시 검토하세요. 과거 판단과 모의 성과는 유지됩니다.</Typography>}
        {!validity.requiresAnalysisRefresh && validity.requiresResearchRefresh && <Typography variant="body2">연결된 뉴스·공시 근거가 없거나 만료·불충분 상태입니다. 뉴스 리서치를 보완한 후 새 통합 판단을 실행하세요.</Typography>}
      </Stack>
    </Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
      {(validity?.requiresAnalysisRefresh || state?.error) && refreshMethod === 'COLLECT' && <Button variant="outlined" disabled={busy || Boolean(refreshSnapshot)} onClick={onRefreshAnalysis}>최신 종합분석 새로 수집</Button>}
      {validity?.requiresAnalysisRefresh && refreshMethod === 'EOD_RESULTS' && <Button component="a" href="/unified-analysis" target="_blank" rel="noopener noreferrer" variant="outlined">장 마감 종합분석 확인</Button>}
      {validity?.requiresResearchRefresh && !validity?.requiresAnalysisRefresh && onReviewResearch && <Button variant="outlined" onClick={onReviewResearch}>뉴스·공시 보완으로 이동</Button>}
      {refreshSnapshot && <Button component="a" href={`/unified-analysis/stock?snapshot=${encodeURIComponent(refreshSnapshot)}`} target="_blank" rel="noopener noreferrer">새 종합분석 결과 열기</Button>}
    </Stack>
    {validity?.requiresAnalysisRefresh && refreshMethod === 'EOD_RESULTS' && <Typography variant="body2">단일 수집은 전일 종가를 사용합니다. 장 마감 종합분석에서 최신 거래일의 완료 결과를 선택하고 뉴스·공시와 통합 판단을 새로 확인하세요. 당일 결과가 아직 없으면 수집 완료 후 다시 확인하세요.</Typography>}
    {validity?.requiresAnalysisRefresh && refreshMethod === 'CALENDAR_CHECK' && <Alert severity="warning">현재 날짜의 거래일 달력을 확인할 수 없습니다. 달력 적용 범위를 먼저 보완한 뒤 새 분석을 요청하세요.</Alert>}
    {refreshSnapshot && <Typography variant="body2">새 분석 작업을 접수했습니다. 새 화면에서 진행 상태를 확인하고 뉴스·공시를 보완하세요. 통합 판단은 자동 실행하지 않습니다.</Typography>}
  </Stack>;
}
