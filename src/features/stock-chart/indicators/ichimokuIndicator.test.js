import { describe, expect, it, vi } from 'vitest';
import {
  calculateIchimoku,
  drawIchimoku,
  ICHIMOKU_DISPLACEMENT,
} from './ichimokuIndicator';

const candles = Array.from({ length: 100 }, (_, index) => ({
  high: index + 10,
  low: index,
  close: index + 5,
}));

describe('일목균형표', () => {
  it('9·26·52 기간과 26칸 이동을 적용한다', () => {
    const result = calculateIchimoku(candles);

    expect(result[7].tenkan).toBeUndefined();
    expect(result[8].tenkan).toBe(9);
    expect(result[25].kijun).toBe(17.5);
    expect(result[25 + ICHIMOKU_DISPLACEMENT].spanA).toBe(21.75);
    expect(result[51 + ICHIMOKU_DISPLACEMENT].spanB).toBe(30.5);
    expect(result[0].chikou).toBe(31);
    expect(result.at(-1).chikou).toBeUndefined();
  });

  it('선행스팬 구름과 다섯 개 선을 캔버스에 그린다', () => {
    const ctx = {
      save: vi.fn(),
      beginPath: vi.fn(),
      rect: vi.fn(),
      clip: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      restore: vi.fn(),
    };

    const drawn = drawIchimoku({
      ctx,
      indicator: { result: calculateIchimoku(candles) },
      bounding: { width: 1000, height: 500 },
      xAxis: { convertToPixel: (index) => index * 5 },
      yAxis: { convertToPixel: (value) => 500 - value },
    });

    expect(drawn).toBe(true);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalledTimes(5);
    expect(ctx.restore).toHaveBeenCalledOnce();
  });
});
