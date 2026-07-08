# WMATA Metro App Build Checklist

Each checkbox is intended to be small enough for one prompt or one user action.

## Discovery

- [x] Confirm WMATA developer account access and available API endpoints.
- [x] Document WMATA API limits, terms, attribution rules, and key handling requirements.
- [x] Choose the minimum supported iOS and Android versions.
- [x] Choose the backend provider for the WMATA API proxy.
- [x] Define the MVP feature list and non-goals.
- [x] Create rough wireframes for Home, Station Detail, Alerts, Map, and Widgets.
- [x] Pick a working app name, iOS bundle identifier, and Android application ID.

## Project Setup

- [x] Create the React Native TypeScript app project.
- [x] Choose Expo prebuild/custom dev client or bare React Native.
- [x] Add the iOS WidgetKit extension.
- [ ] Add the Android App Widget provider.
- [ ] Add the iOS Live Activity extension if it is included in the first build.
- [x] Configure the iOS App Group entitlement for app-widget shared storage.
- [ ] Configure Android shared storage for widget snapshots.
- [x] Add app environments for development, staging, and production.
- [ ] Add navigation and shared app shell dependencies.
- [ ] Add the local persistence library for cache and favorites.
- [x] Add basic formatting, linting, and test commands.
- [ ] Set up CI for iOS, Android, and shared TypeScript tests.

## Backend

- [x] Create the serverless WMATA proxy project.
- [ ] Add secure backend storage for the WMATA API key.
- [x] Implement the station and line metadata endpoints.
- [x] Implement the train prediction endpoint.
- [ ] Implement the incidents and alerts endpoint.
- [x] Add response normalization and validation.
- [x] Add cache headers and short TTL edge caching.
- [ ] Add basic rate limiting and abuse protection.
- [ ] Add backend health checks and structured logging.

## App Data Layer

- [ ] Define TypeScript models for stations, lines, predictions, alerts, outages, favorites, and widget snapshots.
- [x] Add the app-side API client for the backend proxy.
- [ ] Add bundled station and line metadata for offline use.
- [ ] Add local caching for predictions, alerts, and widget snapshots.
- [ ] Add stale, offline, rate-limit, and provider-outage error handling.
- [ ] Add unit tests for parsing and cache behavior.

## Core App

- [ ] Build the main tab shell.
- [ ] Build station search with fuzzy matching.
- [ ] Build nearby stations using on-device location.
- [ ] Build station detail with arrivals grouped by direction.
- [ ] Build service alerts by line and station.
- [ ] Build favorite station saving and ordering.
- [ ] Add deep links for stations, alerts, and favorites.
- [ ] Add loading, empty, stale, offline, and error states.
- [ ] Add light mode and dark mode styling.

## Widgets

- [x] Build the small favorite station home screen widget.
- [x] Build the medium station or commute widget.
- [ ] Build iOS lock screen widgets for next train and line status.
- [ ] Build Android home screen widgets for favorite station and commute status.
- [ ] Add iOS App Intent widget configuration for station selection.
- [ ] Add Android widget configuration for station selection.
- [x] Write widget snapshots from the main app into shared storage.
- [ ] Add widget states for no favorite, stale data, and provider outage.
- [ ] Add widget deep links into the app.

## Commute And Live Features

- [ ] Add favorite commute creation.
- [ ] Add commute detail with next useful train and alert impact.
- [ ] Add transfer guidance for multi-line trips.
- [ ] Add an iOS Live Activity for active station watch or commute watch.
- [ ] Add Android notification-based active station watch or commute watch.
- [ ] Add notification permission flow only when a user enables trip or disruption alerts.

## Map And Status

- [ ] Add a schematic rail map view.
- [ ] Add station selection on the map.
- [ ] Add line status overlays.
- [ ] Add active train positions if the data is reliable enough.
- [ ] Add elevator and escalator outage display if the endpoint is available.

## Quality

- [ ] Run a VoiceOver and TalkBack accessibility pass.
- [ ] Run a Dynamic Type and Android font-scaling layout pass.
- [ ] Run a color contrast pass.
- [ ] Test weak-network and offline behavior.
- [ ] Test widget rendering in all supported sizes.
- [ ] Profile app cold start and station detail load time.
- [ ] Add crash reporting.
- [ ] Add privacy-conscious analytics if needed.

## Beta And Launch

- [ ] Create a TestFlight build.
- [ ] Create a Google Play internal testing build.
- [ ] Recruit beta testers who regularly ride WMATA.
- [ ] Collect feedback on arrivals, alerts, widgets, and station setup.
- [ ] Review backend cost and API request volume.
- [ ] Fix launch-blocking beta issues.
- [ ] Create App Store and Google Play screenshots and product copy.
- [ ] Create the privacy policy and support page.
- [ ] Fill out App Store privacy labels.
- [ ] Fill out Google Play Data Safety details.
- [ ] Verify WMATA attribution before submission.
- [ ] Submit the app for App Store review.
- [ ] Submit the app for Google Play review.

## Post-Launch

- [ ] Monitor crashes, backend errors, and API rate limits after release.
- [ ] Triage App Store reviews and support requests.
- [ ] Decide whether to add push disruption alerts.
- [ ] Decide whether to add Apple Watch or Wear OS support.
- [ ] Decide whether to add Metrobus support.
