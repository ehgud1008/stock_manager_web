import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Divider, LinearProgress, Stack, Typography } from '@mui/material';
import { getDecisionRecheck } from '../../api/tradeDecisionApi';

const number = value => value == null ? '확인 불가' : Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
const time = value => value ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '확인 불가';
const comparison = { CHANGED: '변경됨 · 새 판단 필요', UNCHANGED: '등록값 동일', UNKNOWN: '비교 불가' };
const ranges = { WITHIN: '저장 진입 구간 내', BELOW: '저장 진입 구간 미만', ABOVE: '저장 진입 구간 초과', UNVERIFIABLE: '진입 구간 비교 불가' };
const sizingReasons = {
  PRICE_UNAVAILABLE: '가격 조회 실패로 수량을 재계산할 수 없습니다.', ACTION_NOT_SIZED: '저장 의견은 수량 재계산 대상이 아닙니다.',
  LEGACY_POLICY_REQUIRES_NEW_DECISION: '이전 수량 정책의 판단입니다. 기존 정책과 결과를 보존하며 새 판단이 필요합니다.',
  POSITION_ACTION_CHANGED: '현재 보유 상태가 저장 의견과 달라 새 판단이 필요합니다.',
  ACCOUNT_RISK_MISSING: '계좌 위험 설정을 등록하세요.', ACCOUNT_RISK_UNAVAILABLE: '계좌 위험 설정 조회에 실패했습니다.',
  ACCOUNT_RISK_STALE: '계좌 금액 확인일을 오늘 기준으로 확인하세요.', ACCOUNT_RISK_INVALID: '계좌 금액·비중을 확인하세요.',
  POSITION_UNKNOWN: '등록 보유정보 조회에 실패했습니다.', POSITION_UNCONFIRMED: '해당 종목의 보유 수량 또는 명시적 미보유 등록을 확인하세요.',
  POSITION_STALE: '등록 보유정보를 오늘 기준으로 확인하세요.', PLAN_INVALID: '저장 가격 계획을 확인할 수 없습니다. 재분석이 필요합니다.',
  STOP_REFERENCE_BREACHED: '조회 가격이 손절 참고선 이하입니다. 최신 분석으로 청산 조건을 검토하세요.',
  ZERO_CAPACITY: '현재 등록 한도 내에서 매수할 수 있는 수량은 0주입니다.',
  NO_REDUCTION_NEEDED: '현재 등록 한도 초과분이 없습니다. 익절 비율은 적용하지 않습니다.',
  FULL_EXIT_REVIEW_REQUIRED: '전량 축소가 필요하므로 별도 청산 검토가 필요합니다.',
};

export default function DecisionRecheckView({ decisionId }) {
  const [state, setState] = useState(null); const active = useRef(null);
  useEffect(() => () => { active.current?.abort(); active.current = null; }, [decisionId]);
  const read = async () => {
    if (active.current) return;
    const c = new AbortController(); active.current = c;
    setState({ id: decisionId, loading: true });
    try {
      const data = await getDecisionRecheck(decisionId, c.signal);
      if (!c.signal.aborted) setState({ id: decisionId, data });
    } catch (e) { if (!c.signal.aborted) setState({ id: decisionId, error: e.message }); }
    finally { if (active.current === c) active.current = null; }
  };
  const current = state?.id === decisionId ? state : null; const data = current?.data;
  return <Stack gap={1.2} aria-label="최신 조건 재확인">
    <Divider /><Typography fontWeight={600}>최신 조건 재확인</Typography>
    <Typography variant="body2">저장 판단과 분리된 조회입니다. 버튼을 누르면 가격·현재 등록정보를 조회합니다. AI 재호출·주문·잔고 변경은 실행하지 않습니다.</Typography>
    <Button variant="outlined" disabled={current?.loading} onClick={read}>최신 조건 다시 확인</Button>
    {current?.loading && <LinearProgress aria-label="최신 조건 조회 중" />}
    {current?.error && <Alert severity="warning">최신 조건 조회 실패: {current.error}. 이전 재확인 결과를 현재 조건으로 사용하지 마세요.</Alert>}
    {data && <>
      <Alert severity="warning">일부 조건만 확인했습니다. 주문 가능 판정이 아닙니다. 가격의 거래소 기준 시각·시세 신선도, 호가 단위·가격 제한 적합성, 증권사 실제 잔고는 확인 불가입니다.</Alert>
      <Typography variant="caption">현재 가격 조회 경로에는 거래소 기준 시각이 없고, 시장·상품별 공식 호가 규칙도 연결되어 있지 않습니다.</Typography>
      <Typography variant="body2">조회 가격 {number(data.price?.value)}원 · {ranges[data.price?.entryRangeStatus] || '비교 불가'} · 저장 구간 {number(data.price?.entryFrom)}~{number(data.price?.entryTo)}원</Typography>
      <Typography variant="caption">가격 출처: 키움 종목 기본정보 · 서버 조회 시각 {time(data.price?.checkedAt)} · 거래소 가격 기준 시각 {time(data.price?.sourceAsOf)} · 저장 가격일 {data.price?.savedPriceDate || '미확인'}</Typography>
      <Typography variant="caption">가격 비교는 숫자 기준 참고입니다. 저장된 수정주가와 조회 가격 사이의 권리락·분할 등 가격 기준 일치는 확인하지 못했습니다.</Typography>
      {data.price?.status !== 'AVAILABLE' && <Alert severity="warning">{data.price?.status === 'UNAVAILABLE' ? '가격 조회에 실패했습니다.' : '가격 또는 응답 종목을 확인할 수 없습니다.'}</Alert>}
      {data.price?.stopReferenceStatus === 'BREACHED' && <Alert severity="warning">조회 가격이 손절 참고선 {number(data.price.stopReference)}원 이하입니다. 최신 분석으로 청산 조건을 검토하세요. 실제 손절 체결을 뜻하지 않습니다.</Alert>}
      <Typography variant="body2">보유정보 (수동 등록): {comparison[data.holding?.comparison] || '비교 불가'} · 당시 {number(data.holding?.saved?.quantity)}주 → 현재 등록 {number(data.holding?.current?.quantity)}주</Typography>
      <Typography variant="caption">보유 버전 {data.holding?.saved?.revision ?? '미확인'} → {data.holding?.current?.revision ?? '미확인'} · 현재 기준일 {data.holding?.current?.balanceDate || '미등록/조회 실패'} · 조회 {time(data.holding?.checkedAt)}</Typography>
      <Typography variant="body2">계좌 설정 (수동 입력): {comparison[data.accountRisk?.comparison] || '비교 불가'} · 버전 {data.accountRisk?.saved?.revision ?? '미확인'} → {data.accountRisk?.current?.revision ?? '미확인'}</Typography>
      {['totalAssets', 'availableCash', 'maxLossPerTrade', 'maxPositionPercent'].map((field, i) => <Typography variant="body2" key={field}>{['총자산', '가용 현금', '허용 손실', '종목 최대 비중'][i]}: {number(data.accountRisk?.saved?.[field])} → {number(data.accountRisk?.current?.[field])}{i === 3 ? '%' : '원'}</Typography>)}
      <Typography variant="caption">계좌 현재 기준일 {data.accountRisk?.current?.balanceDate || '미등록/조회 실패'} · 조회 {time(data.accountRisk?.checkedAt)}</Typography>
      <Typography variant="body2">저장 검토 수량 {number(data.sizing?.savedQuantity)}주 · 현재 등록정보 기준 참고 수량 {number(data.sizing?.indicativeQuantity)}주</Typography>
      {data.sizing?.status !== 'READY' && <Alert severity="info">{sizingReasons[data.sizing?.status] || '자료 부족으로 수량 한도를 확인할 수 없습니다.'}</Alert>}
      {data.sizing?.current?.existingExposure != null && <Typography variant="body2">조회 가격 기준 기존 보유 평가액 {number(data.sizing.current.existingExposure)}원 · 손절 참고선까지의 계획 위험 {number(data.sizing.current.existingStopRisk)}원</Typography>}
      {['BUY', 'ADD'].includes(data.sizing?.action) && data.sizing?.current?.cashLimitQuantity != null && <Typography variant="body2">매수 한도: 현금 {number(data.sizing.current.cashLimitQuantity)}주 · 손실 {number(data.sizing.current.riskLimitQuantity)}주 · 비중 {number(data.sizing.current.weightLimitQuantity)}주</Typography>}
      <Typography variant="caption">진입 가격 계획과 비용 가정은 저장 당시 값을 유지하고, 기존 보유 평가에는 조회 가격을 사용합니다. 구간 밖 가격·만료된 신호는 이 계산으로 유효해지지 않습니다. 다른 판단의 현금 예약을 반영하지 않습니다.</Typography>
      {data.requiresAnalysisRefresh && <Alert severity="warning">가격 구간·신호 유효기간 또는 손절 조건을 다시 분석해야 합니다. 최신 종합분석 → 뉴스·공시 확인 → 새 통합 판단 순서로 진행하세요.</Alert>}
      {data.requiresNewDecision && <Alert severity="info">등록정보·수량·자료 조건이 달라졌거나 확인이 부족합니다. 필요한 정보를 보완한 뒤 새 판단을 명시적으로 실행하세요. 기존 판단은 유지됩니다.</Alert>}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
        <Button component="a" href="/unified-analysis">최신 종합분석으로 이동</Button>
        <Button component="a" href="/holdings">등록 보유정보 확인</Button>
        <Button component="a" href="/settings#account-risk">계좌 위험 설정 확인</Button>
      </Stack>
      <Typography variant="caption">재확인 완료 {time(data.evaluatedAt)} (한국시간). 조회 후 조건이 달라질 수 있습니다.</Typography>
    </>}
  </Stack>;
}
