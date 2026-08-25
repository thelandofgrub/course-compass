# CourseCompass Beta Test Plan

## Cohort and duration

Run a 2-4 week closed beta with at least 12 golfers across beginners, experienced players, left/right-handed players, multiple phone sizes, Android/iOS, weak-network conditions, and at least two accessibility-tool users.

## Required scenarios

1. New-player setup, bag customization, backup export/import, and deletion.
2. Eighteen-hole round with screen locked/unlocked, app backgrounded, battery saver, and intermittent connectivity.
3. Two-to-four-player live group: join by code/QR, simultaneous scoring, host lock, reconnect, conflict, and completion.
4. Location denial, approximate location, stale GPS, target selection, and shot measurement.
5. Rapidly changing weather compared with an authoritative local source; note time, course, and difference.
6. Voice enable/disable, recognition accuracy, interruption, headphones, noisy outdoor use, and permission denial.
7. Course strategy and map accuracy for at least five known courses; report hole, tee, source, and discrepancy.
8. Large text, screen reader, high contrast, sunlight, gloves/wet hands, and one-handed use.

## Exit criteria

- No open blocker/critical defects; no repeatable data loss or cross-account access.
- 95% crash-free beta sessions and all automated release gates passing.
- Group score convergence within 5 seconds on stable networks and correct recovery after reconnection.
- GPS/weather uncertainty is visible and no tester treats stale data as current.
- Course-data discrepancies are corrected, removed, or explicitly qualified with provenance.
- Privacy, support, deletion, attribution, and store disclosures reviewed by the product owner.

Use `BETA_FEEDBACK_TEMPLATE.md` for every issue. Do not collect private group codes or passwords.
