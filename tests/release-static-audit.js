const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'release-assets', 'reports');
const checks = [];
const record = (name, pass, detail = '') => checks.push({ name, pass: Boolean(pass), detail });
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const required = [
    'legal/privacy.html', 'legal/terms.html', 'legal/support.html', 'legal/delete-account.html',
    'STORE_LISTING.md', 'STORE_PRIVACY_DISCLOSURES.md', 'ATTRIBUTIONS.md',
    'BETA_TEST_PLAN.md', 'BETA_FEEDBACK_TEMPLATE.md', 'SECURITY.md', 'RELEASE_INFORMATION_REQUIRED.md',
    'COURSE_DATA_LICENSE.md', 'data/coursecompass-open-courses.json', 'legal/data-licenses.html',
    'AUTOMATED_MAINTENANCE.md', 'scripts/maintenance-report.js', '.github/workflows/maintenance-audit.yml',
    '.github/workflows/course-data-preview.yml', '.github/workflows/release-candidate.yml',
    '.github/workflows/pages.yml', 'scripts/build-pages.js', 'README.md', 'LICENSE', '.gitignore',
    'codemagic.yaml', 'CODEMAGIC_SETUP.md'
];
for (const file of required) record(`release artifact exists: ${file}`, fs.existsSync(path.join(root, file)));

const androidManifest = read('android/app/src/main/AndroidManifest.xml');
record('Android internet permission is not duplicated', (androidManifest.match(/android.permission.INTERNET/g) || []).length === 1);
record('Android declares location and microphone permissions', ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'RECORD_AUDIO'].every(value => androidManifest.includes(value)));
record('Android OS backup is disabled for local golf data', androidManifest.includes('android:allowBackup="false"'));

const iosPlist = read('ios/App/App/Info.plist');
record('iOS permission descriptions cover location, microphone, and speech', ['NSLocationWhenInUseUsageDescription', 'NSMicrophoneUsageDescription', 'NSSpeechRecognitionUsageDescription'].every(value => iosPlist.includes(value)));

const serviceWorker = read('sw.js');
record('service worker precaches all public legal and course-data files', ['privacy.html', 'terms.html', 'support.html', 'delete-account.html', 'data-licenses.html', 'coursecompass-open-courses.json'].every(value => serviceWorker.includes(value)));
record('service worker has a named, versioned cache', /coursecompass-v\d+/.test(serviceWorker));

const webFiles = ['index.html', 'manifest.json', 'sw.js', 'js/app.js', 'js/storage.js', 'js/voice.js', 'js/lessons.js', 'js/course-data-open.js', 'js/data.js', 'js/caddie.js', 'js/scoring.js', 'js/sync.js', 'css/styles.css'];
const sizeBytes = webFiles.reduce((total, file) => total + fs.statSync(path.join(root, file)).size, 0);
record('core web payload remains below 5 MiB', sizeBytes < 5 * 1024 * 1024, `${sizeBytes} bytes`);
const runtimeText = webFiles.map(file => read(file)).join('\n').replaceAll('http://www.w3.org/2000/svg', '');
record('no insecure HTTP runtime endpoint', !/["'`]http:\/\//i.test(runtimeText), 'HTTPS and same-origin resources only; SVG namespace declarations excluded');
record('no private-key or service-account material in runtime files', !webFiles.some(file => /BEGIN (RSA |EC )?PRIVATE KEY|"private_key"\s*:|"client_email"\s*:/i.test(read(file))));
record('legacy unproven course prose is absent from runtime', !webFiles.some(file => /most photographed hole in golf|Pete Dye's Caribbean masterpiece|greatest second shots in golf/i.test(read(file))));
record('licensed course snapshot loads before the master data module', read('index.html').indexOf('js/course-data-open.js') < read('index.html').indexOf('js/data.js'));
record('external-window links use opener isolation', !/target=["']_blank["'](?![^>]*rel=["'][^"']*noopener)/i.test(read('js/app.js')));

const manifest = JSON.parse(read('manifest.json'));
record('PWA manifest uses standalone display', manifest.display === 'standalone');
record('PWA manifest has maskable and standard icons', manifest.icons?.some(icon => String(icon.purpose).includes('maskable')) && manifest.icons?.some(icon => String(icon.purpose).includes('any')));
record('PWA paths support a GitHub Pages project subpath', manifest.start_url === './index.html' && manifest.scope === './' && !serviceWorker.includes("  '/index.html'") && /serviceWorker\.register\(['\"]sw\.js['\"]/.test(read('index.html')));

const maintenanceWorkflow = read('.github/workflows/maintenance-audit.yml');
const coursePreviewWorkflow = read('.github/workflows/course-data-preview.yml');
const releaseWorkflow = read('.github/workflows/release-candidate.yml');
const codemagicWorkflow = read('codemagic.yaml');
record('scheduled maintenance workflows have read-only repository permission', [maintenanceWorkflow, coursePreviewWorkflow].every(text => /permissions:\s*\n\s*contents:\s*read/.test(text)));
record('scheduled maintenance never commits or publishes', !/git\s+(?:commit|push)|firebase\s+deploy|npm\s+publish/i.test(`${maintenanceWorkflow}\n${coursePreviewWorkflow}`));
record('release package is manual and references an approval environment', /workflow_dispatch:/.test(releaseWorkflow) && /environment:\s*release-approval/.test(releaseWorkflow));
record('Codemagic validation is manual and free-tier bounded', /instance_type:\s*mac_mini_m2/.test(codemagicWorkflow) && /max_build_duration:\s*30/.test(codemagicWorkflow) && !/^\s*triggering:/m.test(codemagicWorkflow));
record('Codemagic validation does not sign or publish store releases', /CODE_SIGNING_ALLOWED=NO/.test(codemagicWorkflow) && !/^\s*publishing:/m.test(codemagicWorkflow) && !/^\s*(?:android_signing|ios_signing):/m.test(codemagicWorkflow));

const syncPairs = ['index.html', 'manifest.json', 'sw.js', 'css/styles.css', 'js/app.js', 'js/storage.js', 'js/voice.js', 'js/lessons.js', 'js/course-data-open.js', 'js/data.js', 'js/caddie.js', 'js/scoring.js', 'js/sync.js', 'data/coursecompass-open-courses.json', 'legal/data-licenses.html'];
const mismatches = syncPairs.filter(file => {
    const nativeFile = path.join(root, 'www', file);
    if (!fs.existsSync(nativeFile)) return true;
    const hash = target => crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex');
    return hash(path.join(root, file)) !== hash(nativeFile);
});
record('web and Capacitor www bundles are synchronized', mismatches.length === 0, mismatches.join(', '));

const failed = checks.filter(check => !check.pass);
const report = {
    generatedAt: new Date().toISOString(),
    status: failed.length ? 'failed' : 'passed',
    checkCount: checks.length,
    failedCount: failed.length,
    manualOwnerActions: 'Store accounts, signing identities, and any jurisdiction-specific developer disclosures remain controlled outside source.',
    checks
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'release-static-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
assert.equal(failed.length, 0, `Static release checks failed: ${failed.map(item => item.name).join('; ')}`);
