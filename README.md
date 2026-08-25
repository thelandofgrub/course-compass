# CourseCompass

CourseCompass is a modern golf companion that combines an on-course caddie,
club and distance tools, score tracking, course strategy, weather context,
voice interaction, coaching, lessons, trivia, and synchronized multiplayer
sessions in a progressive web app with Android and iOS projects.

## Web application

The production PWA is published from the `main` branch by
`.github/workflows/pages.yml`. The workflow builds a whitelisted static bundle
and deploys it through GitHub Pages. The expected project-site address is:

<https://thelandofgrub.github.io/course-compass/>

After the first push, select **Settings > Pages > Build and deployment >
Source: GitHub Actions** in the repository if GitHub has not enabled it
automatically.

## Local development

Requirements: Node.js 22 and npm.

```powershell
npm ci
npx http-server .
```

Open the local HTTPS or HTTP address shown by the server. Location, microphone,
installability, and service-worker behavior should be validated in a secure
context before release.

## Verification

```powershell
npm test
npm run test:course-data
npm run test:calibration
npm run test:release-static
npm run test:e2e
npm run build:pages
```

The live two-device Firebase test is intentionally separate because it creates
and removes disposable Firebase Authentication users and Firestore data:

```powershell
npm run test:firebase
```

See `BUILD_AND_PUBLISH.md` and `FIREBASE_SETUP.md` for complete release and
backend instructions.

## Repository structure

- `index.html`, `css/`, `js/`, `assets/`, `icons/`, `data/`, and `legal/` — web app
- `www/` — synchronized Capacitor web bundle
- `android/` and `ios/` — native projects
- `tests/` — regression, calibration, release, Firebase, and browser checks
- `scripts/` — maintenance, course-data, and Pages build tools
- `.github/workflows/` — review, maintenance, release, and Pages automation

## Firebase and secrets

Firebase client configuration is intentionally part of the browser app and is
not an administrative credential. Access control is enforced by
`firestore.rules`. Never commit service-account keys, signing keys, `.env`
files, or Firebase Admin credentials. Store any future CI secrets in GitHub
Actions secrets.

## Data and licensing

Application source code is licensed under the ISC License. Course records and
third-party components retain their respective terms. Review
`COURSE_DATA_LICENSE.md`, `ATTRIBUTIONS.md`, `THIRD_PARTY_NOTICES.md`, and
`legal/data-licenses.html` before redistribution.

