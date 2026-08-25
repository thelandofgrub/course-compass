# Codemagic setup

CourseCompass includes a manual native-validation workflow in `codemagic.yaml`.
It intentionally creates only an Android debug APK and an unsigned iOS
Simulator app. It does not publish, sign a store release, or use store
credentials.

## Free-tier guardrails

- The workflow uses `mac_mini_m2`, the machine covered by Codemagic's individual
  free allowance.
- No automatic `triggering` section is defined, so builds are started manually.
- Each build is limited to 30 minutes.
- Do not enable postpaid billing if usage beyond the free allowance is
  impermissible. Confirm the remaining allowance in Codemagic before starting a
  build.

## Connect the repository

1. Sign in to Codemagic using an individual account rather than a paid Team.
2. Select **Add application** and connect GitHub.
3. Choose `thelandofgrub/course-compass` and grant access only to this repository
   if practical.
4. Select the repository root and finish adding the application.
5. In the application, scan the `main` branch for `codemagic.yaml`.
6. Select **CourseCompass native validation** and start it manually.

No environment-variable groups, signing identities, API keys, or secrets are
needed for this validation workflow.

## Expected artifacts

- Android debug APK from `android/app/build/outputs/apk/debug/`
- Unsigned iOS Simulator `.app` from
  `ios/App/build/Build/Products/Debug-iphonesimulator/`
- Maintenance and test reports from `release-assets/reports/`

The iOS artifact runs in the Simulator only. Installing on physical Apple
devices or distributing through TestFlight requires Apple code signing and an
Apple Developer Program account. Android Play distribution similarly requires
a private upload keystore. Those release workflows should be added only when
the owner supplies the appropriate accounts and credentials through
Codemagic—not through GitHub.

## Troubleshooting

- If the workflow is not detected, confirm the file is named exactly
  `codemagic.yaml` and is present at the repository root on `main`.
- If Capacitor synchronization fails, inspect the npm step first and verify the
  lockfile is unchanged.
- If Android cannot locate its SDK, confirm Codemagic exports
  `ANDROID_SDK_ROOT`; the workflow writes it to `android/local.properties`.
- If Xcode cannot find the scheme, confirm the shared scheme is named `App` in
  `ios/App/App.xcodeproj`.

