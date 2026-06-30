import { File, Paths } from 'expo-file-system';

export type StationUsageSnapshot = Record<string, number>;

const usageFile = new File(Paths.document, 'station-usage.json');

export async function readStationUsage(): Promise<StationUsageSnapshot> {
  try {
    if (!usageFile.exists) return {};

    const rawUsage = await usageFile.text();
    const parsedUsage = JSON.parse(rawUsage);
    return isStationUsageSnapshot(parsedUsage) ? parsedUsage : {};
  } catch {
    return {};
  }
}

export async function incrementStationUsage(stationCodes: string[]): Promise<StationUsageSnapshot> {
  const canonicalCode = getCanonicalStationCode(stationCodes);
  const currentUsage = await readStationUsage();
  const nextUsage = {
    ...currentUsage,
    [canonicalCode]: (currentUsage[canonicalCode] || 0) + 1,
  };

  usageFile.write(JSON.stringify(nextUsage));
  return nextUsage;
}

export function getCanonicalStationCode(stationCodes: string[]): string {
  return [...stationCodes].sort()[0];
}

function isStationUsageSnapshot(value: unknown): value is StationUsageSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

  return Object.entries(value).every(
    ([stationCode, count]) => typeof stationCode === 'string' && typeof count === 'number',
  );
}
