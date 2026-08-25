# Controlled Maintenance and Update Pipeline

CourseCompass can regularly inspect itself and prepare reviewable update candidates. It never commits, publishes, deploys, changes production Firebase, or creates native store releases on its own.

## Scheduled checks

### Weekly maintenance audit

`.github/workflows/maintenance-audit.yml` runs each Sunday and can also be started manually. It:

1. Installs the locked dependency tree with `npm ci`.
2. Captures production dependency advisories and available upgrades.
3. Blocks high-severity production dependency findings.
4. Checks course-data age, record-level provenance, ODbL attribution, source links, editorial disclosure, release placeholders, and the offline-cache version.
5. Runs the complete release gate, including browser, accessibility, responsive-layout, performance, and offline-startup tests.
6. Uploads an immutable maintenance report artifact retained for 30 days.

### Monthly course-data preview

`.github/workflows/course-data-preview.yml` resolves the open course sources on the second day of each month. It synchronizes the generated preview into temporary web/native bundles, reruns every release check, and uploads the refreshed source files and a reviewable patch. The workflow has read-only repository permission and does not commit or publish the result.

OpenGolfAPI/OpenStreetMap availability can change. A failed refresh leaves the released snapshot untouched.

## Approval-controlled release package

`.github/workflows/release-candidate.yml` is manual. Before approval it blocks:

- unresolved owner/contact placeholders;
- license, attribution, provenance, or release-test failures;
- high-severity production dependency advisories;
- mismatched web and Capacitor bundles.

After validation, the packaging job references the `release-approval` GitHub environment. Configure that environment in the repository settings with a required reviewer and, where available, prevent self-review. The job then waits for approval before creating the downloadable release candidate. It still does not deploy or upload to an app store.

GitHub environment protection availability depends on repository visibility and account plan. For a private repository whose free plan does not include required reviewers, keep the release workflow manual and require an independent review of the pre-approval artifact before triggering any separate hosting/store process.

## Repository setup

1. Place this project in a GitHub repository with Actions enabled.
2. Keep `package-lock.json` committed.
3. Create the `release-approval` environment.
4. Add the appropriate reviewer and branch restrictions.
5. Run **Controlled Maintenance Audit** manually once.
6. Review its artifact before enabling or relying on the schedules.

The workflows use GitHub-hosted Actions and artifact storage. They introduce no application API charges, but they consume the repository account's included Actions minutes and artifact quota. Reduce the schedule or retention period if the free allocation becomes constrained.

## Local equivalents

- `npm run maintenance:report` — regular maintenance report; owner placeholders are warnings.
- `npm run maintenance:release` — strict release report; owner placeholders are failures.
- `npm run build:course-data` — resolve and enrich course sources for review.
- `npm run verify:release` — complete application release gate.

Developer review remains mandatory for dependency upgrades, course-data changes, legal/editorial content, Firebase configuration, native builds, and public publication.

