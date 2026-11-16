export const TARGET_BASIS = {
  OBSERVED: 'OBSERVED_RESISTANCE',
  SYNTHETIC: 'STRUCTURAL_RISK_MULTIPLE',
};

export function scenarioForDisplay(scenario, warnings = []) {
  if (!scenario || scenario.targetBasis) return scenario;
  // Older v7 snapshots have an explicit marker, but no structured basis field.
  return warnings.some(text => typeof text === 'string' && text.startsWith('SYNTHETIC_TARGET:'))
    ? { ...scenario, targetBasis: TARGET_BASIS.SYNTHETIC } : scenario;
}

export function targetPriceLabel(scenario) {
  if (scenario?.targetBasis === TARGET_BASIS.SYNTHETIC) return '가정 목표가';
  if (scenario?.targetBasis === TARGET_BASIS.OBSERVED) return '관측 저항 목표가';
  return '목표가';
}

export function targetLineLabel(scenario, index) {
  const prefix = scenario?.targetBasis === TARGET_BASIS.SYNTHETIC ? '가정 목표'
    : scenario?.targetBasis === TARGET_BASIS.OBSERVED ? '관측 목표' : '목표';
  return `${prefix} ${index + 1}`;
}

export const readableWarning = text => text?.startsWith('SYNTHETIC_TARGET:')
  ? text.slice('SYNTHETIC_TARGET:'.length).trim() : text;

export function entryReasonForDisplay(text, assessment) {
  // Stored v3 reasons used the older blanket B-tier rejection wording.
  const additionalBCheckFailed = assessment?.policyVersion?.startsWith('new-entry-v3-tier')
    && assessment.suitability?.tier === 'B' && assessment.status === 'WATCH'
    && assessment.timing?.status === 'ELIGIBLE';
  return additionalBCheckFailed
    ? text.replace('B등급은 운영 신규 진입 대상이 아닙니다.', 'B등급 예외 진입 기준을 모두 충족하지 못했습니다.')
    : text;
}
