export const defaultPreferences = { aggressive: 20, balanced: 60, conservative: 20, monitoring: 'DAILY', entryPreference: 'CONFIRMED', volatilityTolerance: 'MODERATE', lossResponse: 'STRUCTURAL' };
export const presets = {
  aggressive: { aggressive: 70, balanced: 20, conservative: 10, entryPreference: 'EARLY', volatilityTolerance: 'HIGH', lossResponse: 'QUICK' },
  balanced: { aggressive: 20, balanced: 60, conservative: 20, entryPreference: 'CONFIRMED', volatilityTolerance: 'MODERATE', lossResponse: 'STRUCTURAL' },
  conservative: { aggressive: 10, balanced: 20, conservative: 70, entryPreference: 'CONFIRMED', volatilityTolerance: 'LOW', lossResponse: 'QUICK' },
};
export const normalizePreferences = preferences => ({ ...defaultPreferences, ...preferences });
export const preferencesValid = preferences => ['aggressive', 'balanced', 'conservative'].every(key => Number.isInteger(preferences[key]) && preferences[key] >= 0 && preferences[key] <= 100)
  && preferences.aggressive + preferences.balanced + preferences.conservative === 100;
export const sameDecisionContext = (a, b) => a?.positionStatus === b.positionStatus && (a?.horizonTradingDays ?? null) === b.horizonTradingDays
  && Number(a?.averageBuyPrice || 0) === Number(b.averageBuyPrice || 0) && (a?.purchasedOn || '') === (b.purchasedOn || '')
  && Object.keys(defaultPreferences).every(key => normalizePreferences(a?.preferences)[key] === normalizePreferences(b.preferences)[key]);
