import Constants from 'expo-constants';

export type MetroLine = {
  code: string;
  name: string;
  startStationCode: string | null;
  endStationCode: string | null;
  internalDestination1: string | null;
  internalDestination2: string | null;
};

export type MetroStation = {
  code: string;
  name: string;
  stationTogether: string[];
  lines: string[];
  location: {
    latitude: number;
    longitude: number;
  } | null;
  address: {
    Street?: string;
    City?: string;
    State?: string;
    Zip?: string;
  } | null;
};

export type TrainPrediction = {
  cars: string | null;
  destinationCode: string | null;
  destinationName: string;
  group: string | null;
  line: string | null;
  locationCode: string;
  locationName: string | null;
  minutes: number | 'ARR' | 'BRD' | null;
  rawMinutes: string | null;
};

export type ServiceIncident = {
  id: string | null;
  type: string | null;
  description: string;
  linesAffected: string[];
  updatedAt: string | null;
};

type LinesResponse = {
  lines: MetroLine[];
  fetchedAt: string;
};

type StationsResponse = {
  stations: MetroStation[];
  fetchedAt: string;
};

type PredictionsResponse = {
  stationCode: string;
  predictions: TrainPrediction[];
  fetchedAt: string;
};

type IncidentsResponse = {
  incidents: ServiceIncident[];
  fetchedAt: string;
};

const apiBaseUrl =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://localhost:8787';

export const metrolensApi = {
  getLines: () => request<LinesResponse>('/v1/lines'),
  getStations: (lineCode?: string) =>
    request<StationsResponse>(lineCode ? `/v1/stations?line=${encodeURIComponent(lineCode)}` : '/v1/stations'),
  getPredictions: (stationCode: string) =>
    request<PredictionsResponse>(`/v1/stations/${encodeURIComponent(stationCode.toUpperCase())}/predictions`),
  getIncidents: () => request<IncidentsResponse>('/v1/incidents'),
};

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      Accept: 'application/json',
    },
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.message || body?.error || `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return body as T;
}
