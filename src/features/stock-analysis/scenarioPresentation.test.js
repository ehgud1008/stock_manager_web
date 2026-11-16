import { describe, expect, it } from 'vitest';
import { entryReasonForDisplay, scenarioForDisplay, targetLineLabel, targetPriceLabel } from './scenarioPresentation';

describe('saved target basis', () => {
  it('explains failed v3 B exceptions without changing historical v2 policy wording', () => {
    const reason = '점수 외 진입 조건 충족 · B등급은 운영 신규 진입 대상이 아닙니다.';
    const assessment = { policyVersion: 'new-entry-v3-tier', suitability: { tier: 'B' }, status: 'WATCH', timing: { status: 'ELIGIBLE' } };
    expect(entryReasonForDisplay(reason, assessment)).toContain('B등급 예외 진입 기준을 모두 충족하지 못했습니다.');
    expect(entryReasonForDisplay(reason, { ...assessment, policyVersion: 'new-entry-v2-tier' })).toBe(reason);
  });
  it('does not infer resistance or projections from historical price numbers', () => {
    const original = { targets: [120, 135] };
    expect(scenarioForDisplay(original)).toBe(original);
    expect(targetPriceLabel(original)).toBe('목표가');
    const projected = scenarioForDisplay(original, ['SYNTHETIC_TARGET: saved reason']);
    expect(projected.targetBasis).toBe('STRUCTURAL_RISK_MULTIPLE');
    expect(original.targetBasis).toBeUndefined();
    expect(targetLineLabel(projected, 1)).toBe('가정 목표 2');
  });
  it('uses recorded metadata before the historical marker and preserves observed labels', () => {
    const scenario = { targets: [120], targetBasis: 'OBSERVED_RESISTANCE' };
    expect(scenarioForDisplay(scenario, ['SYNTHETIC_TARGET: ignored'])).toBe(scenario);
    expect(targetPriceLabel(scenario)).toBe('관측 저항 목표가');
    expect(targetLineLabel(scenario, 0)).toBe('관측 목표 1');
  });
});
