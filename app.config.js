const variants = {
  development: {
    name: 'MetroLens Dev',
    slug: 'metrolens-dev',
    scheme: 'metrolens-dev',
    bundleIdentifier: 'app.metrolens.dev',
    packageName: 'app.metrolens.dev',
  },
  staging: {
    name: 'MetroLens Staging',
    slug: 'metrolens-staging',
    scheme: 'metrolens-staging',
    bundleIdentifier: 'app.metrolens.staging',
    packageName: 'app.metrolens.staging',
  },
  production: {
    name: 'MetroLens',
    slug: 'metrolens',
    scheme: 'metrolens',
    bundleIdentifier: 'app.metrolens.mobile',
    packageName: 'app.metrolens.mobile',
  },
};

const appEnv = process.env.APP_ENV || 'development';
const variant = variants[appEnv] || variants.development;

module.exports = {
  expo: {
    name: variant.name,
    slug: variant.slug,
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    scheme: variant.scheme,
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: variant.bundleIdentifier,
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
    ],
    extra: {
      appEnv,
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8787',
    },
  },
};
