import data from './metroMapData.json';

export type MapStation = typeof data.stations[number];
// Clip the legend and black separator without modifying the bundled artwork.
export const mapHeaderHeight = 260;
export const metroMap = {
  ...data,
  height: data.height - mapHeaderHeight,
  stations: data.stations.map((station) => ({ ...station, y: station.y - mapHeaderHeight })),
};

export function stationForCode(code: string): MapStation | undefined {
  return metroMap.stations.find((station) => station.stationCodes.includes(code));
}

export function clampMapOffset(offset: number, viewport: number, content: number): number {
  'worklet';
  return content <= viewport ? (viewport - content) / 2 : Math.min(0, Math.max(viewport - content, offset));
}

// Hit tolerance is in screen points, so taps remain usable at every zoom level.
export function stationAtPoint(
  x: number, y: number, offsetX: number, offsetY: number, displayScale: number,
): MapStation | undefined {
  if (displayScale <= 0) return undefined;
  let nearest: MapStation | undefined;
  let distance = 24;
  for (const station of metroMap.stations) {
    const candidateDistance = Math.hypot(
      station.x * displayScale + offsetX - x,
      station.y * displayScale + offsetY - y,
    );
    if (candidateDistance < distance) {
      nearest = station;
      distance = candidateDistance;
    }
  }
  return nearest;
}
