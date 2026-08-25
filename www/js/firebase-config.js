/*
 * CourseCompass Firebase transport configuration.
 *
 * Leave this value as null to keep CourseCompass in local-only mode.
 * When a Firebase web app has been created, replace null with the exact
 * configuration object supplied by Firebase Project Settings.
 *
 * Firebase web configuration identifies the project; access is protected
 * by Firebase Authentication and the Firestore rules in firestore.rules.
 */
globalThis.COURSECOMPASS_FIREBASE_CONFIG = {
  apiKey: "AIzaSyClxEplvNDw1Z4TMmPR_LA6_LBTxzd_6dA",
  authDomain: "course-compass-6a6b0.firebaseapp.com",
  projectId: "course-compass-6a6b0",
  storageBucket: "course-compass-6a6b0.firebasestorage.app",
  messagingSenderId: "549880997402",
  appId: "1:549880997402:web:8f71928fd6c6cff24c53a3",
  measurementId: "G-X2269XE0KE"
};

/* Example shape (do not copy placeholder values):
globalThis.COURSECOMPASS_FIREBASE_CONFIG = {
    apiKey: '...',
    authDomain: 'your-project.firebaseapp.com',
    projectId: 'your-project',
    storageBucket: 'your-project.firebasestorage.app',
    messagingSenderId: '...',
    appId: '...'
};
*/
