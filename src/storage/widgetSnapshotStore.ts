import { ExtensionStorage } from '@bacons/apple-targets';
import { File, Paths } from 'expo-file-system';

import { TrainPrediction } from '../api/metrolensApi';

export type WidgetPrediction = {
  destinationName: string;
  line: string | null;
  minutes: number | 'ARR' | 'BRD' | null;
  rawMinutes: string | null;
};

export type StationWidgetSnapshot = {
  stationCode: string;
  stationCodes: string[];
  stationName: string;
  lines: string[];
  predictions: WidgetPrediction[];
  alertCount: number;
  fetchedAt: string | null;
  generatedAt: string;
};

const snapshotFile = new File(Paths.document, 'station-widget-snapshot.json');
const appGroupIdentifier = 'group.app.metrolens.mobile';
const snapshotStorageKey = 'stationWidgetSnapshot';
const extensionStorage = new ExtensionStorage(appGroupIdentifier);

export async function readStationWidgetSnapshot(): Promise<StationWidgetSnapshot | null> {
  try {
    if (!snapshotFile.exists) return null;

    const rawSnapshot = await snapshotFile.text();
    const parsedSnapshot = JSON.parse(rawSnapshot);
    return isStationWidgetSnapshot(parsedSnapshot) ? parsedSnapshot : null;
  } catch {
    return null;
  }
}

export function writeStationWidgetSnapshot(snapshot: StationWidgetSnapshot) {
  const serializedSnapshot = JSON.stringify(snapshot);
  snapshotFile.write(serializedSnapshot);
  extensionStorage.set(snapshotStorageKey, serializedSnapshot);
  ExtensionStorage.reloadWidget('MetroLensWidget');
}

export function createStationWidgetPredictions(predictions: TrainPrediction[]): WidgetPrediction[] {
  return predictions
    .filter((prediction) => prediction.line)
    .slice(0, 8)
    .map((prediction) => ({
      destinationName: prediction.destinationName,
      line: prediction.line,
      minutes: prediction.minutes,
      rawMinutes: prediction.rawMinutes,
    }));
}

function isStationWidgetSnapshot(value: unknown): value is StationWidgetSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const snapshot = value as Partial<StationWidgetSnapshot>;
  return (
    typeof snapshot.stationCode === 'string' &&
    Array.isArray(snapshot.stationCodes) &&
    typeof snapshot.stationName === 'string' &&
    Array.isArray(snapshot.lines) &&
    Array.isArray(snapshot.predictions) &&
    typeof snapshot.alertCount === 'number' &&
    typeof snapshot.generatedAt === 'string'
  );
}
