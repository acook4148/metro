import http from 'node:http';

const PORT = Number.parseInt(process.env.PORT || '8787', 10);
const HOST = process.env.HOST || '127.0.0.1';
const WMATA_API_KEY = process.env.WMATA_API_KEY;
const WMATA_API_BASE_URL = process.env.WMATA_API_BASE_URL || 'https://api.wmata.com';
const ALLOWED_LINES = new Set(['RD', 'OR', 'SV', 'BL', 'YL', 'GR']);
const cache = new Map();

const server = http.createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { error: 'bad_request' });
    return;
  }

  if (request.method === 'OPTIONS') {
    sendJson(response, 204, null);
    return;
  }

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'method_not_allowed' });
    return;
  }

  const url = new URL(request.url, `http://${request.headers.host || `localhost:${PORT}`}`);

  try {
    if (url.pathname === '/v1/health') {
      sendJson(response, 200, {
        ok: true,
        upstream: 'wmata',
        checkedAt: new Date().toISOString(),
      });
      return;
    }

    if (!WMATA_API_KEY) {
      sendJson(response, 500, {
        error: 'missing_wmata_api_key',
        message: 'Set WMATA_API_KEY before calling WMATA-backed endpoints.',
      });
      return;
    }

    if (url.pathname === '/v1/lines') {
      const data = await fetchWmata('/Rail.svc/json/jLines', new URLSearchParams(), 86400);
      sendJson(response, 200, {
        lines: (data.Lines || []).map((line) => ({
          code: line.LineCode,
          name: line.DisplayName,
          startStationCode: line.StartStationCode || null,
          endStationCode: line.EndStationCode || null,
          internalDestination1: line.InternalDestination1 || null,
          internalDestination2: line.InternalDestination2 || null,
        })),
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    if (url.pathname === '/v1/stations') {
      const params = new URLSearchParams();
      const lineCode = url.searchParams.get('line');

      if (lineCode) {
        const normalizedLineCode = lineCode.toUpperCase();
        if (!ALLOWED_LINES.has(normalizedLineCode)) {
          sendJson(response, 400, { error: 'invalid_line_code' });
          return;
        }
        params.set('LineCode', normalizedLineCode);
      }

      const data = await fetchWmata('/Rail.svc/json/jStations', params, 86400);
      sendJson(response, 200, {
        stations: (data.Stations || []).map((station) => ({
          code: station.Code,
          name: station.Name,
          stationTogether: [station.StationTogether1, station.StationTogether2].filter(Boolean),
          lines: [station.LineCode1, station.LineCode2, station.LineCode3, station.LineCode4].filter(Boolean),
          location:
            typeof station.Lat === 'number' && typeof station.Lon === 'number'
              ? { latitude: station.Lat, longitude: station.Lon }
              : null,
          address: station.Address || null,
        })),
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    if (url.pathname === '/v1/incidents') {
      const data = await fetchWmata('/Incidents.svc/json/Incidents', new URLSearchParams(), 60);
      sendJson(response, 200, {
        incidents: (data.Incidents || []).map((incident) => ({
          id: incident.IncidentID || null,
          type: incident.IncidentType || null,
          description: incident.Description || '',
          linesAffected: parseLinesAffected(incident.LinesAffected),
          updatedAt: incident.DateUpdated || null,
        })),
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    const predictionMatch = url.pathname.match(/^\/v1\/stations\/([A-Z]\d{2})\/predictions$/);
    if (predictionMatch) {
      const stationCode = predictionMatch[1];
      const data = await fetchWmata(
        `/StationPrediction.svc/json/GetPrediction/${stationCode}`,
        new URLSearchParams(),
        15,
      );

      sendJson(response, 200, {
        stationCode,
        predictions: (data.Trains || []).map((train) => ({
          cars: train.Car || null,
          destinationCode: train.DestinationCode || null,
          destinationName: train.DestinationName || train.Destination || 'Unknown',
          group: train.Group || null,
          line: train.Line || null,
          locationCode: train.LocationCode || stationCode,
          locationName: train.LocationName || null,
          minutes: normalizeMinutes(train.Min),
          rawMinutes: train.Min || null,
        })),
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    sendJson(response, 404, { error: 'not_found' });
  } catch (error) {
    sendJson(response, 502, {
      error: 'wmata_request_failed',
      message: error instanceof Error ? error.message : 'Unknown WMATA error',
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`DC Metro Mate local API running at http://${HOST}:${PORT}`);
});

async function fetchWmata(path, params, ttlSeconds) {
  const url = new URL(path, WMATA_API_BASE_URL);
  params.forEach((value, key) => url.searchParams.set(key, value));
  url.searchParams.set('api_key', WMATA_API_KEY);

  const cacheKey = url.toString();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      api_key: WMATA_API_KEY,
      'Ocp-Apim-Subscription-Key': WMATA_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`WMATA returned ${response.status}`);
  }

  const data = await response.json();
  cache.set(cacheKey, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return data;
}

function normalizeMinutes(value) {
  if (!value) return null;
  if (value === 'ARR' || value === 'BRD') return value;

  const minutes = Number.parseInt(value, 10);
  return Number.isNaN(minutes) ? null : minutes;
}

function parseLinesAffected(value) {
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  });

  response.end(body === null ? '' : JSON.stringify(body));
}
