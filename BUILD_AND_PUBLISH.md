# CourseCompass Build and Publication Guide

Before packaging, review `AUTOMATED_MAINTENANCE.md`. The scheduled workflows prepare immutable maintenance and course-data review artifacts but never publish. Configure the `release-approval` GitHub environment before relying on the manual release-candidate workflow.

## Release verification

From the project root:

```powershell
npm ci
npm run verify:release
npm audit --omit=dev
npx cap sync
```

`verify:release` checks regressions, course-data integrity, recommendation direction/bounds, static release configuration, accessibility, responsive layout, performance budgets, and offline startup. The live Firebase test is intentionally separate because it creates and cleans disposable cloud users and data:

```powershell
npm run test:firebase
```

## Web/PWA

Serve the project over HTTPS. The service worker and manifest use paths relative to the deployed application scope, allowing both a custom-domain root and the GitHub Pages `/course-compass/` project path. Confirm all legal pages resolve at stable public URLs and Firebase authorized domains contain the production host. Do not publish bracketed placeholders from `RELEASE_INFORMATION_REQUIRED.md`.

For GitHub Pages, run `npm run build:pages` to create the whitelisted `dist/pages` artifact. The Pages workflow performs this automatically for pushes to `main`; configure the repository's Pages source as **GitHub Actions**.

For cloud-based native validation without local Apple hardware, use the manual
Codemagic workflow documented in `CODEMAGIC_SETUP.md`. It produces an Android
debug APK and unsigned iOS Simulator app without release signing or publishing.

## Android

Requires the Android SDK and JDK supported by the installed Capacitor version.

```powershell
npx cap sync android
npx cap open android
```

Create a private signing key outside source control, increment version code/name, build a signed Android App Bundle, and exercise the physical-device checklist before upload. Complete Play Console Data safety and account-deletion URL fields from `STORE_PRIVACY_DISCLOSURES.md`.

## iOS

Requires macOS, Xcode, and an Apple Developer team.

```zsh
npx cap sync ios
npx cap open ios
```

Set signing, increment build/marketing versions, archive, validate, then distribute through App Store Connect. Complete App Privacy from `STORE_PRIVACY_DISCLOSURES.md` and verify permission prompts on hardware.

## Release inputs

- Store copy: `STORE_LISTING.md`
- Privacy declarations: `STORE_PRIVACY_DISCLOSURES.md`
- Public policy/support: `legal/`
- Data/service credits: `ATTRIBUTIONS.md`
- Course database license/share-alike offer: `COURSE_DATA_LICENSE.md`
- Beta protocol: `BETA_TEST_PLAN.md`
- Final gate: `RELEASE_READINESS.md`

Store requirements and fees change; confirm them directly in App Store Connect and Play Console at submission time.
