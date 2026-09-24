import { describe, it, expect } from 'vitest';
import { parsePositionDraft } from './parsePositionDraft';
const draft = { scope: 'HELD', openedAt: '2020-01-02T10:30', entryPrice: '100', stopPrice: '90', targets: '120, 130', stopPolicy: 'CLOSE' };
describe('보유 입력', () => {
  it('미확인과 미보유를 구분한다', () => {
    expect(parsePositionDraft({ scope: 'UNKNOWN' })).toBeNull();
    expect(parsePositionDraft({ scope: 'NOT_HELD' })).toEqual({ held: false });
  });
  it('한국시간을 UTC로 변환하며 가격을 숫자로 전달한다', () => {
    expect(parsePositionDraft(draft)).toEqual({ held: true, openedAt: '2020-01-02T01:30:00.000Z', entryPrice: 100, stopPrice: 90, targets: [120, 130], stopPolicy: 'CLOSE' });
  });
  it.each([{ entryPrice: '-1' }, { openedAt: '' }, { openedAt: '2999-01-02T10:30' }, { stopPrice: '-1' }, { targets: '90' }, { targets: '101,102,103,104,105,106' }])('잘못된 입력을 거부한다', invalid => {
    expect(() => parsePositionDraft({ ...draft, ...invalid })).toThrow();
  });
  it('선택 가격을 임의로 채우지 않는다', () => {
    expect(parsePositionDraft({ ...draft, stopPrice: '', targets: '' })).toMatchObject({ stopPrice: null, targets: [] });
  });
});
