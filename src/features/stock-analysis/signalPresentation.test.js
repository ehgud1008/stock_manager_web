import { describe, expect, it } from 'vitest';
import { summarizeSignals } from './signalPresentation';

const signal = { side: 'BUY', type: 'BREAKOUT', state: 'CONFIRMED', entryStatus: 'IN_RANGE' };
const summarize = (signals, fields = {}) => summarizeSignals({ completeness: 'READY', positionScope: 'UNKNOWN', signals, ...fields });

describe('signal presentation (does not alter engine decisions)', () => {
  it('distinguishes new confirmation, active signals and preliminary signals', () => {
    expect(summarize([signal]).buy.label).toBe('매수 신호 확정');
    expect(summarize([{ ...signal, state: 'ACTIVE' }]).buy.label).toBe('매수 신호 유지');
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
