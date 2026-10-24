import { describe, expect, it } from 'vitest';
import { summarizeSignals, entryExplanation } from './signalPresentation';

const signal = { side: 'BUY', type: 'BREAKOUT', state: 'CONFIRMED', entryStatus: 'IN_RANGE' };
const summarize = (signals, fields = {}) => summarizeSignals({ completeness: 'READY', positionScope: 'UNKNOWN', signals, ...fields });

describe('signal presentation (does not alter engine decisions)', () => {
  it('distinguishes new confirmation, active signals and preliminary signals', () => {
    expect(summarize([signal]).buy.label).toBe('매수 신호 발생 확인');
    expect(summarize([{ ...signal, state: 'ACTIVE' }]).buy.label).toBe('기존 매수 신호 유효');
    expect(summarize([{ ...signal, state: 'PRELIMINARY' }]).entry.label).toBe('확정 매수 신호 대기');
  });
  it.each(['EXPIRED', 'INVALIDATED'])('does not treat %s as current confirmation', state => {
    expect(summarize([{ ...signal, state }]).buy.label).toBe('매수 신호 없음');
  });
  it.each(['CHASE_BLOCKED', 'OUTSIDE_ENTRY_ZONE', 'SCENARIO_UNAVAILABLE', 'AWAIT_CLOSE', 'INACTIVE', 'FUTURE_UNKNOWN'])('does not present %s as entry eligible', entryStatus => {
    expect(summarize([{ ...signal, entryStatus }]).entry.color).toBe('warning');
  });
  it('gives conflict priority over an in-range buy', () => {
    expect(summarize([signal, { ...signal, entryStatus: 'SELL_SIGNAL_CONFLICT' }]).entry.color).toBe('error');
    expect(summarize([signal, { ...signal, side: 'SELL' }]).entry.color).toBe('error');
  });
  it('never makes missing data or absent report look like no risk', () => {
    expect(summarizeSignals(null).buy.label).toBe('판정 보류');
    expect(summarize([signal], { completeness: 'INSUFFICIENT_DATA' }).entry.label).toBe('판정 보류');
    expect(summarize([], { completeness: 'INSUFFICIENT_DATA' }).sell.label).toBe('판정 보류');
  });
  it('preserves stop and take-profit events even without enough pattern data', () => {
    expect(summarize([{ ...signal, side: 'SELL', type: 'POSITION_STOP' }], { completeness: 'INSUFFICIENT_DATA', positionScope: 'HELD' }).sell.label).toBe('매도 신호 확정');
    const result = summarize([{ ...signal, side: 'TAKE_PROFIT', type: 'TARGET_REACHED' }], { completeness: 'INSUFFICIENT_DATA' });
    expect(result.sell.label).toBe('익절 조건 도달');
    expect(result.entry.label).toBe('판정 보류');
  });
  it('does not imply an unheld stock should be sold', () => {
    expect(summarize([{ ...signal, side: 'SELL' }], { positionScope: 'NOT_HELD' }).sell.label).toBe('진입 회피 신호 확정');
  });
});

describe('진입 보류 설명', () => {
  it('비나텍 사례의 상한 초과율을 분석 가격으로 계산한다', () => {
    const text = entryExplanation({ entryStatus: 'CHASE_BLOCKED', entryTo: 92639.285714285 }, 108700);
    expect(text).toContain('108,700원');
    expect(text).toContain('92,639원보다 17.3% 높습니다');
  });
  it.each([null, undefined, '', NaN, 0])('비교 가격 %s가 없으면 초과율을 만들지 않는다', price => {
    expect(entryExplanation({ entryStatus: 'CHASE_BLOCKED', entryTo: 100 }, price)).toContain('초과율은 표시하지 않습니다');
  });
  it('하한 미달과 상한 초과를 구분한다', () => {
    expect(entryExplanation({ entryStatus: 'OUTSIDE_ENTRY_ZONE', entryFrom: 100 }, 90)).toContain('10.0% 낮습니다');
  });
  it('진입 상태가 섞이면 전체 진입 가능으로 요약하지 않는다', () => {
    const result = summarize([signal, { ...signal, type: 'PULLBACK_RECOVERY', entryStatus: 'CHASE_BLOCKED' }]);
    expect(result.entry.label).toBe('신호별 진입 상태가 다름');
    expect(result.entry.description).toContain('구간 내: 돌파 확인');
    expect(result.entry.description).toContain('보류·확인 필요: 눌림 회복');
  });
});
