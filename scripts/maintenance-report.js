const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const strictRelease = process.argv.includes('--release');
const reportDir = path.join(root, 'release-assets', 'reports');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const snapshot = JSON.parse(read('data/coursecompass-open-courses.json'));
const now = Date.now();
const ageDays = value => {
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? Math.floor((now - parsed) / 86400000) : null;
};
const checks = [];
const add = (name, status, detail, action = '') => checks.push({ name, status, detail, action });

const courses = Array.isArray(snapshot.courses) ? snapshot.courses : [];
const completeTeeSets = courses.reduce((total, course) => total + (course.tees || []).filter(tee => Array.isArray(tee.holes) && tee.holes.length === 18).length, 0);
const unresolved = courses.filter(course => !course.source?.provider || !course.source?.license || !course.source?.attribution);
const fetchedDates = courses.map(course => course.source?.multiTeeFetchedAt || course.source?.fetchedAt).filter(Boolean);
const oldestSourceAge = fetchedDates.length ? Math.max(...fetchedDates.map(ageDays).filter(Number.isFinite)) : null;
const snapshotAge = ageDays(snapshot.generatedAt);

add('Course snapshot age', snapshotAge !== null && snapshotAge <= 120 ? 'pass' : snapshotAge !== null && snapshotAge <= 180 ? 'warn' : 'fail', snapshotAge === null ? 'No valid generatedAt timestamp.' : `${snapshotAge} days old.`, 'Run npm run build:course-data and review the generated diff.');
add('Oldest course-source retrieval', oldestSourceAge !== null && oldestSourceAge <= 180 ? 'pass' : 'warn', oldestSourceAge === null ? 'No source retrieval timestamps.' : `${oldestSourceAge} days old.`, 'Run the monthly course-data preview.');
add('Record-level provenance', unresolved.length ? 'fail' : 'pass', `${courses.length - unresolved.length}/${courses.length} records include provider, license, and attribution.`, unresolved.length ? `Resolve: ${unresolved.map(course => course.name).join(', ')}` : '');
add('Complete tee sets', completeTeeSets ? 'pass' : 'fail', `${completeTeeSets} complete 18-hole tee sets.`, 'Review availability changes in the course-data preview.');
add('Snapshot license', snapshot.license === 'ODbL-1.0' ? 'pass' : 'fail', snapshot.license || 'Missing.', 'Do not publish course data without a recognized license.');
add('Source terms use HTTPS', (snapshot.sourceTerms || []).length > 0 && snapshot.sourceTerms.every(url => /^https:\/\//.test(url)) ? 'pass' : 'fail', `${(snapshot.sourceTerms || []).length} source-terms links checked.`, 'Replace missing or insecure terms links.');

const licensingText = `${read('COURSE_DATA_LICENSE.md')}\n${read('ATTRIBUTIONS.md')}\n${read('legal/data-licenses.html')}`;
add('Public attribution coverage', /OpenStreetMap contributors/i.test(licensingText) && /ODbL/i.test(licensingText) ? 'pass' : 'fail', 'Course license and attribution documents inspected.', 'Restore required ODbL attribution before release.');

const legalFiles = ['legal/privacy.html', 'legal/terms.html', 'legal/support.html', 'legal/delete-account.html'];
const placeholderPattern = /\[(?:DEVELOPER LEGAL NAME|POSTAL ADDRESS|SUPPORT EMAIL|SECURITY EMAIL|PUBLIC [^\]]+ URL)\]/gi;
const placeholderCount = legalFiles.reduce((total, file) => total + (read(file).match(placeholderPattern) || []).length, 0);
add('Owner and public-contact metadata', placeholderCount ? (strictRelease ? 'fail' : 'warn') : 'pass', placeholderCount ? `${placeholderCount} release placeholders remain.` : 'No bracketed owner/contact placeholders found.', 'Complete RELEASE_INFORMATION_REQUIRED.md before public distribution.');

const referenceFiles = ['js/leaderboard.js', 'js/trivia.js', 'js/lessons.js', 'js/data.js'];
const referenceText = referenceFiles.map(read).join('\n');
add('Reference-data disclosure', /reference data|simulated|illustrative|not live/i.test(referenceText) ? 'pass' : 'warn', `${referenceFiles.length} editorial/reference modules inspected.`, 'Review time-sensitive tour, rules, lesson, and trivia content.');

const serviceWorker = read('sw.js');
const cacheMatch = serviceWorker.match(/coursecompass-v(\d+)/);
add('Versioned offline cache', cacheMatch ? 'pass' : 'fail', cacheMatch ? `Cache version v${cacheMatch[1]}.` : 'No versioned cache found.', 'Increment the cache for every public runtime update.');

const failures = checks.filter(check => check.status === 'fail');
const warnings = checks.filter(check => check.status === 'warn');
const report = {
    generatedAt: new Date().toISOString(), strictRelease,
    status: failures.length ? 'failed' : warnings.length ? 'passed-with-warnings' : 'passed',
    summary: { checks: checks.length, passed: checks.filter(check => check.status === 'pass').length, warnings: warnings.length, failures: failures.length },
    inventory: { courses: courses.length, completeTeeSets, snapshotGeneratedAt: snapshot.generatedAt, node: process.version },
    checks
};

fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'maintenance-report.json'), `${JSON.stringify(report, null, 2)}\n`);
const markdown = [`# CourseCompass Maintenance Report`, '', `Generated: ${report.generatedAt}`, '', `Status: **${report.status}**`, '', `| Check | Status | Detail | Follow-up |`, `|---|---|---|---|`, ...checks.map(check => `| ${check.name} | ${check.status.toUpperCase()} | ${String(check.detail).replaceAll('|', '\\|')} | ${String(check.action).replaceAll('|', '\\|')} |`), '', `Failures block a release candidate. Warnings require product-owner review but do not silently modify or publish the application.`, ''].join('\n');
fs.writeFileSync(path.join(reportDir, 'maintenance-report.md'), markdown);
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
