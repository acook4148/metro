type WmataLine = {
  LineCode: string;
  DisplayName: string;
  StartStationCode?: string;
  EndStationCode?: string;
  InternalDestination1?: string;
  InternalDestination2?: string;
};

type WmataStation = {
  Code: string;
  Name: string;
  StationTogether1?: string;
  StationTogether2?: string;
  LineCode1?: string | null;
  LineCode2?: string | null;
  LineCode3?: string | null;
  LineCode4?: string | null;
  Lat?: number;
  Lon?: number;
  Address?: {
    Street?: string;
    City?: string;
    State?: string;
    Zip?: string;
  };
};

type WmataPrediction = {
  Car?: string;
  Destination?: string;
  DestinationCode?: string | null;
  DestinationName?: string;
  Group?: string;
  Line?: string;
  LocationCode?: string;
  LocationName?: string;
  Min?: string;
};

type WmataIncident = {
  IncidentID?: string;
  IncidentType?: string;
  Description?: string;
  LinesAffected?: string;
  DateUpdated?: string;
};

type WorkerContext = {
  waitUntil(promise: Promise<unknown>): void;
};

const WMATA_BASE_URL = 'https://api.wmata.com';
const ALLOWED_LINES = new Set(['RD', 'OR', 'SV', 'BL', 'YL', 'GR']);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'GET') {
      return json({ error: 'method_not_allowed' }, 405);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/v1/health') {
        return json({
          ok: true,
          upstream: 'wmata',
          checkedAt: new Date().toISOString(),
        });
      }

      if (url.pathname === '/v1/lines') {
        return getLines(env, ctx);
      }

      if (url.pathname === '/v1/stations') {
        return getStations(env, ctx, url.searchParams.get('line'));
      }

      if (url.pathname === '/v1/incidents') {
        return getIncidents(env, ctx);
      }

      const predictionMatch = url.pathname.match(/^\/v1\/stations\/([A-Z]\d{2})\/predictions$/);
      if (predictionMatch) {
        return getPredictions(env, ctx, predictionMatch[1]);
      }

      return json({ error: 'not_found' }, 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected server error';
      return json({ error: 'internal_error', message }, 500);
    }
  },
};

async function getLines(env: Env, ctx: WorkerContext): Promise<Response> {
  const data = await fetchWmata<{ Lines?: WmataLine[] }>(
    env,
    ctx,
    '/Rail.svc/json/jLines',
    new URLSearchParams(),
    86400,
  );

  const lines = (data.Lines ?? []).map((line) => ({
    code: line.LineCode,
    name: line.DisplayName,
    startStationCode: line.StartStationCode ?? null,
    endStationCode: line.EndStationCode ?? null,
    internalDestination1: line.InternalDestination1 ?? null,
    internalDestination2: line.InternalDestination2 ?? null,
  }));

  return json({ lines, fetchedAt: new Date().toISOString() }, 200, 86400);
}

async function getStations(env: Env, ctx: WorkerContext, lineCode: string | null): Promise<Response> {
  const params = new URLSearchParams();

  if (lineCode) {
    const normalizedLineCode = lineCode.toUpperCase();
    if (!ALLOWED_LINES.has(normalizedLineCode)) {
      return json({ error: 'invalid_line_code' }, 400);
    }
    params.set('LineCode', normalizedLineCode);
  }

  const data = await fetchWmata<{ Stations?: WmataStation[] }>(
    env,
    ctx,
    '/Rail.svc/json/jStations',
    params,
    86400,
  );

  const stations = (data.Stations ?? []).map((station) => ({
    code: station.Code,
    name: station.Name,
    stationTogether: [station.StationTogether1, station.StationTogether2].filter(Boolean),
    lines: [station.LineCode1, station.LineCode2, station.LineCode3, station.LineCode4].filter(Boolean),
    location:
      typeof station.Lat === 'number' && typeof station.Lon === 'number'
        ? { latitude: station.Lat, longitude: station.Lon }
        : null,
    address: station.Address ?? null,
  }));

  return json({ stations, fetchedAt: new Date().toISOString() }, 200, 86400);
}

async function getPredictions(env: Env, ctx: WorkerContext, stationCode: string): Promise<Response> {
  const data = await fetchWmata<{ Trains?: WmataPrediction[] }>(
    env,
    ctx,
    `/StationPrediction.svc/json/GetPrediction/${stationCode}`,
    new URLSearchParams(),
    15,
  );

  const predictions = (data.Trains ?? []).map((train) => ({
    cars: train.Car ?? null,
    destinationCode: train.DestinationCode ?? null,
    destinationName: train.DestinationName || train.Destination || 'Unknown',
    group: train.Group ?? null,
    line: train.Line ?? null,
    locationCode: train.LocationCode ?? stationCode,
    locationName: train.LocationName ?? null,
    minutes: normalizeMinutes(train.Min),
    rawMinutes: train.Min ?? null,
  }));

  return json({ stationCode, predictions, fetchedAt: new Date().toISOString() }, 200, 15);
}

async function getIncidents(env: Env, ctx: WorkerContext): Promise<Response> {
  const data = await fetchWmata<{ Incidents?: WmataIncident[] }>(
    env,
    ctx,
    '/Incidents.svc/json/Incidents',
    new URLSearchParams(),
    60,
  );

  const incidents = (data.Incidents ?? []).map((incident) => ({
    id: incident.IncidentID ?? null,
    type: incident.IncidentType ?? null,
    description: incident.Description ?? '',
    linesAffected: parseLinesAffected(incident.LinesAffected),
    updatedAt: incident.DateUpdated ?? null,
  }));

  return json({ incidents, fetchedAt: new Date().toISOString() }, 200, 60);
}

async function fetchWmata<T>(
  env: Env,
  ctx: WorkerContext,
  path: string,
  params: URLSearchParams,
  ttlSeconds: number,
): Promise<T> {
  const apiKey = env.WMATA_API_KEY;
  if (!apiKey) {
    throw new Error('WMATA_API_KEY is not configured');
  }

  const upstreamBaseUrl = env.WMATA_API_BASE_URL || WMATA_BASE_URL;
  const url = new URL(path, upstreamBaseUrl);
  params.forEach((value, key) => url.searchParams.set(key, value));
  url.searchParams.set('api_key', apiKey);

  const cache = (caches as unknown as { default: Cache }).default;
  const cacheKey = new Request(url.toString(), { method: 'GET' });
  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached.json<T>();
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      api_key: apiKey,
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    cf: {
      cacheTtl: ttlSeconds,
      cacheEverything: true,
    },
  });

  if (!response.ok) {
    throw new Error(`WMATA request failed with ${response.status}`);
  }

  const data = await response.json<T>();
  const cacheResponse = new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttlSeconds}`,
    },
  });

  ctx.waitUntil(cache.put(cacheKey, cacheResponse));

  return data;
}

function normalizeMinutes(value: string | undefined): number | 'ARR' | 'BRD' | null {
  if (!value) return null;
  if (value === 'ARR' || value === 'BRD') return value;

  const minutes = Number.parseInt(value, 10);
  return Number.isNaN(minutes) ? null : minutes;
}

function parseLinesAffected(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function json(body: unknown, status = 200, maxAgeSeconds = 0): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'Cache-Control': maxAgeSeconds > 0 ? `public, max-age=${maxAgeSeconds}` : 'no-store',
    },
  });
}
