# WMATA Metro Cross-Platform App Outline

## 1. Product Goal

Build a polished cross-platform mobile app for Washington Metropolitan Area Transit Authority rail riders that provides fast, reliable station schedules, train arrival predictions, service alerts, trip context, and useful home screen and lock screen widgets where supported. The app should feel simple for casual riders, powerful enough for daily commuters, and cheap to operate at launch while leaving room to scale.

## 2. Guiding Requirements

- One shared React Native app for iOS and Android.
- Native-quality iOS and Android experiences using TypeScript, React Native, and Expo prebuild or bare React Native where needed.
- Home screen widgets on iOS and Android.
- Lock screen widgets on iOS where supported.
- Optional iOS Live Activity for an active station wait, commute, or planned trip.
- Real-time WMATA rail predictions and service status.
- Clear service alerts, delays, disruptions, elevator/escalator context if available.
- Favorites for stations, lines, and commutes.
- Simple onboarding that gets users to useful information quickly.
- Accessibility-first UI: VoiceOver, TalkBack, Dynamic Type/font scaling, color contrast, reduced motion, and clear non-color status indicators.
- Cheap infrastructure at launch.
- Scalable architecture that can absorb growth without a rewrite.
- Privacy-forward design with minimal account requirements and minimal personal data.

## 3. Competitive Feature Benchmark

Review strong transit apps before finalizing scope:

- Transit: fast nearby departures, favorites, crowd-friendly UX, strong service disruption handling.
- Citymapper: strong trip planning, disruption-aware routing, rich live trip experience.
- MetroHero-style experiences: WMATA-specific train positions, line maps, station detail, and disruption visibility.
- Apple Maps and Google Maps: baseline trip planning expectations, nearby transit, and platform-level polish.

Target differentiators:

- Faster access to a rider's daily station and route than general-purpose maps.
- WMATA-specific clarity: line colors, station groupings, transfer stations, terminal direction, service alerts, and station facilities.
- Widgets that are actually useful at a glance.
- A restrained visual design that feels premium without hiding operational information.
- No account required for core use.

## 4. Data Sources

### Required WMATA Data

- Rail station list and station metadata.
- Rail line metadata.
- Station-to-station path metadata.
- Real-time train predictions.
- Rail incidents and service disruptions.
- Elevator and escalator outages if included in scope.
- Static GTFS for routes, stops, stop times, and schedule fallback.
- GTFS Realtime feeds if WMATA provides the needed rail data there.

### Data Source Strategy

1. Start with official WMATA APIs for rail predictions, rail incidents, station metadata, and line metadata.
2. Use static GTFS as a fallback and for offline station metadata, schedule shapes, and baseline trip planning.
3. Add GTFS Realtime where it improves freshness, compatibility, or reduces custom API dependency.
4. Keep all provider access behind a small internal data abstraction so the app can swap or combine sources later.

### API Key Handling

Do not ship a sensitive WMATA API key as the only protection inside the mobile app. Mobile app secrets can be extracted from both iOS and Android builds.

Recommended launch approach:

- Use a serverless proxy for WMATA API calls that require an API key.
- Add short cache TTLs for common endpoints.
- Add rate limiting and abuse controls at the edge.
- Keep public, non-sensitive static data bundled in the app or hosted as static assets.

## 5. Infrastructure Approach

### Launch Architecture

- Mobile app: React Native with TypeScript.
- App framework: Expo with prebuild/custom dev client, or bare React Native if widget/native extension needs make Expo too constraining.
- iOS widgets: WidgetKit extension with shared App Group storage.
- Android widgets: native App Widget implementation using Android widget APIs, backed by shared app data.
- Optional iOS Live Activity extension: ActivityKit.
- Serverless API proxy: Cloudflare Workers, Vercel Edge Functions, AWS Lambda, or similar.
- Cache layer: Cloudflare Cache API or edge cache with short TTLs.
- Static assets: bundled app files first, then R2/S3/static hosting if needed.
- Analytics/crash reporting: privacy-conscious tools such as TelemetryDeck, Sentry, or Firebase Crashlytics depending on budget and privacy tradeoffs.
- CI: GitHub Actions with iOS and Android build lanes, or EAS Build plus GitHub Actions.

### Cheapest Practical Default

Use Cloudflare Workers for the API proxy because it can be inexpensive, globally distributed, easy to cache, and does not require managing servers.

Suggested services:

- Cloudflare Workers for `/api/wmata/*`.
- Cloudflare cache for repeated rail prediction, incidents, and station calls.
- Cloudflare KV or R2 only if remote config or static data hosting becomes necessary.
- No user database for MVP.
- No accounts for MVP.

### Scaling Path

- Add endpoint-level cache policies by data freshness needs.
- Add request coalescing for hot station prediction endpoints.
- Add regional monitoring and alerting.
- Add a durable data store only when user-facing features require it.
- Add push notification backend only after notification product requirements are proven.

## 6. High-Level System Design

### Client Modules

- `AppShell`: navigation, app state, dependency injection.
- `DesignSystem`: colors, typography, spacing, line badges, station chips, alert components.
- `MetroData`: WMATA API client, proxy client, models, cache policies.
- `Stations`: nearby stations, station search, station detail.
- `Predictions`: train arrivals, grouped by line and direction.
- `Alerts`: rail incidents, elevator/escalator outages, severity display.
- `Favorites`: favorite stations, favorite commutes, widget configuration support.
- `TripPlanning`: route search and next-trip guidance.
- `Widgets`: home screen and lock screen timelines.
- `LiveActivity`: active commute or station watch.
- `Settings`: units, notification preferences, privacy, data refresh controls.

React Native implementation notes:

- Keep business logic, API models, caching rules, station matching, favorites, and most UI in shared TypeScript.
- Use native modules only for platform surfaces that React Native cannot own directly, such as iOS widgets, iOS Live Activities, Android widgets, and selected background tasks.
- Keep widget data in a small serialized snapshot format so native widget code does not duplicate the full app data layer.
- Use React Navigation or Expo Router for app navigation.
- Use a cross-platform storage layer such as MMKV, SQLite, or Expo SQLite for local cache, plus platform-specific shared storage for widgets.

### Shared Storage

Use shared storage so the main app and widgets can share:

- Favorite station IDs.
- Favorite commute definitions.
- Last successful predictions.
- Last known service alerts.
- Widget configuration snapshots.
- User display preferences.

Platform details:

- iOS: App Group container for the React Native app, WidgetKit extension, and Live Activity extension.
- Android: SharedPreferences/DataStore or a small file/SQLite snapshot accessible to the widget provider.

### Caching Policy

- Station metadata: bundle in app and refresh occasionally.
- Line metadata: bundle in app and refresh occasionally.
- Incidents: cache for 30 to 90 seconds.
- Train predictions: cache for 10 to 30 seconds, depending on WMATA terms and observed reliability.
- Widget data: write from app refreshes and allow platform widget refreshes within iOS and Android limits.
- Offline fallback: show last updated time and avoid pretending stale data is live.

## 7. Core User Experience

### First Launch

1. Ask for location permission only when the user taps nearby stations or chooses location-based setup.
2. Offer station search immediately.
3. Let the user save a home station, work station, or favorite stations.
4. Suggest a widget only after a useful favorite exists.
5. Avoid account creation.

### Primary Tabs

- Nearby: nearby stations and next departures.
- Favorites: saved stations and commutes.
- Map: schematic rail map with station status.
- Alerts: line and station disruptions.
- Settings: preferences, privacy, and help.

### Station Detail

Show:

- Station name and served lines.
- Next trains grouped by direction and terminal.
- Platform or track direction if available.
- Service alerts affecting that station or line.
- Elevator/escalator status if in scope.
- Last updated timestamp.
- Favorite toggle.
- Widget setup action.

### Favorite Commute

Allow the user to define:

- Origin station.
- Destination station.
- Preferred line or transfer.
- Usual direction.
- Optional time window.

Show:

- Next useful trains.
- Expected transfer impact if applicable.
- Known service disruptions.
- One-tap Live Activity start.

## 8. Widget Requirements

### Home Screen Widgets

Recommended widget families:

- Small: one favorite station, next train, line color, direction, freshness.
- Medium: one station with several upcoming trains or one favorite commute.
- Large: multiple favorite stations or a commute dashboard.

Support on both iOS and Android, with platform-specific layouts as needed.

### iOS Lock Screen Widgets

Recommended widget families:

- Circular: line/status symbol or countdown.
- Rectangular: next train for one favorite station.
- Inline: short service status or next train text.

### Widget Constraints To Design Around

- Widget refresh timing is controlled by the operating system and is not guaranteed to be real-time.
- Widgets should always show a last updated timestamp or relative freshness.
- Widgets should use cached snapshots from the main app when possible.
- iOS widget configuration should use App Intents so users can choose a station or commute.
- Android widget configuration should use a native configuration activity or equivalent React Native screen handoff.
- Tapping a widget should deep link to the exact station, alert, or commute in the app.

### Live Activity

Use Live Activities for situations where a user is actively waiting or commuting.

Possible Live Activity modes:

- Watching a station departure.
- Following a saved commute.
- Monitoring disruption recovery for a selected line.

Avoid promising exact second-by-second updates unless the backend and iOS update rules support it reliably.

## 9. Visual Design Direction

### Brand Feel

- Calm, modern, and operational.
- Strong use of official WMATA line colors where permitted.
- High information density without clutter.
- Clear hierarchy: station, direction, line, time, status.
- Avoid decorative UI that competes with transit information.

### Core Components

- Line pill or badge for Red, Orange, Silver, Blue, Yellow, and Green.
- Station row with lines, distance, and disruption indicator.
- Prediction row with destination, minutes, cars if available, and confidence/freshness.
- Alert banner with severity and affected lines.
- Map station marker with transfer and disruption states.
- Empty states that point users to search or favorites.

### Accessibility

- Never rely on color alone for line or status meaning.
- Support Dynamic Type and Android font scaling without truncating critical train times.
- Add VoiceOver and TalkBack labels for line badges and arrival predictions.
- Support reduced motion.
- Maintain strong contrast in light and dark mode.

## 10. Technical Stack

### Cross-Platform Mobile

- React Native.
- TypeScript.
- Expo prebuild/custom dev client, unless bare React Native is needed for native extension control.
- React Navigation or Expo Router.
- TanStack Query or equivalent for server state and cache orchestration.
- Zustand, Redux Toolkit, or React Context for lightweight client state.
- MMKV, SQLite, or Expo SQLite for local persistence.
- React Native location APIs or Expo Location for nearby stations.
- Native maps or a custom schematic map depending on design scope.
- Shared TypeScript domain models for stations, lines, predictions, alerts, favorites, and widget snapshots.

### Native Platform Surfaces

- iOS WidgetKit for home screen and lock screen widgets.
- iOS App Intents for widget configuration.
- iOS ActivityKit for Live Activities.
- iOS App Groups for shared widget data.
- Android App Widgets for home screen widgets.
- Android native widget configuration for station/commute selection.
- Android shared storage for widget snapshots.

### Backend

- TypeScript Cloudflare Worker or equivalent.
- Strict endpoint allowlist.
- API key stored as backend secret.
- Response validation.
- Cache headers and edge cache.
- Rate limiting.
- Basic structured logs.
- Synthetic health checks.

### Testing

- Unit tests for parsing, cache policy, station matching, and commute logic.
- Component tests or visual regression tests for key React Native UI states if practical.
- Widget timeline tests for stale, loading, error, and normal states.
- Integration tests against mocked WMATA responses.
- Backend tests for caching, rate limiting, and error mapping.
- Manual field testing on iOS and Android at stations and during known service disruptions.

## 11. Data Model Sketch

Core entities:

- `Station`: code, name, lines, latitude, longitude, address, transfer group.
- `Line`: code, name, color, terminals.
- `TrainPrediction`: station code, line, destination, direction, minutes, cars, raw status, observed time.
- `ServiceAlert`: id, severity, title, description, affected lines, affected stations, start/end if available.
- `FacilityOutage`: id, station, type, description, start/end, impact.
- `FavoriteStation`: station code, display order, preferred direction.
- `FavoriteCommute`: origin, destination, preferred line, transfer preference, display order.
- `WidgetSnapshot`: widget id, configuration, predictions, alerts, generated time.

## 12. Implementation Milestones

### Phase 0: Discovery And Product Definition

- Confirm official WMATA data sources, API limits, terms, and attribution requirements.
- Audit competing apps and document the exact must-have feature bar.
- Define MVP scope and non-goals.
- Choose minimum supported iOS and Android versions.
- Choose backend provider.
- Create initial design system direction.
- Create App Store and Google Play product positioning and app name shortlist.

Deliverables:

- Product requirements document.
- API/data feasibility notes.
- MVP feature list.
- Technical architecture decision record.
- Wireframes for core screens and widgets.

### Phase 1: Project Setup

- Create React Native app project.
- Configure Expo prebuild/custom dev client or bare React Native.
- Add iOS widget extension and optional Live Activity extension.
- Add Android widget provider.
- Configure iOS App Group entitlement.
- Configure Android shared widget storage.
- Set up linting and formatting.
- Set up CI.
- Add environment configuration for dev/staging/prod backend URLs.
- Add basic design tokens.

Deliverables:

- Buildable app shell.
- Buildable iOS and Android app shells.
- Buildable iOS and Android widget targets.
- CI running unit tests.
- Shared storage proof of concept.

### Phase 2: WMATA Data Layer

- Implement backend proxy.
- Add WMATA endpoint clients.
- Add typed models and response validation.
- Add caching policy.
- Add local mock data.
- Add app-side repository layer.
- Add error handling for stale data, rate limits, and provider outages.

Deliverables:

- Backend proxy deployed to development.
- App can fetch stations, lines, predictions, and incidents.
- Unit tests for parsing and cache behavior.

### Phase 3: Core App MVP

- Implement station search.
- Implement nearby stations.
- Implement station detail with train predictions.
- Implement service alerts list.
- Implement favorites.
- Implement app deep links.
- Implement loading, empty, error, stale, and offline states.

Deliverables:

- Usable internal MVP.
- TestFlight and Android internal testing builds.
- Manual test script.

### Phase 4: Widgets

- Implement favorite station widget.
- Implement favorite commute widget.
- Implement iOS lock screen widgets.
- Implement iOS App Intent configuration.
- Implement Android widget configuration.
- Implement shared snapshot writing from app to widget.
- Add widget fallback states for no favorite, stale data, and provider outage.
- Add deep links from widgets into the app.

Deliverables:

- Working home screen widgets.
- Working iOS lock screen widgets.
- Working Android home screen widgets.
- Widget test matrix across sizes, light/dark mode, and stale data.

### Phase 5: Trip And Commute Features

- Add favorite commute creation.
- Add basic origin-to-destination guidance.
- Add disruption-aware messaging.
- Add transfer station handling.
- Add optional Live Activity for active commute or station watch.

Deliverables:

- Commute dashboard.
- Live Activity prototype or final implementation.
- Commute-specific widgets if not already included.

### Phase 6: Map And Status Polish

- Add rail map view.
- Add station and line status overlays.
- Add station groups and transfer clarity.
- Improve disruption presentation.
- Add elevator/escalator outage view if included.

Deliverables:

- Map screen.
- Line status summary.
- Better disruption handling.

### Phase 7: Quality, Accessibility, And Performance

- Run VoiceOver pass.
- Run Dynamic Type pass.
- Run contrast audit.
- Run low-connectivity testing.
- Run cold start performance profiling.
- Run widget timeline behavior testing.
- Add crash reporting.
- Add privacy-preserving analytics for feature usage and error rates.

Deliverables:

- Accessibility checklist complete.
- Performance baseline documented.
- Known issue list triaged.

### Phase 8: Beta

- Create TestFlight beta.
- Create Google Play internal testing release.
- Recruit local WMATA riders.
- Collect feedback on prediction usefulness, widget freshness, alert clarity, and favorite setup.
- Monitor backend cost and API request volume.
- Fix high-priority usability and reliability issues.

Deliverables:

- Beta feedback report.
- Cost forecast.
- Launch blocker list closed.

### Phase 9: Store Launch

- Finalize app name, icon, screenshots, preview text, App Store privacy labels, and Google Play Data Safety details.
- Verify WMATA attribution and data usage compliance.
- Prepare support URL and privacy policy.
- Submit for App Store review and Google Play review.
- Monitor crashes, backend errors, API rate limits, and reviews.

Deliverables:

- App Store and Google Play release.
- Production monitoring dashboard.
- Launch retrospective.

### Phase 10: Post-Launch Roadmap

- Push notifications for favorite line or station disruptions.
- Siri Shortcuts for favorite stations or commutes.
- Apple Watch complications or Wear OS tiles if user demand supports them.
- More advanced trip planning.
- Better disruption predictions from historical patterns.
- Crowdsourced station observations only if moderation and privacy are handled well.
- Multi-region architecture only if expanding beyond WMATA.

## 13. Backend Endpoint Outline

Suggested public app-facing endpoints:

- `GET /v1/stations`
- `GET /v1/lines`
- `GET /v1/stations/{stationCode}/predictions`
- `GET /v1/incidents`
- `GET /v1/stations/{stationCode}/alerts`
- `GET /v1/facilities/outages`
- `GET /v1/health`

Backend responsibilities:

- Add WMATA API key.
- Normalize provider responses.
- Cache aggressively but safely.
- Return consistent error shapes.
- Include `generatedAt`, `sourceUpdatedAt` when available, and cache freshness metadata.
- Avoid storing user location or personal data.

## 14. Reliability Requirements

- App must remain useful when real-time data is temporarily unavailable.
- Show stale data clearly.
- Avoid blank widgets.
- Backend should degrade gracefully on WMATA outages.
- App should use local bundled station metadata even if backend is unreachable.
- Monitoring should alert on elevated provider errors, backend errors, or cache misses.

## 15. Privacy Requirements

- No account required.
- Location permission requested only for nearby stations.
- Location should be processed on-device whenever possible.
- Do not send precise location to backend unless a future feature truly requires it.
- Analytics should avoid collecting station-level behavior unless disclosed and necessary.
- Provide clear privacy policy before launch.

## 16. Monetization And Cost Control

Default recommendation: launch free with no ads to build trust and measure usage.

Possible later models:

- Optional tip jar.
- Small one-time paid upgrade for advanced widgets or watch features.
- Subscription only if ongoing premium features justify it.

Cost controls:

- Edge caching for hot station endpoints.
- No user accounts until necessary.
- No database until necessary.
- Minimal analytics event volume.
- Backend rate limiting.
- Static bundled transit metadata.

## 17. Risks And Mitigations

| Risk | Mitigation |
| --- | --- |
| WMATA API limits or outages | Cache, fallback to static GTFS, show stale data clearly |
| Widget refresh expectations | Design widgets around freshness, not exact real-time guarantees |
| API key extraction | Use serverless proxy and backend secrets |
| Complex trip planning scope | Start with favorite station and commute use cases |
| Poor alert clarity | Normalize alerts into severity, affected lines, and rider impact |
| App review/privacy issues | Keep data collection minimal and document it clearly |
| Infrastructure cost growth | Cache hot endpoints, monitor request volume, add rate limits |

## 18. Definition Of MVP

MVP should include:

- Station search.
- Nearby stations.
- Station detail with real-time train predictions.
- Rail incidents/status screen.
- Favorite stations.
- Home screen widget for a favorite station.
- Lock screen widget for a favorite station.
- Basic dark mode and light mode.
- Clear stale/offline states.
- Serverless WMATA proxy.
- Privacy policy and WMATA attribution.

MVP should not include unless time allows:

- User accounts.
- Payments.
- Crowdsourcing.
- Apple Watch or Wear OS app.
- Full multi-modal trip planning.
- Push notifications.
- Advanced historical prediction model.

## 19. Immediate Next Steps

1. Confirm WMATA API access, terms, quotas, attribution, and endpoint coverage.
2. Create the React Native project with iOS, Android, widget, and shared package structure.
3. Build a tiny backend proxy proof of concept.
4. Fetch and display one station's train predictions.
5. Save one favorite station into shared app-widget storage.
6. Render that favorite station in a small widget.
7. Expand into the full MVP flow.

## 20. Reference Links To Verify During Discovery

- WMATA developer portal: https://developer.wmata.com/
- WMATA API catalog: https://developer.wmata.com/docs/services/
- GTFS Realtime reference: https://gtfs.org/documentation/realtime/reference/
- Apple WidgetKit documentation: https://developer.apple.com/documentation/widgetkit
- Apple ActivityKit documentation: https://developer.apple.com/documentation/activitykit
- Apple App Intents documentation: https://developer.apple.com/documentation/appintents
- React Native documentation: https://reactnative.dev/docs/getting-started
- Expo prebuild documentation: https://docs.expo.dev/workflow/prebuild/
- Android app widgets documentation: https://developer.android.com/develop/ui/views/appwidgets/overview
- Cloudflare Workers documentation: https://developers.cloudflare.com/workers/
- Citymapper product reference: https://citymapper.com/
- Transit product reference: https://transitapp.com/
- MetroHero product reference: https://dcmetrohero.com/
