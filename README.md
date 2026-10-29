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

## Android Testing

Start the app with the deployed API (no local proxy required):

```sh
EXPO_PUBLIC_API_BASE_URL=https://metrolens-api.wmata.workers.dev npx expo start --go
```

Open it in an Expo Go version compatible with SDK 54 on an Android phone on the same
Wi-Fi network. Press `a` to use an already configured Android emulator instead.

To test an installable APK independently of Metro or Expo Go:

```sh
npx eas-cli build --profile preview --platform android
```

Install the APK from the EAS build link on the Android phone. This uses the staging
package identifier and the deployed API. EAS compiles it in the cloud; a local Android
SDK is not required. A production build uses `--profile production` and creates an
Android App Bundle for Google Play.

Android uses its system sans-serif font (Roboto), with medium and bold weights.
iOS retains Helvetica Neue. Station history and preferred lines persist locally on
both platforms. Android widgets require a native build and are not available in Expo Go.

Before releasing Android, check on a physical device:

- Status/navigation bar insets with gesture and three-button navigation.
- Search, clear search, station selection, and keyboard dismissal.
- Preferred-line ordering and top stations after closing and reopening the app.
- Button refresh without scrolling, pull-to-refresh, and offline recovery.
- Long service alerts, scrolling, and closing the modal with Android Back.
- Feedback opening in a browser custom tab, plus Support and Privacy links.
- Launcher icon, large system font settings, and narrow screen layouts.
- Map opening/closing with Android Back, station taps after zooming, and pinch-to-drag
  transitions when lifting either finger first. Confirm the map selection updates widgets.

### Android Integration Audit (October 28, 2026)

Merged `origin/main` into `feat/android-app-compatibility`, including the interactive
map and home-screen controls. The map uses the shared platform font, native Android
gesture handling, and Android Back dismissal. Android touch tracking uses the average
pointer position to match iOS. Existing search clearing, safe-area handling, persisted
preferences, browser feedback, and native widget synchronization remain in place.

Release verification still requires a native preview APK: this workstation has no
Android SDK/emulator, so Kotlin compilation, widget instrumentation, navigation-bar
layout, and physical multi-touch behavior have not been verified here. Expo Go cannot
test widgets. Run the preview build above before producing a Play release bundle.

Existing choices retained: Android 8+ minimum, Roboto medium/bold, Compact/Wide widgets,
and 30-minute scheduled widget refresh with manual refresh. Lock-screen availability
depends on the device host. Confirm `app.metrolens.mobile` is the intended permanent
Play package identifier and obtain permission for the bundled WMATA map before release.

Validation: Android production JavaScript export, Android prebuild in a temporary copy,
widget-module autolinking, TypeScript, lint, and the ten map tests passed. These are not
a substitute for compiling the APK or running the Kotlin widget tests.

Appearance decision: configuration currently requests `automatic`, but Android prebuild
warns that `expo-system-ui` is missing. The actual app palette is fixed light. Decide
whether to explicitly support light-only native appearance or implement a complete dark
theme before changing this setting; the audit does not claim dark-mode support.

### Android Widgets

The local Expo module in `modules/metro-widget` provides Compact and Wide widgets.
After installing an Android preview build, open the app and select a station once.
Long-press the launcher home screen, choose Widgets, and add a DC Metro Mate widget.
Resize it to change between compact and wide layouts. Both show up to five departures;
shorter sizes show fewer rows to preserve readable, consistent text sizes.

The widgets share the app's selected station, preferred-line order, and top three stations.
Next cycles those stations across all Android widget instances, matching the iOS behavior.
Changing the selection in the app updates all widgets. Refresh and Next work while the
app is closed, using the existing public Cloudflare API without embedding a WMATA key.

Refresh shows a spinner while requesting new data. Failed requests retain the previous
station and arrivals, color the age timer orange, and show Retry when space permits.
The update label shows the last successful data timestamp in the device's local time
format. It stays fixed until newer data arrives; it is not a ticking stopwatch.
Android WorkManager requests background refresh every 30 minutes while widgets exist.
Battery saving and network availability can delay these updates. Button presses request
an immediate update. Removing the last widget cancels scheduled refresh work.

On Android devices whose lock-screen host supports app widgets, these widgets are also
eligible for that host. When the host identifies itself as a lock screen, the layout uses
two departures and an icon-only Next control in the header. Availability depends on the
device/launcher; it is not equivalent to universal iOS lock-screen widget support.

Additional device checks:

- Add both widget sizes, resize and rotate, and check the longest station/destination names.
- Select Metro Center and confirm both boarding zones and the preferred line appear.
- Pick three stations, close the app, and cycle Next through them and back to the first.
- Refresh offline and confirm saved arrivals remain with their original data age.
- Change the station in the app while a widget refresh is running; the app selection wins.
- Reboot and verify the saved station, timer, controls, and background work recover.
- Remove all widgets and verify no periodic widget requests remain scheduled.

Native unit tests (requires a generated Android project and Android build toolchain):

```sh
cd android
./gradlew :metro-widget:testDebugUnitTest
```

## Environments

Set `APP_ENV` to choose app identifiers and display names:

- `development`: `app.metrolens.dev`
- `staging`: `app.metrolens.staging`
- `production`: `app.metrolens.mobile`

Copy `.env.example` to `.env.local` for local development. WMATA API keys must only be stored as Cloudflare Worker secrets and must never use an `EXPO_PUBLIC_` variable.

## Interactive Station Map

The Map button beside station search opens the bundled WMATA diagram, initially
zoomed toward Metro Center with the top legend clipped. Pan or pinch to zoom.
Tapping a station previews its name and
lines; Show arrivals uses the same selection/history/widget flow as station search.
Closing the map without confirming leaves the current station unchanged.

The map image and 98 station targets are bundled together for offline browsing.
Transfer stations share a marker and retain all their boarding-zone codes. Live
arrivals still require the API. Source, coordinate maintenance, and map permission
notes are in `assets/METRO_MAP_SOURCE.md`; confirm reproduction permission before
distributing the official artwork.

```sh
node --test scripts/metro-map.test.cjs
```

The map adds Expo-compatible Gesture Handler, Reanimated, and Worklets dependencies.
Existing custom development clients need a new native build. Compatible Expo Go
versions already include these modules.

Test on iOS and Android: pinch/pan without selecting by accident, select stations
on each branch and all four multi-code transfer stations, dismiss with Close/Back,
and verify station history and widget selection only change after Show arrivals.
