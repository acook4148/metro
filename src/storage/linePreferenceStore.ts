import { File, Paths } from 'expo-file-system';

import { getCanonicalStationCode } from './stationUsageStore';

export type LinePreferenceSnapshot = Record<string, string>;

const linePreferenceFile = new File(Paths.document, 'line-preferences.json');

export async function readLinePreferences(): Promise<LinePreferenceSnapshot> {
  try {
    if (!linePreferenceFile.exists) return {};

    const rawPreferences = await linePreferenceFile.text();
    const parsedPreferences = JSON.parse(rawPreferences);
    return isLinePreferenceSnapshot(parsedPreferences) ? parsedPreferences : {};
  } catch {
    return {};
  }
}

export async function setLinePreference(stationCodes: string[], line: string): Promise<LinePreferenceSnapshot> {
  const canonicalCode = getCanonicalStationCode(stationCodes);
  const currentPreferences = await readLinePreferences();
  const nextPreferences = {
    ...currentPreferences,
    [canonicalCode]: line,
  };

  linePreferenceFile.write(JSON.stringify(nextPreferences));
  return nextPreferences;
}

function isLinePreferenceSnapshot(value: unknown): value is LinePreferenceSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.entries(value).every(
    ([stationCode, line]) => typeof stationCode === 'string' && typeof line === 'string',
  );
}
