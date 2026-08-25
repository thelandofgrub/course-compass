# Firebase Two-Client Integration Test

Last successful run: 2026-08-24

Project: `course-compass-6a6b0`

The automated test opens two isolated browser profiles, each with its own anonymous Firebase account, player ID, device ID, local storage, and Firestore persistence context.

Verified behavior:

- Independent anonymous authentication
- Distinct player and device identities
- Live group creation and joining
- Real-time bidirectional score propagation
- Host hole-lock propagation and enforcement
- Offline outbox retention and reconciliation after reconnect
- Duplicate-player identity conflict detection and recovery
- Host-account deletion, ownership transfer to the remaining player, and removal of the deleted host's cloud records
- Deletion of the disposable group, memberships, round states, personal documents, and anonymous users

The ownership-transfer Firestore rule revision was compiled and deployed successfully on August 24, 2026.

Run with:

```text
npm run test:firebase
```

This test validates browser/Firebase behavior. Physical Android and iOS testing is still required for operating-system lifecycle, radio switching, background recovery, and battery behavior.
