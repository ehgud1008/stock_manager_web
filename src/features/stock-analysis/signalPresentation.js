export const SIGNAL_TYPES = {
  BREAKOUT: '돌파 확인', PULLBACK_RECOVERY: '눌림 회복', BREAKOUT_RETEST: '돌파 재지지',
  TREND_BREAKDOWN: '추세 훼손', BREAKOUT_FAILURE: '돌파 실패', POSITION_STOP: '손절', TARGET_REACHED: '익절 조건 도달',
};

export const ENTRY_LABELS = {
  IN_RANGE: '분석 시점 진입 구간 내', CHASE_BLOCKED: '진입 상한 초과 · 추격 보류',
  OUTSIDE_ENTRY_ZONE: '진입 하한 미달 · 구간 밖', SCENARIO_UNAVAILABLE: '목표 시나리오 미확정 · 진입 보류',
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
    ? card(buys.some(signal => signal.state === 'CONFIRMED') ? '매수 신호 발생 확인' : '기존 매수 신호 유효', 'info', patterns(buys) + ' · 발생 기록의 유효 상태이며 신규 진입 허용과는 별개입니다.')
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
    const eligible = buys.filter(signal => signal.entryStatus === 'IN_RANGE');
    const restricted = buys.filter(signal => signal.entryStatus !== 'IN_RANGE');
    entry = restricted.length
      ? card('신호별 진입 상태가 다름', 'warning', `구간 내: ${patterns(eligible)}. 보류·확인 필요: ${patterns(restricted)}. 각 신호의 발생일과 제한을 확인하세요.`)
      : card('신호 가격 구간 내', 'info', `${patterns(eligible)} · 가격 구간 조건만 충족했습니다. 손익비·시장 조건과 장마감 최종 선정은 별도 판단입니다.`);
  } else {
    const statuses = [...new Set(buys.map(signal => ENTRY_LABELS[signal.entryStatus] || '진입 상태 확인 필요'))];
    entry = card('매수 신호는 있으나 진입 보류', 'warning', statuses.join(' · '));
  }
  return { buy, sell, entry };
}

export const SIGNAL_STATE_HELP = {
  PRELIMINARY: '봉 완료 전 조건입니다. 아직 발생이 확정되지 않았습니다.',
  CONFIRMED: '발생일의 완료 봉에서 패턴 조건을 확인했습니다. 지금 매수하라는 뜻은 아닙니다.',
  ACTIVE: '발생한 신호가 아직 무효화·만료되지 않았습니다. 발생 조건 전체를 지금도 충족한다는 뜻은 아닙니다.',
  INVALIDATED: '발생 이후 무효화 조건에 해당했습니다. 현재 진입 근거로 사용하지 않습니다.',
  EXPIRED: '설정된 유효기간이 끝났습니다. 현재 진입 근거로 사용하지 않습니다.',
};

const positive = value => value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
const won = value => `${Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`;
export function entryExplanation(signal, analysisPrice) {
  const current = Number(analysisPrice);
  if (signal.entryStatus === 'CHASE_BLOCKED') {
    if (positive(analysisPrice) && positive(signal.entryTo) && current > Number(signal.entryTo)) {
      const excess = ((current / Number(signal.entryTo) - 1) * 100).toFixed(1);
      return `분석 가격 ${won(current)}은 발생 당시 진입 상한 ${won(signal.entryTo)}보다 ${excess}% 높습니다. 갭 상승 여부와는 별도 판정입니다.`;
    }
    return '발생 당시 진입 상한을 초과한 것으로 판정됐습니다. 비교 가격을 확인할 수 없어 초과율은 표시하지 않습니다.';
  }
  if (signal.entryStatus === 'OUTSIDE_ENTRY_ZONE') {
    if (positive(analysisPrice) && positive(signal.entryFrom) && current < Number(signal.entryFrom)) {
      const gap = ((1 - current / Number(signal.entryFrom)) * 100).toFixed(1);
      return `분석 가격 ${won(current)}은 발생 당시 진입 하한 ${won(signal.entryFrom)}보다 ${gap}% 낮습니다. 가격 하락만으로 진입 가능으로 바뀌지 않습니다.`;
    }
    return '발생 당시 진입 하한보다 낮은 것으로 판정됐습니다. 지지와 신호 유효성을 별도로 확인해야 합니다.';
  }
  return {
    IN_RANGE: '해당 신호의 가격 구간 조건을 충족했습니다. 손익비·시장 조건·최종 선정까지 통과했다는 뜻은 아닙니다.',
    SCENARIO_UNAVAILABLE: '현재 분석에서 목표·손절 시나리오를 확보하지 못해 진입 판단을 보류합니다.',
    SELL_SIGNAL_CONFLICT: '유효 매도 신호가 함께 있어 매수 가격 구간 안이어도 신규 진입을 보류합니다.',
    AWAIT_CLOSE: '봉이 완료되기 전까지 확정된 진입 근거로 사용하지 않습니다.',
    INACTIVE: '무효화되거나 만료된 신호입니다. 표시된 구간은 과거 발생 당시 기록입니다.',
  }[signal.entryStatus] || '진입 상태를 확인할 수 없습니다. 진입 가능으로 해석하지 마세요.';
}
