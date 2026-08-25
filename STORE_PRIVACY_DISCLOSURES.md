# Store Privacy Disclosure Working Sheet

This is a conservative implementation-based draft. Reconfirm against the exact signed build and current store questionnaires before submission.

| Data category | Collected/stored | Purpose | Linked to user | Tracking |
|---|---|---|---|---|
| Name/player profile | Local; Firebase when sync is enabled | App functionality, personalization | Yes in cloud account | No |
| Email address | Firebase only for optional permanent account | Authentication, account management | Yes | No |
| User/account identifier | Firebase when sync is enabled | Authentication and data isolation | Yes | No |
| Gameplay content (clubs, scores, rounds, shots, custom courses) | Local; selected data in Firebase when sync is enabled | App functionality, analytics shown to the player | Yes in cloud account | No |
| Precise location | Used transiently after permission; not stored as location history in group data | Nearby courses, yardage, maps, weather, shot measurement | Generally no persistent location history | No |
| Voice audio | Passed to device/browser speech service when listening is requested; not stored by CourseCompass in Firebase | Voice control | Provider-dependent | No CourseCompass tracking |
| Diagnostics | Exported locally only when requested | Support | Player controls the file | No |

Third-party processors/services: Google Firebase (Authentication and Firestore), Open-Meteo, OpenGolfAPI, OpenStreetMap/Overpass endpoints, U.S. Geological Survey elevation and imagery services, and device/browser speech services. Network requests inherently disclose IP address and may include requested coordinates.

CourseCompass does not initialize advertising, ad attribution, cross-app tracking, payments, or Firebase Analytics. QR group invitations are rendered locally.

The bundled course database contains attributed ODbL data from OpenStreetMap/OpenGolfAPI. Its exact JSON snapshot and license notice are available from the in-app Course data link.

Required public URLs before submission:

- Privacy: `https://thelandofgrub.github.io/course-compass/legal/privacy.html`
- Support: `https://thelandofgrub.github.io/course-compass/legal/support.html`
- Account deletion: `https://thelandofgrub.github.io/course-compass/legal/delete-account.html`
