# MVP Wireframes

Created: June 26, 2026

These are rough product wireframes for the MVP. The first build should focus on doing two things very well:

1. Help a rider quickly find the next train for a useful station.
2. Keep that station available through favorites and widgets.

Alerts and Map are included because they are part of the product shell, but they should stay simple until the core station experience is excellent.

## Navigation Model

Primary tabs:

- Home
- Alerts
- Map
- Settings

Primary deep links:

- Station detail
- Alert detail
- Widget-selected station

## 1. Home

Purpose:

- Give the rider the fastest answer to "what train can I catch?"
- Prioritize favorites first, then nearby stations, then search.

```
+------------------------------------------------+
| Metro                                          |
| Updated 8:42 AM                         Search |
+------------------------------------------------+
| Favorites                                      |
|                                                |
| +--------------------------------------------+ |
| | Dupont Circle                  Red         | |
| | Glenmont                         3 min     | |
| | Shady Grove                      8 min     | |
| | Minor delay toward Shady Grove             | |
| +--------------------------------------------+ |
|                                                |
| +--------------------------------------------+ |
| | Gallery Place           Red Green Yellow   | |
| | Branch Ave                       2 min     | |
| | Greenbelt                        6 min     | |
| +--------------------------------------------+ |
+------------------------------------------------+
| Nearby                                         |
| +--------------------------------------------+ |
| | Farragut North                 0.2 mi Red  | |
| | Next: Glenmont 4 min                       | |
| +--------------------------------------------+ |
| | Farragut West                  0.3 mi      | |
| | Orange Silver Blue                         | |
| | Next: New Carrollton 5 min                 | |
| +--------------------------------------------+ |
+------------------------------------------------+
| Home             Alerts          Map Settings  |
+------------------------------------------------+
```

Required states:

- No favorites: show nearby stations and a search-first prompt.
- Location disabled: show favorites and search; nearby section becomes opt-in.
- No network: show cached favorites with stale timestamp.
- WMATA unavailable: show cached data and clear provider outage message.
- Loading: skeleton station cards, not a blank page.

Initial Home features:

- Favorite station cards.
- Nearby station cards.
- Global station search.
- Last updated timestamp.
- Inline alert indicator if a favorite station or line is affected.

Defer:

- Complex commute ranking.
- Bus/bikeshare multimodal options.
- Ads, accounts, and personalization beyond favorites.

## 2. Station Detail

Purpose:

- Show a complete, trustworthy one-station view.
- Make direction and freshness obvious.

```
+------------------------------------------------+
| < Home                         Favorite: On    |
| Dupont Circle                                  |
| Red Line                         Updated 8:42  |
+------------------------------------------------+
| Alert                                          |
| Minor delay toward Shady Grove                 |
| Details >                                      |
+------------------------------------------------+
| Toward Glenmont                                |
| +--------------------------------------------+ |
| | Glenmont                         3 min     | |
| | 8 cars  Live                              | |
| +--------------------------------------------+ |
| | Silver Spring                    11 min    | |
| | 6 cars  Live                               | |
| +--------------------------------------------+ |
+------------------------------------------------+
| Toward Shady Grove                             |
| +--------------------------------------------+ |
| | Shady Grove                      8 min     | |
| | 8 cars  Live                              | |
| +--------------------------------------------+ |
| | Shady Grove                      18 min    | |
| | Scheduled fallback                         | |
| +--------------------------------------------+ |
+------------------------------------------------+
| Add Widget              Share Station          |
+------------------------------------------------+
```

Required states:

- Live predictions available.
- Scheduled fallback only.
- Stale predictions.
- No predictions for one direction.
- Station affected by alert.
- Station not affected by alert.
- Favorite on/off.

Initial Station Detail features:

- Station name and lines.
- Arrivals grouped by direction.
- Destination, minutes, car count if available, and live/scheduled/stale label.
- Relevant station or line alerts.
- Favorite toggle.
- Add widget action.
- Last updated timestamp.

Defer:

- Full trip planning.
- Transfer timing.
- Platform/entrance routing unless the data is already easy to consume.

## 3. Alerts

Purpose:

- Make disruptions understandable without overwhelming the user.
- Keep alerts tied to rider impact.

```
+------------------------------------------------+
| Alerts                                  Filter |
+------------------------------------------------+
| System Status                                  |
| +--------------------------------------------+ |
| | Red Line                    Minor delays   | |
| | Orange Line                 Normal         | |
| | Silver Line                 Normal         | |
| | Blue Line                   Normal         | |
| | Yellow Line                 Normal         | |
| | Green Line                  Normal         | |
| +--------------------------------------------+ |
+------------------------------------------------+
| Active Alerts                                  |
| +--------------------------------------------+ |
| | Red Line                                    | |
| | Minor delay toward Shady Grove              | |
| | Affects Dupont Circle and 8 more stations   | |
| | Updated 8:38 AM                         >   | |
| +--------------------------------------------+ |
+------------------------------------------------+
| Home             Alerts          Map Settings  |
+------------------------------------------------+
```

Required states:

- No alerts.
- One alert affecting a favorite.
- Multiple alerts across lines.
- Provider outage or stale alert data.

Initial Alerts features:

- Line-level status summary.
- Active alert list.
- Favorite-relevant alerts surfaced first.
- Plain-language title and affected lines/stations.
- Raw WMATA text behind details.

Defer:

- Historical disruption trends.
- Push alert subscriptions.
- Advanced severity scoring beyond clear MVP labels.

## 4. Map

Purpose:

- Provide visual system context.
- Help users understand stations, transfers, and affected lines.

```
+------------------------------------------------+
| Map                                    Search  |
+------------------------------------------------+
|                                                |
|        [ Simplified WMATA rail map ]           |
|                                                |
|        Red   Orange   Silver   Blue            |
|        Yellow   Green                          |
|                                                |
+------------------------------------------------+
| Selected Station                               |
| +--------------------------------------------+ |
| | Gallery Place          Red Green Yellow    | |
| | Next: Glenmont 4 min                       | |
| | Alerts: None                              | |
| +--------------------------------------------+ |
+------------------------------------------------+
| Home             Alerts          Map Settings  |
+------------------------------------------------+
```

Required states:

- No station selected.
- Station selected.
- Alert overlay active.
- Offline map available.

Initial Map features:

- Static schematic rail map.
- Station selection.
- Selected station summary.
- Deep link to station detail.
- Alert highlighting by line.

Defer:

- Live train positions.
- Animated train movement.
- Station entrance maps.
- Full geographic navigation.

## 5. Widgets

Widgets should be glanceable and honest about freshness. They should never look live if the data is stale.

### iOS Small Home Screen Widget

```
+----------------------+
| Dupont Circle     Red|
| Glenmont        3 min|
| Shady Grove     8 min|
| Updated 8:42        |
+----------------------+
```

### iOS Lock Screen Rectangular Widget

```
+------------------------------+
| Dupont: Glenmont 3m          |
| Updated 8:42                 |
+------------------------------+
```

### Android Home Screen Widget

```
+------------------------------+
| Dupont Circle            Red |
| Glenmont             3 min   |
| Shady Grove          8 min   |
| Minor delay                 |
| Updated 8:42                |
+------------------------------+
```

Required states:

- Favorite selected.
- No favorite selected.
- Live data.
- Stale data.
- No predictions.
- Provider outage.

Initial Widget features:

- One favorite station.
- Next train in each direction when available.
- Line color and text label.
- Last updated timestamp.
- Deep link to station detail.

Defer:

- Multi-station widget.
- Commute widget.
- Widget customization beyond selecting a station.
- Live Activity until the core widget is stable.

## MVP Flow

Recommended first implementation flow:

1. User opens app.
2. User searches for a station or allows nearby stations.
3. User opens Station Detail.
4. User sees live predictions grouped by direction.
5. User favorites the station.
6. User adds the favorite station widget.
7. Widget opens directly back to Station Detail.

## Design Notes

- Use compact station cards rather than large marketing-style panels.
- Make train time the most visually dominant item inside prediction rows.
- Always show freshness for live data.
- Use official line colors where allowed, but pair every color with a text label.
- Keep the first build calm and operational: no decorative background effects, no heavy onboarding, no account wall.
- Design for one-handed use on a platform.
- Optimize for weak network and stale data clarity.
