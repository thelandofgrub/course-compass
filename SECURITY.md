# Security

Report a suspected vulnerability through the repository’s **Security** tab using GitHub private vulnerability reporting: <https://github.com/thelandofgrub/course-compass/security/advisories/new>. Do not open a public issue containing account identifiers, group codes, precise locations, or reproduction data belonging to another player. The repository owner must keep private vulnerability reporting enabled.

Include the app version, affected feature, impact, minimal reproduction steps, and whether disposable test accounts were used. Do not access, alter, or retain data beyond what is necessary to demonstrate the issue.

The maintained security boundary includes Firestore rules, authenticated ownership, host-controlled group configuration, input escaping, strict external URL handling, HTTPS services, local diagnostic export, and account deletion. Firebase web configuration is a public project identifier, not a secret; service-account keys and native signing keys must never be included in the repository.
