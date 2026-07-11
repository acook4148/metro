const variants = {
  development: {
    name: 'DC Metro Mate Dev',
    scheme: 'metrolens-dev',
    bundleIdentifier: 'app.metrolens.dev',
    packageName: 'app.metrolens.dev',
  },
  staging: {
    name: 'DC Metro Mate Staging',
    scheme: 'metrolens-staging',
    bundleIdentifier: 'app.metrolens.staging',
    packageName: 'app.metrolens.staging',
  },
  production: {
    name: 'DC Metro Mate',
    scheme: 'metrolens',
    bundleIdentifier: 'app.metrolens.mobile',
    packageName: 'app.metrolens.mobile',
  },
};

const appEnv = process.env.APP_ENV || 'development';
const variant = variants[appEnv] || variants.development;
const slug = 'metrolens-dev';
const appGroupIdentifier = 'group.app.metrolens.mobile';
const appleTeamId = process.env.APPLE_TEAM_ID;

module.exports = {
  expo: {
    name: variant.name,
    slug,
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/logo.png',
    userInterfaceStyle: 'automatic',
    scheme: variant.scheme,
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: variant.bundleIdentifier,
      ...(appleTeamId ? { appleTeamId } : {}),
      entitlements: {
        'com.apple.security.application-groups': [appGroupIdentifier],
      },
    },
    android: {
      package: variant.packageName,
      adaptiveIcon: {
        backgroundColor: '#F7F8FA',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '16.4',
          },
          android: {
            minSdkVersion: 26,
          },
        },
      ],
      '@bacons/apple-targets',
    ],
    extra: {
      appEnv,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8787',
      eas: {
        projectId: "6e13a107-36f9-4df9-b134-260cedd38170"
      }
    },
  },
};
