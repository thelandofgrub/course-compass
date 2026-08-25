# CourseCompass Firebase Setup

CourseCompass remains fully functional in local-only mode until these steps are completed.

The Firebase Web configuration values identify your Firebase project; they are not private server credentials. Access is enforced by Authentication and the supplied Firestore rules. Never place an Admin SDK private key or service-account JSON in this app.

1. Create a Firebase project at <https://console.firebase.google.com/>.
2. Add a Web application to the project.
3. Copy the supplied configuration object into `js/firebase-config.js`.
4. In Firebase Authentication, enable both **Anonymous** and **Email/Password** sign-in providers.
5. Create a Cloud Firestore database.
6. Install the Firebase CLI if needed: `npm install -g firebase-tools`.
7. Authenticate and select the project:
   - `firebase login`
   - `firebase use --add`
8. Deploy the supplied rules: `firebase deploy --only firestore:rules`.
9. Recopy the web assets into the native apps: `npx cap copy`.

## Data model

- `users/{uid}`: authenticated player metadata.
- `users/{uid}/data/{key}`: private synchronized CourseCompass snapshots.
- `groups/{groupCode}`: invite-only group metadata.
- `groups/{groupCode}/members/{uid}`: authorized group members.
- `groups/{groupCode}/roundStates/{uid}`: one live active-round snapshot per device/player.

The six-character group code acts as the invitation secret. Group listings are denied by the supplied rules. Members can read the group and live states, but a member may write only their own membership and round state.

Guests begin with a separate anonymous user on each device. Creating an email/password account upgrades that anonymous identity without losing its data. On another device, **Sign In & Merge** combines ID-based histories, chooses the newest unfinished round, restores the account profile, and then listens for private data changes in real time.

Web Firestore persistence is enabled with a multi-tab persistent cache. Because that cache can retain synchronized data between sessions, permanent-account users should sign out before leaving a shared device.

## Voice and conversational AI

`js/voice.js` provides typed conversation, device speech recognition where available, spoken replies, navigation, round summaries, glossary answers, and personal club suggestions without a paid AI service.

For genuinely generative speech, Firebase AI Logic can connect the app to the Gemini Live API. Keep that as an optional deployment feature: enable App Check, obtain microphone consent, publish a privacy notice, impose usage limits, and clearly label generated advice. The Live API is currently a preview feature, so the local Voice Caddie should remain the reliable fallback.

### Current zero-cost policy

`js/ai-policy.js` fixes the current operating mode to `free-tier-only`, sets the maximum intended monthly cost to `$0`, disables remote generative AI, and falls back to the device assistant if quotas are unavailable. CourseCompass does not import Firebase AI Logic, call Gemini, deploy Cloud Functions, or contain a paid-provider credential.

Keep the Firebase project on the no-cost Spark plan with no linked Cloud Billing account. On Spark, exceeding a product's no-cost quota stops that product until its quota resets instead of creating pay-as-you-go charges. Do not enable Blaze, Agent Platform/Vertex AI, phone authentication, paid App Check attestation, or billable Google Cloud services under this policy.

## Before public production

- Add permanent sign-in (email link, passkey, Google, or Apple) and link anonymous accounts.
- Enable Firebase App Check for the web, Android, and Apple apps.
- Test rules with the Firestore Emulator Suite.
- Configure usage and billing alerts.
- Add account deletion, group ownership transfer, and privacy-policy flows.
