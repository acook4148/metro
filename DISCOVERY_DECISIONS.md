# Discovery Decisions

Completed: June 26, 2026

This file captures the first five Discovery checklist decisions for the WMATA Metro app.

## 1. WMATA Developer Access And Endpoint Coverage

Status: confirmed enough to proceed with implementation planning.

WMATA provides a developer portal with sign-up, sign-in, API documentation, products, and a developer license agreement. The portal states that train arrivals, bus predictions, schedules, and related transit data are available for web and mobile applications, and that API/GTFS use is free at the time of review.

Important limitation:

- Actual private developer account ownership cannot be verified from this workspace because no WMATA credentials are present.
- Before implementing the backend proxy against production WMATA APIs, the app owner must create or confirm a WMATA developer account and generate API keys.
- The backend must never require end users to obtain their own WMATA keys.

Confirmed data capabilities from WMATA public docs/terms:

- Train arrivals / rail predictions.
- Bus predictions and schedules, though bus is out of MVP scope.
- Metrorail lines.
- Bus/train locations.
- Rail incidents.
- Rail elevator/escalator incidents.
- Static GTFS.
- GTFS Realtime with arrival predictions, vehicle positions, and service advisories.
- Enhanced GTFS station data including entrances, platforms, levels, pathways, and more precise stop locations.

Initial app-facing endpoint plan:

- `GET /v1/stations`
- `GET /v1/lines`
- `GET /v1/stations/{stationCode}/predictions`
- `GET /v1/incidents`
- `GET /v1/stations/{stationCode}/alerts`
- `GET /v1/facilities/outages`
- `GET /v1/health`

## 2. WMATA API Limits, Terms, Attribution, And Key Handling

Status: documented enough to proceed.

Key terms and constraints:

- WMATA Transit Data is provided under WMATA's Transit Data Terms of Use.
- WMATA says API/GTFS data is free at the time of review, but reserves the right to charge in the future.
- Limited testing users may use WMATA's public use key if available through the portal.
- Production use requires a WMATA developer account and subscription to one or more service tiers.
- Each subscription generates two security keys.
- The developer is responsible for key security and all activity under the keys.
- WMATA may revoke, limit, or terminate keys/service access.
- The app may not require end users to obtain their own WMATA keys.
- The app may not imply WMATA affiliation, sponsorship, or endorsement.
- The app may not imply that it owns or created WMATA Transit Data, API, or GTFS.
- The app may not claim that its data is accurate, complete, or timely relative to WMATA source data.
- Repackaging WMATA API data into a standalone third-party API is restricted. Our Cloudflare proxy should only serve this app, not a public transit-data API for unrelated third parties.

Product and implementation decisions:

- Store WMATA keys only as Cloudflare Worker secrets.
- Do not embed WMATA keys in React Native, iOS widget code, Android widget code, or repo files.
- Add edge caching and app-side caching to avoid excessive WMATA calls.
- Add rate limiting on the Cloudflare Worker.
- Show freshness timestamps and avoid promising perfect accuracy.
- Use wording such as "Transit data from WMATA. This app is not affiliated with or endorsed by WMATA." Final wording should be reviewed before launch.
- Do not use WMATA marks, logos, or branding beyond permitted factual references unless written permission is obtained.

Open implementation follow-up:

- After account login, verify exact numerical call quotas/service tier limits in the WMATA developer portal. Public terms confirm service tiers and possible limits but do not expose a reliable quota number in the public pages reviewed.

## 3. Minimum Supported Platform Versions

Decision:

- iOS: 16.4+
- Android: 8.0+ / API 26+

Rationale:

- Current Expo SDK documentation reviewed on June 26, 2026 lists Expo SDK 56 with iOS 16.4+ support and Android 7+ support, using compile/target SDK 36.
- Choosing iOS 16.4+ aligns with the current Expo floor and supports the native iOS widget and Live Activity direction.
- Choosing Android 8.0+ is slightly stricter than Expo's Android 7+ floor, reducing old-device QA burden while still covering a broad Android audience.
- Android builds should target the current required Play Store API level through Expo/Gradle configuration.

Revisit trigger:

- Re-check Expo SDK and store submission requirements before project creation and again before launch.

## 4. Backend Provider

Decision: Cloudflare Workers.

Supporting services:

- Cloudflare Workers for the app-facing WMATA proxy.
- Cloudflare Cache for short-lived cached responses.
- Cloudflare Secrets for WMATA API keys.
- Cloudflare KV or R2 only if remote config or hosted static data becomes necessary.
- No user database for MVP.
- No user accounts for MVP.

Rationale:

- Cheapest practical backend for this use case.
- Good fit for cache-heavy shared transit data.
- Keeps WMATA API keys out of mobile binaries.
- Avoids managing servers.
- Can scale without introducing AWS/GCP/Azure.
- Works equally well for iOS and Android clients.

## 5. MVP Feature List And Non-Goals

MVP features:

- React Native app for iOS and Android.
- Cloudflare Worker WMATA proxy.
- Station search with fuzzy matching.
- Nearby stations using on-device location.
- Station detail with real-time rail predictions.
- Arrivals grouped by line and direction.
- Favorite stations.
- Rail alerts/incidents by line and station.
- Offline bundled station and line metadata.
- Clear live/scheduled/stale data labels.
- Last updated timestamps anywhere real-time data appears.
- Home screen widget for favorite station on iOS.
- Home screen widget for favorite station on Android.
- iOS lock screen widget for favorite station.
- Shared widget snapshot storage.
- Deep links from widgets into the correct station screen.
- Light mode, dark mode, VoiceOver, TalkBack, Dynamic Type/font scaling, and non-color status indicators.

MVP non-goals:

- User accounts.
- Payments or subscriptions.
- Ads.
- Metrobus support.
- Full multimodal trip planning.
- Crowdsourced reports.
- Apple Watch or Wear OS app.
- Push disruption alerts.
- Historical prediction modeling.
- Fare card balance integration.
- Public third-party API access to normalized WMATA data.

## 6. Working App Name And Identifiers

Decision:

- Working app name: MetroLens.
- Production iOS bundle identifier: `app.metrolens.mobile`.
- Production Android application ID: `app.metrolens.mobile`.
- Development identifier: `app.metrolens.dev`.
- Staging identifier: `app.metrolens.staging`.

Rationale:

- MetroLens is short, memorable, and fits the product goal: making WMATA rail status and next-train information clear at a glance.
- Separate development, staging, and production identifiers allow parallel installs and safer testing.
- These identifiers are implementation placeholders until a developer-owned domain, App Store Connect account, Google Play Console account, and trademark/app-store availability checks are finalized.

## Sources Reviewed

- WMATA developer portal: https://developer.wmata.com/
- WMATA Transit Data Terms of Use: https://developer.wmata.com/license
- React Native environment setup: https://reactnative.dev/docs/environment-setup
- Expo SDK reference and platform support: https://docs.expo.dev/versions/latest/
- Android app widgets overview: https://developer.android.com/develop/ui/views/appwidgets/overview
- Apple WidgetKit documentation: https://developer.apple.com/documentation/widgetkit
- Apple ActivityKit documentation: https://developer.apple.com/documentation/activitykit
