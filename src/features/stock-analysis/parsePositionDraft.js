export function parsePositionDraft(draft) {
  if (draft.scope === 'UNKNOWN') return null;
  if (draft.scope === 'NOT_HELD') return { held: false };
  const positive = text => text !== '' && Number.isFinite(Number(text)) && Number(text) > 0;
  if (!draft.openedAt || !positive(draft.entryPrice)) throw new Error('한국시간 진입 시각과 양수인 매수가를 입력하세요.');
  const opened = new Date(`${draft.openedAt}:00+09:00`);
  if (Number.isNaN(opened.getTime()) || opened.getTime() > Date.now()) throw new Error('진입 시각은 현재 이전이어야 합니다.');
  if (draft.stopPrice && !positive(draft.stopPrice)) throw new Error('손절가는 양수여야 합니다.');
  const targets = (draft.targets || '').split(',').map(s => s.trim()).filter(Boolean);
  if (targets.length > 5 || targets.some(t => !positive(t) || Number(t) <= Number(draft.entryPrice)))
    throw new Error('목표가는 매수가보다 큰 양수로 최대 5개까지 입력하세요.');
  return { held: true, openedAt: opened.toISOString(), entryPrice: Number(draft.entryPrice),
    stopPrice: draft.stopPrice ? Number(draft.stopPrice) : null, targets: targets.map(Number), stopPolicy: draft.stopPolicy };
}
