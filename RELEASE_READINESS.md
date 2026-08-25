# CourseCompass Release Readiness

Status date: August 24, 2026

## Automated release candidate status

- [x] 69 regression tests pass.
- [x] All 50 built-in identities have record-level provenance: 34 licensed 18-hole scorecards and 16 intentionally catalog/reference-only records; zero unresolved records.
- [x] Multi-tee expansion publishes 166 complete licensed tee sets across 27 courses and rejects incomplete sets.
- [x] 50 recommendation monotonicity and boundary calibrations pass.
- [x] 37 static release/security/configuration checks pass.
- [x] Browser smoke test passes all seven modules, control labels, keyboard target semantics, image alternatives, duplicate-ID detection, mobile overflow, minimum 24px targets, representative WCAG contrast, 200% text reflow, performance budgets, and offline startup.
- [x] Production dependency audit reports zero known vulnerabilities (`npm audit --omit=dev`).
- [x] Web, Capacitor `www`, Android, and iOS web bundles are synchronized at service-worker cache v53.
- [x] Firestore rules are deployed and the isolated two-client Firebase suite has passed authentication, join, bidirectional scoring, host locks, offline reconciliation, conflict detection, host-account deletion/ownership transfer, and cleanup.
- [x] Android and iOS declare location, microphone, and speech permissions; Android automatic OS backup is disabled.
- [x] Draft public privacy, terms, support, account-deletion, attribution, store disclosure, beta, and security materials are included.
- [x] Provisional phone/tablet screenshots, Google Play feature graphic, and social preview are generated in `release-assets`.
- [x] Read-only weekly maintenance and monthly course-data preview workflows generate review artifacts without committing or publishing; the manual release-candidate workflow references an approval environment.

Run the local gate with `npm run verify:release`. Run `npm run test:firebase` separately only against the intended Firebase project because it creates and cleans disposable test identities/data.

## Product-owner gates before public distribution

- [ ] Replace bracketed developer identity, postal address, monitored support/security email, and public HTTPS URLs. See `RELEASE_INFORMATION_REQUIRED.md`.
- [ ] Publish the legal/support pages and enter stable Privacy, Support, and Account Deletion URLs in both stores.
- [ ] Confirm final bundle identifiers, regions, age/content rating, account modes, and Firebase authorized production domains.
- [ ] Review the privacy and terms drafts with qualified counsel appropriate to the launch regions.
- [x] Exercise anonymous account deletion with disposable live-project accounts, including host ownership transfer and cleanup.
- [ ] Confirm documented Firebase backup/retention language and permanent-account reauthentication behavior before offering email/password accounts publicly.

## Intentionally excluded at the user’s direction

- [ ] Physical-device field testing: GPS accuracy, approximate/denied location, outdoor sunlight, battery/background behavior, device speech, screen readers, and multi-player play on actual hardware.
- [ ] Native release builds: signing keys/certificates, Android App Bundle, Xcode archive, store upload, and native-release screenshots.

Those two excluded gates remain necessary before a responsible native public launch; they cannot be replaced by desktop emulation.
