# Competitor Research And Feature Requirements

Research date: June 26, 2026

## 1. Apps Reviewed

Primary competitors and references:

- Transit: broad transit app with high store-review volume, real-time arrivals, trip planning, GO navigation, alerts, favorites, offline support, crowdsourced data, payments in some cities, and wearable support.
- Citymapper: highly rated multimodal trip planner with live transit times, step-by-step navigation, saved home/work places, route comparison, cost/duration estimates, wearable support, and lock screen navigation.
- Moovit: broad mobility app with real-time arrivals, step-by-step live navigation, personalized favorites, service alerts, community reports, offline maps, AR wayfinding, and wearable support.
- MetroPulse: WMATA's rail service dashboard with line-level rail service visibility, active trains, headway information, service gaps, route views, and bus/rail sections.
- MetroHero: discontinued but important WMATA-specific reference that riders valued for live train maps, system performance transparency, train positions, headways, service incidents, station/train comments, and archived performance data.
- Apple Maps and Google Maps: baseline expectation for general trip planning, nearby transit, walking directions, and cross-mode routing.

## 2. What Users Like In Competitor Apps

### Fast Nearby Information

Users like opening an app and immediately seeing relevant nearby transit without setup or search. Transit emphasizes showing nearby buses, subway, bikeshare, and other options immediately on launch. This should be copied for WMATA rail by making nearby stations and favorite stations the fastest paths in the app.

Product implication:

- First screen should show nearby stations, favorite stations, and active service issues without requiring a destination search.
- The app should be useful in under five seconds.

### Real-Time Confidence

Transit, Citymapper, and Moovit all market real-time arrivals as core value. App Store reviews also show users strongly judge these apps by arrival accuracy. Positive reviews praise accurate train and bus times; negative reviews focus on vehicles that never arrive, stale positions, or route/station mismatches.

Product implication:

- Every arrival should show whether it is live, scheduled, stale, or unavailable.
- Do not show a scheduled train as if it is live.
- When data is uncertain, the app should say so plainly.

### Trip Guidance For Non-Experts

Citymapper and Moovit are praised for telling users which line to take, walking directions, stop counts, when to transfer, and when to get off. This matters especially for visitors and occasional riders who do not know terminal-direction naming.

Product implication:

- Direction labels must explain both the WMATA terminal and the rider meaning, such as "toward Shady Grove" plus destination context.
- Trip view should show stop count, transfer station, platform/direction, estimated wait, and estimated arrival.
- The app should support both daily commuters and visitors without separate modes.

### Favorites And Saved Places

Transit supports favorite destinations and lines. Citymapper highlights saved home/work places. Moovit supports favorite lines, stations, and places.

Product implication:

- Favorites should be a first-class app model, not just a UI shortcut.
- Users should save stations, lines, and commutes.
- Widgets and notifications should be built from favorites.

### Service Alerts And Disruption Handling

All broad transit competitors present alerts as core. MetroHero and MetroPulse show that WMATA riders also value system-level operational transparency: headways, active trains, service gaps, and live route health.

Product implication:

- Alerts should be attached to lines, stations, and saved commutes.
- The app should translate operational issues into rider impact, not just display raw agency text.
- Line status should include delays, service gaps, average headway, and affected direction when available.

### Offline And Underground Resilience

Transit and Moovit advertise offline schedules/maps. Citymapper reviews specifically praise stored local information because connectivity can disappear on trains or underground.

Product implication:

- Bundle station metadata, line metadata, rail map, and baseline schedules.
- Cache recent predictions and alerts.
- Keep the current trip readable without network.
- Show clear stale timestamps.

### Step-By-Step Active Trip Mode

Transit's GO mode, Citymapper's GO/navigation flow, and Moovit's live navigation are all important differentiators. Users like departure reminders, transfer reminders, and get-off alerts.

Product implication:

- Add an active trip mode after the MVP station-arrival experience is stable.
- Use Live Activities for active station watch or commute watch.
- Support notifications for "leave now", "train arriving", "transfer soon", and "get off next".

### Clear, Simple UI

Positive reviews for Transit and Citymapper repeatedly mention ease of use. Users reward apps that are fast, readable, and reduce transit stress.

Product implication:

- Avoid hiding train times behind route-planning complexity.
- Use compact, scannable station cards.
- Use WMATA line colors, but never rely on color alone.
- Keep primary actions obvious: search, favorite, start trip, widget setup.

### Trust And Low-Friction Monetization

Transit publicly positions itself around low monetization pressure and privacy. Users react positively when apps are useful without aggressive ads or account walls.

Product implication:

- No account required for core features.
- No ads in MVP.
- No dark patterns around subscriptions.
- If monetization is added later, keep core arrival/status features free.

## 3. Common User Pain Points And Gaps

### ETA Accuracy Failures

Pain:

- App says a train or bus is coming, but it does not arrive.
- Vehicle positions disappear and reappear.
- Scheduled data is mistaken for live data.
- Arrival estimates shift without explanation.

Required response:

- Separate live predictions from scheduled fallback.
- Show confidence and freshness.
- Detect and label suspicious predictions.
- Provide "last seen" train data if WMATA supports it.
- Let users report inaccurate predictions to improve diagnostics.

### Wrong Stop, Station, Platform, Or Direction

Pain:

- App sends user to the wrong stop.
- Direction is unclear because trains are labeled by terminal that the user does not recognize.
- Walking guidance to a station entrance or platform is weak.

Required response:

- Build a station and entrance model if WMATA data allows it.
- Explain direction in rider terms: line, terminal, destination, transfer relevance.
- Show full route context so users can sanity-check the train.
- For transfers, show the next line and destination before the user reaches the station.

### Underground GPS And Connectivity Problems

Pain:

- Location does not update underground.
- App loses route progress while the user is already on a trip.
- Live trip mode becomes unreliable when the network drops.

Required response:

- Do not depend solely on live GPS underground.
- Advance trip progress using scheduled stop sequence, elapsed time, and user confirmation when needed.
- Cache the full active trip before departure.
- Allow manual "I'm on this train" and "next stop" correction.

### Alert Overload Or Weak Alert Translation

Pain:

- Agency alerts are verbose.
- Delay text does not answer "does this affect my trip?"
- Alerts may exist but are not attached to the user's station or commute.

Required response:

- Normalize alerts into severity, affected line, affected stations, direction, and rider impact.
- Show alerts inline on station and commute screens.
- Summarize raw alerts into short titles with expandable details.
- Highlight only relevant disruptions on widgets.

### Widget Freshness Expectations

Pain:

- Users expect widgets to be live, but iOS and Android both control widget refresh timing.
- A stale widget can be worse than no widget if it looks current.

Required response:

- Always show last updated time or freshness state.
- Design widgets around "next useful train" and "service status" rather than pretending to be second-by-second.
- Use iOS Live Activities or Android notification-based active trip surfaces where more frequent updates are justified.

### Too Much General Mobility Complexity

Pain:

- Large multimodal apps can feel heavy if the user only wants a WMATA rail answer.
- Ads, payments, scooters, rideshare, and unrelated modes can clutter the main workflow.

Required response:

- Focus first on WMATA rail excellence.
- Add bus, bikeshare, parking, and rideshare only when they support a rail trip.
- Keep the primary rail experience faster than general-purpose apps.

## 4. Feature Requirements For Best-In-Class WMATA App

Implementation direction:

- Use React Native and TypeScript for the shared iOS and Android app.
- Keep Cloudflare as the shared backend/API proxy for both platforms.
- Implement widgets and active-trip surfaces with platform-native code where required: WidgetKit and ActivityKit on iOS, Android App Widgets and notifications on Android.
- Keep widget data in shared serialized snapshots so most business logic remains cross-platform.

### Tier 1: MVP Must-Haves

- Real-time train arrivals by station.
- Station search with fuzzy matching and line filters.
- Nearby stations using on-device location.
- Favorite stations.
- Favorite station home screen widget.
- Favorite station lock screen widget.
- Android home screen widget.
- Service alerts by line and station.
- Clear stale/live/scheduled data labels.
- Last updated timestamp everywhere real-time data appears.
- Offline rail map, station list, and line metadata.
- Light mode, dark mode, Dynamic Type/font scaling, VoiceOver, TalkBack, and non-color status labels.
- Deep links from widgets and notifications into station detail.
- Serverless API proxy with caching and rate limiting.

### Tier 2: Competitive Daily-Commuter Features

- Favorite commutes with origin, destination, preferred line, and preferred direction.
- Commute dashboard showing next useful train, transfer impact, alert impact, and estimated arrival.
- Medium and large widgets for favorite commutes.
- Lock screen widgets for next train and line status.
- Android commute widgets.
- Line status dashboard with headway, active train count, service gaps, and delay severity.
- Station detail grouped by direction and terminal.
- Full route view for each line and train direction.
- Push notifications for favorite line/station disruptions.
- "Is this train useful for me?" logic for saved commutes.
- Data confidence indicators for predictions that look stale or inconsistent.

### Tier 3: Best-App Differentiators

- Live Activity for active station watch or active commute.
- Android notification-based active station watch or active commute.
- "I'm on this train" mode with stop countdown and get-off reminders.
- Transfer guidance with next train, platform/direction, and alert impact.
- Live rail map with train positions if WMATA data supports sufficient accuracy.
- Historical headway and reliability context for stations and lines.
- Rider-friendly alert summaries generated from structured alert data.
- Facility status for elevators and escalators.
- Station entrance guidance where data is available.
- Siri Shortcuts for favorite station, favorite commute, and line status.
- Apple Watch or Wear OS glance for favorite station or active trip.
- Shareable trip status link or message.

### Tier 4: Later Expansion

- Metrobus support if rail MVP proves successful.
- Fare card balance links if WMATA exposes reliable integration or deep links.
- Calendar-aware commute reminders.
- Visitor mode with airport, monuments, and major venue presets.
- Event-aware station recommendations for sports, concerts, and closures.
- Crowdsourced reports for crowding, cleanliness, blocked entrances, police activity, and station conditions.
- Apple Watch complications or Wear OS tiles.
- Historical service quality reports.
- Multi-city support only after WMATA app quality is excellent.

## 5. Required Screens

### Home

Purpose:

- Fastest possible answer to "what train can I catch?"

Must show:

- Favorite stations.
- Nearby stations.
- Relevant alerts.
- Search.
- Last refreshed time.

### Station Detail

Purpose:

- Complete one-station operating picture.

Must show:

- Station name and lines.
- Next trains by direction.
- Destination/terminal.
- Minutes until arrival.
- Live/scheduled/stale state.
- Cars if available.
- Relevant incidents.
- Facility outages if supported.
- Favorite toggle.
- Add widget action.

### Commute

Purpose:

- Tell a commuter what to do next.

Must show:

- Origin and destination.
- Next useful train.
- Transfer if needed.
- Expected arrival.
- Relevant alerts.
- "Start watch" action for Live Activity.

### Alerts

Purpose:

- Make system disruptions understandable.

Must show:

- Systemwide status.
- Line filters.
- Severity.
- Affected stations.
- Direction when available.
- Plain-language rider impact.
- Raw WMATA text behind details.

### Map

Purpose:

- Help users reason about the system visually.

Must show:

- Schematic WMATA rail map.
- Station selection.
- Line status overlay.
- Live train positions when reliable enough.
- Service gap indicators when available.

### Widgets

Purpose:

- Useful glance without opening the app.

Must support:

- Small favorite station widget.
- Medium station or commute widget.
- Large multi-station or commute dashboard widget.
- Circular lock screen line/status widget.
- Rectangular lock screen next train widget.
- Inline lock screen short status widget.
- Android home screen widgets for favorite station and commute status.
- Deep links into the app.
- Stale/no-data states.

## 6. Product Principles

- Be honest about data quality.
- Optimize for the rider standing on a platform with one hand free.
- Make the first screen useful without configuration.
- Make favorites and widgets feel native, not bolted on.
- Prefer WMATA-specific clarity over generic mobility breadth.
- Show the user's relevant disruption before they discover it at the station.
- Avoid ads, account walls, and unnecessary permissions.
- Design for underground use and weak connectivity.
- Keep the app visually polished but operationally direct.

## 7. Recommended MVP Scope

Build the first release around rail only:

1. Nearby stations.
2. Station search.
3. Station detail with real-time predictions.
4. Favorites.
5. Alerts by line/station.
6. Offline station/line/map data.
7. Home screen and lock screen widgets on iOS.
8. Home screen widgets on Android.
9. Clear freshness and confidence states.
10. Serverless WMATA proxy.

Reason:

This is the shortest path to beating general-purpose apps for the most common WMATA rail use case. Full trip planning, bus support, payments, and crowdsourcing are valuable, but they should not slow down the core promise: open the app, know what is happening, catch the right train.

## 8. Sources

- Transit App Store: https://apps.apple.com/us/app/transit-subway-bus-times/id498151501
- Transit product site: https://transitapp.com/
- Citymapper App Store: https://apps.apple.com/us/app/citymapper-all-live-transit/id469463298
- Citymapper product site: https://citymapper.com/
- Moovit App Store: https://apps.apple.com/us/app/moovit-bus-transit-tracker/id498477945
- Moovit product site: https://moovitapp.com/
- MetroPulse rail dashboard: https://metropulse.wmata.com/rail
- MetroHero overview: https://en.wikipedia.org/wiki/MetroHero
- Washington Metro overview, including MetroPulse note: https://en.wikipedia.org/wiki/Washington_Metro
- React Native documentation: https://reactnative.dev/docs/getting-started
- Android app widgets documentation: https://developer.android.com/develop/ui/views/appwidgets/overview
