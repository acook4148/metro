# App Store Submission Checklist

Use this checklist before submitting MetroLens to App Review.

## Required Policy And Privacy Items

- [x] Publish a public Privacy Policy URL.
  - Current URL: `https://metrolens.pages.dev/privacy-policy/`
  - Required by Apple for the App Store product page.
  - It should explain that station usage, preferred line, and widget snapshots are stored locally on the device/App Group storage.
  - It should explain that the app contacts the MetroLens API proxy to fetch WMATA rail data.
  - It should include a support/contact method.

- [ ] Complete App Privacy answers in App Store Connect.
  - Apple requires app privacy information for new apps and app updates.
  - Local-only data is not considered collected if it never leaves the device.
  - Confirm Cloudflare Worker log retention before answering "Data Not Collected."
  - If Cloudflare stores request logs or IP addresses beyond servicing the request, disclose the relevant data type and purpose accurately.

- [x] Confirm the app does not track users.
  - No ad SDKs are currently used.
  - No analytics SDKs are currently used.
  - No login/account identifier is currently used.
  - Do not enable App Tracking Transparency unless tracking is added later.

- [x] Confirm third-party SDK disclosures.
  - Current notable dependencies: Expo, React Native, `@bacons/apple-targets`, `expo-file-system`, `expo-constants`, `expo-status-bar`, `react-native-safe-area-context`.
  - Recheck this list if analytics, ads, crash reporting, maps, or auth SDKs are added.

## Apple Developer And App Store Connect Setup

- [ ] Apple Developer Program membership is active.
- [ ] Production bundle ID is final.
- [ ] Widget extension bundle ID is final.
- [ ] Main app and widget extension both have the App Group entitlement enabled.
- [ ] App Group value matches the code: `group.app.metrolens.mobile`.
- [ ] App Store Connect app record exists.
- [ ] App name, subtitle, category, SKU, and copyright are filled in.
- [x] Support URL is public and reachable: `https://metrolens.pages.dev/support/`
- [ ] Marketing URL is added if desired.

## App Metadata

- [ ] App description is accurate and does not overpromise real-time accuracy.
- [ ] Keywords are filled in.
- [ ] "What's New" text is ready for the submitted version.
- [ ] App Review notes explain the widget:
  - Open the app.
  - Select a station.
  - Add the MetroLens widget.
  - Tap refresh on the widget to refresh arrivals.
- [ ] No placeholder text remains in metadata, screenshots, support pages, or policy pages.

## Screenshots And Assets

- [ ] Upload App Store screenshots for the required device sizes.
- [ ] Provide required iPhone screenshots.
  - Prefer current largest iPhone screenshots because App Store Connect can scale down to smaller sizes.
- [ ] Provide iPad screenshots or disable tablet support before submission.
  - Current config has `ios.supportsTablet: true`, so iPad screenshots may be required.
  - If the app is intended iPhone-only, change this before production submission.
- [ ] Confirm app icon is final and renders correctly.
- [ ] App previews are optional; skip unless there is a polished video.

## Age Rating And Compliance

- [ ] Complete the App Store Connect age rating questionnaire.
  - This should likely be low-rated because the app does not include user-generated content, violence, purchases, gambling, or mature content.
- [ ] Complete export compliance.
  - The app uses HTTPS/TLS via normal networking.
  - Answer App Store Connect encryption questions accurately.
  - If Apple determines no documentation is required, consider adding the Info.plist export compliance setting later to avoid repeated prompts.
- [ ] Confirm no regulated medical, financial, gambling, or kids-category claims are present.

## Production Build Readiness

- [ ] Commit and push all current code.
- [ ] Confirm `.env.local` is ignored and no WMATA API key is committed.
- [ ] Confirm production EAS environment uses `EXPO_PUBLIC_API_BASE_URL=https://metrolens-api.wmata.workers.dev`.
- [ ] Confirm Cloudflare Worker is deployed and healthy:
  - `curl https://metrolens-api.wmata.workers.dev/v1/health`
- [ ] Run local validation:
  - `npm run typecheck`
  - `npm run lint`
  - `APPLE_TEAM_ID=YOUR_TEAM_ID npx expo prebuild --platform ios --no-install --clean`
- [ ] Build production iOS:
  - `APPLE_TEAM_ID=YOUR_TEAM_ID npx eas-cli build --profile production --platform ios`
- [ ] Submit with EAS Submit or upload manually:
  - `npx eas-cli submit --platform ios --profile production`

## TestFlight Test Pass

- [ ] Install the production build from TestFlight.
- [ ] Launch app fresh.
- [ ] Confirm station search works.
- [ ] Confirm station grouping works for Metro Center and L'Enfant Plaza.
- [ ] Confirm selected station persists after force-quit/reopen.
- [ ] Confirm preferred line persists after force-quit/reopen.
- [ ] Confirm line order changes in the selected station section.
- [ ] Confirm departures are grouped and sorted by preferred line.
- [ ] Confirm service alert modal scrolls and long text is readable.
- [ ] Add small widget and verify text fits.
- [ ] Add medium widget and verify text fits.
- [ ] Confirm widget refresh button works on iOS 17+.
- [ ] Confirm widget timestamp shows elapsed time instead of `--`.
- [ ] Test on cellular data, not only Wi-Fi.
- [ ] Test after Cloudflare cache expiry by waiting at least 15 seconds and refreshing.

## App Review Risk Checks

- [ ] Backend is live and accessible during App Review.
- [ ] App does not require a local proxy in production.
- [ ] Error states are user-readable if WMATA or Cloudflare is unavailable.
- [ ] App does not claim official WMATA affiliation unless that is authorized.
- [ ] App name, icon, and screenshots avoid implying official WMATA ownership unless authorized.
- [ ] Privacy policy and App Privacy answers match actual Cloudflare/app behavior.
- [ ] Review notes mention that WMATA arrival predictions can expire quickly and are refreshed through the app/widget.

## References

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Apple Age Rating Help: https://developer.apple.com/help/app-store-connect/manage-app-information/set-an-app-age-rating/
- Apple Export Compliance Help: https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance/
- Apple Screenshot Requirements: https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/
- Expo iOS Submit Docs: https://docs.expo.dev/submit/ios/
