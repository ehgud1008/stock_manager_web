export const SIGNAL_TYPES = {
  BREAKOUT: '돌파 확인', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '돌파 재지지',
  TREND_BREAKDOWN: '추세 훼손', BREAKOUT_FAILURE: '돌파 실패', POSITION_STOP: '손절', TARGET_REACHED: '익절 조건 도달',
};

export const ENTRY_LABELS = {
  IN_RANGE: '분석 시점 진입 구간 내', CHASE_BLOCKED: '현재 추격 진입 보류',
  OUTSIDE_ENTRY_ZONE: '현재 진입 구간 이탈', SCENARIO_UNAVAILABLE: '목표 시나리오 미확정 · 진입 보류',
  AWAIT_CLOSE: '봉 완료 확인 대기', SELL_SIGNAL_CONFLICT: '매도 신호와 충돌 · 신규 진입 보류',
  INACTIVE: '현재 유효하지 않은 신호',
};

export const isLiveSignal = signal => ['CONFIRMED', 'ACTIVE'].includes(signal.state);

const card = (label, color, description) => ({ label, color, description });
const patterns = signals => [...new Set(signals.map(signal => SIGNAL_TYPES[signal.type] || signal.type))].join(' · ');

// Presentation only: never infer a buy signal from the score or price alone.
export function summarizeSignals(report) {
  const signals = report?.signals || [];
  const buys = signals.filter(signal => signal.side === 'BUY' && isLiveSignal(signal));
  const sells = signals.filter(signal => signal.side === 'SELL' && isLiveSignal(signal));
  const profits = signals.filter(signal => signal.side === 'TAKE_PROFIT' && isLiveSignal(signal));
  const preliminary = side => signals.some(signal => signal.side === side && signal.state === 'PRELIMINARY');
  const ready = report?.completeness === 'READY';
  const unavailable = card('판정 보류', 'warning', report ? '패턴 판단에 필요한 데이터가 부족합니다.' : '이 결과에는 신호 분석 정보가 없습니다.');
  const buy = !ready ? unavailable : buys.length
    ? card(buys.some(signal => signal.state === 'CONFIRMED') ? '매수 신호 확정' : '매수 신호 유지', 'success', patterns(buys))
    : preliminary('BUY') ? card('매수 예비 신호', 'warning', '조건 형성 중 · 확정 신호가 아닙니다.')
      : card('매수 신호 없음', 'info', '정의된 매수 조건을 충족하지 않았습니다.');
  const sellLabel = report?.positionScope === 'HELD' ? '매도 신호' : report?.positionScope === 'NOT_HELD' ? '진입 회피 신호' : '보유 시 매도 신호';
  const sell = sells.length ? card(`${sellLabel} ${sells.some(signal => signal.state === 'CONFIRMED') ? '확정' : '유지'}`, 'error', patterns(sells))
    : profits.length ? card('익절 조건 도달', 'warning', '입력한 보유 목표가의 가격 접촉 기록입니다.')
      : !ready ? unavailable : preliminary('SELL') ? card(`${sellLabel} 예비`, 'warning', '조건 형성 중 · 확정 신호가 아닙니다.')
        : card('매도 신호 없음', 'info', '매도 신호가 없다는 뜻이며 안전을 보장하지 않습니다.');
  let entry;
  if (sells.length || buys.some(signal => signal.entryStatus === 'SELL_SIGNAL_CONFLICT')) {
    entry = card('신규 진입 보류', 'error', '매도 조건이 확인됐습니다. 매수 신호가 있어도 충돌 여부를 먼저 확인하세요.');
  } else if (!ready) entry = unavailable;
  else if (!buys.length) entry = card('확정 매수 신호 대기', 'info', '점수가 높아도 매수 신호 확정과는 별개입니다.');
  else if (buys.some(signal => signal.entryStatus === 'IN_RANGE')) {
    entry = card('진입 구간 내 · 검토 가능', 'success', '구간 내 매수 신호가 있습니다. 손익비·손절가와 다른 신호의 제한도 확인하세요.');
  } else {
    const statuses = [...new Set(buys.map(signal => ENTRY_LABELS[signal.entryStatus] || '진입 상태 확인 필요'))];
    entry = card('매수 신호는 있으나 진입 보류', 'warning', statuses.join(' · '));
  }
  return { buy, sell, entry };
}
