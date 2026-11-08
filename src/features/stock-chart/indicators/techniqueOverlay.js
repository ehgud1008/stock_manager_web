import { registerOverlay } from 'klinecharts';

let registered = false;
export function ensureTechniqueOverlayRegistered() {
  if (registered) return;
  registerOverlay({
    name: 'techniqueZone', totalStep: 3,
    needDefaultPointFigure: false, needDefaultXAxisFigure: false, needDefaultYAxisFigure: false,
    createPointFigures: ({ coordinates, bounding, overlay }) => {
      if (coordinates.length < 2) return [];
      const top = Math.min(coordinates[0].y, coordinates[1].y);
      const bottom = Math.max(coordinates[0].y, coordinates[1].y);
      const { color, label } = overlay.extendData;
      return [
        { type: 'rect', attrs: { x: 0, y: top, width: bounding.width, height: Math.max(1, bottom - top) },
          styles: { style: 'fill', color: `${color}18` }, ignoreEvent: true },
        ...[top, bottom].map((y) => ({ type: 'line',
          attrs: { coordinates: [{ x: 0, y }, { x: bounding.width, y }] },
          styles: { color, size: 1, style: 'dashed', dashedValue: [4, 4] }, ignoreEvent: true })),
        { type: 'text', attrs: { x: 8, y: top - 2, text: label, baseline: 'bottom' },
          styles: { color, size: 10, backgroundColor: '#0B1018' }, ignoreEvent: true },
      ];
    },
  });
  registered = true;
}
