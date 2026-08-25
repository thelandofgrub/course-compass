const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const reportDir = path.join(root, 'release-assets', 'reports');
const sandbox = {
    console,
    GolfData: {},
    sessionStorage: { getItem: () => null, setItem() {} },
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] }
};
vm.createContext(sandbox);
vm.runInContext(`${fs.readFileSync(path.join(root, 'js', 'caddie.js'), 'utf8')}\nglobalThis.__caddie = Caddie;`, sandbox);
const calculate = input => sandbox.__caddie.calculateShotPlan(input);
const checks = [];
const check = (name, pass, evidence) => checks.push({ name, pass: Boolean(pass), evidence });

for (const distance of [80, 120, 160, 220]) {
    const neutral = calculate({ distance, temperature: 72 });
    const head5 = calculate({ distance, windSpeed: 5, windDirection: 'head', temperature: 72 });
    const head15 = calculate({ distance, windSpeed: 15, windDirection: 'head', temperature: 72 });
    const tail5 = calculate({ distance, windSpeed: 5, windDirection: 'tail', temperature: 72 });
    const tail15 = calculate({ distance, windSpeed: 15, windDirection: 'tail', temperature: 72 });
    check(`${distance} yd: stronger headwind never reduces effective distance`, neutral.effectiveDistance <= head5.effectiveDistance && head5.effectiveDistance <= head15.effectiveDistance, { neutral, head5, head15 });
    check(`${distance} yd: stronger tailwind never increases effective distance`, neutral.effectiveDistance >= tail5.effectiveDistance && tail5.effectiveDistance >= tail15.effectiveDistance, { neutral, tail5, tail15 });
}

const baseline = calculate({ distance: 150, temperature: 72 });
const comparisons = {
    uphill: calculate({ distance: 150, elevation: 30, temperature: 72 }),
    downhill: calculate({ distance: 150, elevation: -30, temperature: 72 }),
    cold: calculate({ distance: 150, temperature: 42 }),
    warm: calculate({ distance: 150, temperature: 102 }),
    altitude: calculate({ distance: 150, altitude: 5000, temperature: 72 }),
    crossLeft: calculate({ distance: 150, windSpeed: 12, windDirection: 'cross-l', temperature: 72 }),
    crossRight: calculate({ distance: 150, windSpeed: 12, windDirection: 'cross-r', temperature: 72 })
};
check('uphill adds playing distance', comparisons.uphill.effectiveDistance > baseline.effectiveDistance, comparisons.uphill);
check('downhill removes playing distance', comparisons.downhill.effectiveDistance < baseline.effectiveDistance, comparisons.downhill);
check('cold adds playing distance', comparisons.cold.effectiveDistance > baseline.effectiveDistance, comparisons.cold);
check('warm removes playing distance', comparisons.warm.effectiveDistance < baseline.effectiveDistance, comparisons.warm);
check('altitude removes playing distance', comparisons.altitude.effectiveDistance < baseline.effectiveDistance, comparisons.altitude);
check('crosswind preserves distance and provides directional drift', comparisons.crossLeft.effectiveDistance === baseline.effectiveDistance && comparisons.crossLeft.aimDirection === 'left' && comparisons.crossRight.aimDirection === 'right' && comparisons.crossLeft.drift > 0, comparisons);

for (let distance = 1; distance <= 600; distance += 17) {
    const extreme = calculate({ distance, elevation: 200, windSpeed: 50, windDirection: 'head', temperature: 0, altitude: 12000, lie: 'deep-rough' });
    check(`${distance} yd: extreme output stays within calculator bounds`, extreme.effectiveDistance >= 1 && extreme.effectiveDistance <= 700, extreme);
}

const failed = checks.filter(item => !item.pass);
const report = {
    generatedAt: new Date().toISOString(),
    status: failed.length ? 'failed' : 'passed',
    note: 'Synthetic directional and boundary checks; not a substitute for launch-monitor or on-course calibration.',
    checkCount: checks.length,
    failedCount: failed.length,
    checks
};
fs.mkdirSync(reportDir, { recursive: true });
fs.writeFileSync(path.join(reportDir, 'recommendation-calibration.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ status: report.status, checkCount: report.checkCount, failedCount: report.failedCount }, null, 2));
if (failed.length) process.exitCode = 1;
