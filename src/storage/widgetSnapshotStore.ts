import { ExtensionStorage } from '@bacons/apple-targets';
import { File, Paths } from 'expo-file-system';

import { TrainPrediction } from '../api/metrolensApi';

export type WidgetPrediction = {
  destinationName: string;
  line: string | null;
  minutes: number | 'ARR' | 'BRD' | null;
  rawMinutes: string | null;
};

export type WidgetStationOption = {
  stationCode: string;
  stationCodes: string[];
  stationName: string;
  lines: string[];
  preferredLineOrder: string[];
};

export type StationWidgetSnapshot = {
  stationCode: string;
  stationCodes: string[];
  stationName: string;
  lines: string[];
  preferredLineOrder?: string[];
  predictions: WidgetPrediction[];
  alertCount: number;
  fetchedAt: string | null;
  generatedAt: string;
  isClosed?: boolean;
  nextTrainTime?: string | null;
  isRefreshing?: boolean;
  topStations?: WidgetStationOption[];
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

export function createStationWidgetPredictions(
  predictions: TrainPrediction[],
  preferredLineOrder: string[] = [],
): WidgetPrediction[] {
  return predictions
    .filter((prediction) => prediction.line)
    .sort((predictionA, predictionB) =>
      compareLines(predictionA.line, predictionB.line, preferredLineOrder),
    )
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
    (snapshot.preferredLineOrder === undefined ||
      (Array.isArray(snapshot.preferredLineOrder) &&
        snapshot.preferredLineOrder.every((line) => typeof line === 'string'))) &&
    Array.isArray(snapshot.predictions) &&
    typeof snapshot.alertCount === 'number' &&
    typeof snapshot.generatedAt === 'string' &&
    (snapshot.isClosed === undefined || typeof snapshot.isClosed === 'boolean') &&
    (snapshot.nextTrainTime === undefined ||
      snapshot.nextTrainTime === null ||
      typeof snapshot.nextTrainTime === 'string') &&
    (snapshot.isRefreshing === undefined || typeof snapshot.isRefreshing === 'boolean') &&
    (snapshot.topStations === undefined ||
      (Array.isArray(snapshot.topStations) && snapshot.topStations.every(isWidgetStationOption)))
  );
}

function isWidgetStationOption(value: unknown): value is WidgetStationOption {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  const station = value as Partial<WidgetStationOption>;
  return (
    typeof station.stationCode === 'string' &&
    Array.isArray(station.stationCodes) &&
    station.stationCodes.every((code) => typeof code === 'string') &&
    typeof station.stationName === 'string' &&
    Array.isArray(station.lines) &&
    station.lines.every((line) => typeof line === 'string') &&
    Array.isArray(station.preferredLineOrder) &&
    station.preferredLineOrder.every((line) => typeof line === 'string')
  );
}

function compareLines(lineA: string | null, lineB: string | null, preferredLineOrder: string[]): number {
  const lineAIndex = getLineIndex(lineA, preferredLineOrder);
  const lineBIndex = getLineIndex(lineB, preferredLineOrder);

  if (lineAIndex === lineBIndex) return 0;
  return lineAIndex - lineBIndex;
}

function getLineIndex(line: string | null, preferredLineOrder: string[]): number {
  if (!line) return Number.MAX_SAFE_INTEGER;

  const index = preferredLineOrder.indexOf(line);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}
