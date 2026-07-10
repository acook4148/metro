# DC Metro Mate

DC Metro Mate is a React Native and Expo app for WMATA rail arrivals and service status on iOS and Android.

## Local Development

Use Node `22.13.0` or newer. The current Expo template depends on React Native packages that require at least that patch version.

```sh
npm install
npm start
```

## Local WMATA API Proxy

The app must call the DC Metro Mate proxy, not WMATA directly. This keeps the WMATA API key out of the mobile bundle.

Create a local env file:

```sh
cp .env.example .env.local
```

Set `WMATA_API_KEY` in `.env.local`, then run the local proxy:

```sh
set -a
source .env.local
set +a
npm run api:dev
```

For Expo Go on a physical phone, bind the proxy to your Mac's network interface:

```sh
set -a
source .env.local
set +a
HOST=0.0.0.0 npm run api:dev
```

Smoke-test the proxy:

```sh
curl http://127.0.0.1:8787/v1/health
curl http://127.0.0.1:8787/v1/lines
curl http://127.0.0.1:8787/v1/stations?line=RD
curl http://127.0.0.1:8787/v1/stations/A01/predictions
curl http://127.0.0.1:8787/v1/incidents
```

Run the app against the local proxy:

```sh
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8787 npm start
```

For iOS Simulator, `127.0.0.1` usually works. For Android Emulator, use `http://10.0.2.2:8787`. For a physical phone, run the proxy with `HOST=0.0.0.0` and use your Mac's LAN IP address, for example `http://192.168.1.25:8787`.

Cloudflare Worker local dev is also available:

```sh
npm run api:dev:worker
```

Current Wrangler/workerd releases require macOS 13.5+ for local runtime support. On older macOS, use `npm run api:dev` for local testing and deploy/test the Worker remotely when ready.

Run a native development build when testing native modules or widgets:

```sh
npm run prebuild
npm run ios
npm run android
```

## Environments

Set `APP_ENV` to choose app identifiers and display names:

- `development`: `app.metrolens.dev`
- `staging`: `app.metrolens.staging`
- `production`: `app.metrolens.mobile`

Copy `.env.example` to `.env.local` for local development. WMATA API keys must only be stored as Cloudflare Worker secrets and must never use an `EXPO_PUBLIC_` variable.
