const { spawnSync } = require('node:child_process');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const gates = [
    ['Regression suite', 'tests/regression.test.js'],
    ['Course-data integrity', 'tests/course-data-audit.js'],
    ['Recommendation calibration', 'tests/model-calibration.js'],
    ['Static release audit', 'tests/release-static-audit.js'],
    ['Browser, accessibility, performance, and offline smoke test', 'tests/e2e-smoke.js']
];

for (const [name, script] of gates) {
    process.stdout.write(`\n=== ${name} ===\n`);
    const result = spawnSync(process.execPath, [script], { cwd: root, stdio: 'inherit' });
    if (result.status !== 0) {
        console.error(`Release gate stopped at: ${name}`);
        process.exit(result.status || 1);
    }
}

console.log('\nRelease automation passed. Live Firebase, physical-device tests, signed builds, and store-account metadata remain separately controlled gates. Built-in course provenance is covered by the course-data audit.');
