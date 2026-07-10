# iOS Widget Implementation Notes

## Current Status

The app now includes a native iOS WidgetKit target powered by `@bacons/apple-targets`.

Widget target:

- `targets/metrolens-widget/expo-target.config.js`
- `targets/metrolens-widget/MetroLensWidget.swift`

The widget target currently requires iOS 17+ so it can use WidgetKit's `contentMarginsDisabled()` API and fill the widget container without side gutters.

The app writes a compact station widget snapshot after every successful station load.

Snapshot writer:

- `src/storage/widgetSnapshotStore.ts`

Snapshot trigger:

- `src/screens/HomeScreen.tsx`

Current snapshot contents:

- Selected station name.
- Selected station code group.
- Lines served by the selected station.
- Up to 8 next train predictions.
- Active alert count.
- WMATA fetch timestamp.
- Local snapshot generation timestamp.

## Important Constraint

The current snapshot is written into both:

- The Expo app document directory, for app-side fallback/debugging.
- The iOS App Group through `@bacons/apple-targets` `ExtensionStorage`, for WidgetKit.

Configured App Group:

- `group.app.metrolens.mobile`

The widget reads the snapshot from `UserDefaults(suiteName: "group.app.metrolens.mobile")` using key:

- `stationWidgetSnapshot`

## Remaining Native Build Requirement

Set your Apple Team ID before prebuild/build:

```sh
export APPLE_TEAM_ID=YOUR_TEAM_ID
```

The app config reads this value into `ios.appleTeamId`.

## Testing

Widgets cannot be tested in Expo Go.

To test with EAS:

1. Log in to Expo/EAS:

```sh
npx eas-cli login
```

2. Set the Apple Team ID:

```sh
export APPLE_TEAM_ID=YOUR_TEAM_ID
```

3. Configure EAS if this project is not already linked:

```sh
npx eas-cli build:configure
```

4. Create an internal iOS build:

```sh
APPLE_TEAM_ID=YOUR_TEAM_ID npx eas-cli build --profile development --platform ios
```

5. Install the internal build on the iPhone.
6. Open DC Metro Mate and select a station.
7. Long-press the iPhone Home Screen.
8. Tap `+`.
9. Search for `DC Metro Mate`.
10. Add the small or medium DC Metro Mate widget.
11. Confirm the widget shows the selected station and last snapshot.

To inspect the generated native target locally:

```sh
APPLE_TEAM_ID=YOUR_TEAM_ID npx expo prebuild --platform ios --clean
```

This generates an ignored `ios/` directory. The widget source remains tracked under `targets/metrolens-widget/`.
