import { describe, expect, it } from 'vitest';
import formatDateTime from './formatDateTime';

describe('formatDateTime', () => {
  it('날짜만 있으면 자정 시각을 붙인다', () => {
    expect(formatDateTime('2026-07-24')).toBe('2026-07-24 00:00:00');
  });

  it('타임존이 있는 시각은 서울 시간으로 표시한다', () => {
    expect(formatDateTime('2026-07-24T09:10:00Z')).toBe('2026-07-24 18:10:00');
  });

  it('값이 없으면 지정한 대체 문구를 표시한다', () => {
    expect(formatDateTime(null, '분석 전')).toBe('분석 전');
  });
});
