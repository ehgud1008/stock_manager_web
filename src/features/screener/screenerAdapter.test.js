import { describe, expect, it } from 'vitest';
import { adaptScreenerItem, amountToMillionWon } from './screenerAdapter';
import { DEFAULT_FILTERS, filterScreenerRows } from './screenerModel';
import { itemFixture } from '../../test/screenerFixtures';
describe('server result presentation', () => {
  it('검색 임계값 단위 변환에 부동소수점 오차를 넣지 않는다', () => {
    expect(amountToMillionWon('0.29')).toBe('29');
    expect(amountToMillionWon('123.45')).toBe('12345');
    expect(amountToMillionWon('1e-7')).toBe('0.00001');
    expect(amountToMillionWon('')).toBeNull();
    expect(amountToMillionWon('0')).toBe('0');
  });
  it('백만원을 억원으로 변환하고 판정에 표시 반올림을 사용하지 않는다', () => {
    const row=adaptScreenerItem(itemFixture());
    expect(row.tradingAmount100m).toBe(123.45);
    expect(row.ema[0]).toBe(70300.123456);
    expect(row.stage).toBe(1);
  });
  it('누락된 분봉 거래대금을 0으로 취급하지 않는다', () => {
    const row=adaptScreenerItem(itemFixture('005930','삼성전자',1,{ features:{tradingAmountMillionWon:null} }));
    expect(row.tradingAmount100m).toBeNull();
    expect(filterScreenerRows([row],{...DEFAULT_FILTERS,minAmount:'0'},[],'SWING')).toEqual([]);
  });
  it('시작 미확정 유지기간을 최근 전환으로 추정하지 않는다', () => {
    const row=adaptScreenerItem(itemFixture('005930','삼성전자',1,{barsInStage:2,barsSinceTransition:null,previousDistinctStage:null,stageDurationComplete:false}));
    expect(filterScreenerRows([row],{...DEFAULT_FILTERS,transition:'RECENT'},[],'SWING')).toEqual([]);
  });
});
