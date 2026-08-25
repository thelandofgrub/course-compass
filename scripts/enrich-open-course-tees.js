const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const databasePath = path.join(root, 'data', 'coursecompass-open-courses.json');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function getJson(url) {
    let error;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'CourseCompass-Tee-Enricher/1.0' } });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
            return response.json();
        } catch (current) {
            error = current;
            await sleep(attempt * 1200);
        }
    }
    throw error;
}

function teeYardage(tee, hole) {
    const yardages = hole?.yardages || {};
    const gender = String(tee.gender || '').toLowerCase();
    const base = [tee.tee_name, tee.tee_color, String(tee.tee_key || '').replace(/-(?:male|female)$/i, '')].filter(Boolean);
    const candidates = gender === 'female' ? base.flatMap(value => [`${value} (W)`, value]) : base;
    const key = candidates.find(candidate => Number(yardages[candidate]) > 0) || Object.keys(yardages).find(candidate => candidates.some(value => candidate.toLowerCase() === String(value).toLowerCase()));
    return key && Number(yardages[key]) > 0 ? Math.round(Number(yardages[key])) : 0;
}

function completeTeeSets(tees, holes) {
    if (!Array.isArray(holes) || holes.length !== 18) return [];
    return (Array.isArray(tees) ? tees : []).map(tee => {
        const teeHoles = holes.map(hole => ({ hole: Number(hole.number), yards: teeYardage(tee, hole) })).sort((a, b) => a.hole - b.hole);
        if (teeHoles.length !== 18 || teeHoles.some((hole, index) => hole.hole !== index + 1 || hole.yards < 40 || hole.yards > 900)) return null;
        return {
            id: String(tee.tee_key || `${tee.tee_name}-${tee.gender || ''}`).slice(0, 100),
            name: String(tee.tee_name || tee.tee_color || 'Tee').slice(0, 80),
            color: String(tee.tee_color || '').slice(0, 40),
            gender: String(tee.gender || '').slice(0, 20),
            rating: Number(tee.course_rating) || null,
            slope: Number(tee.slope) || null,
            totalYardage: teeHoles.reduce((sum, hole) => sum + hole.yards, 0),
            holes: teeHoles
        };
    }).filter(Boolean).sort((a, b) => b.totalYardage - a.totalYardage);
}

(async () => {
    const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    let enriched = 0, teeSets = 0, failed = 0;
    for (const [index, course] of database.courses.entries()) {
        if (course.source?.provider !== 'OpenGolfAPI' || !course.source?.providerId || course.holes?.length !== 18) continue;
        process.stdout.write(`[${index + 1}/${database.courses.length}] ${course.name}\n`);
        try {
            const id = encodeURIComponent(course.source.providerId);
            const [teesPayload, holesPayload] = await Promise.all([
                getJson(`https://api.opengolfapi.org/v1/courses/${id}/tees`),
                getJson(`https://api.opengolfapi.org/v1/courses/${id}/holes`)
            ]);
            const sets = completeTeeSets(teesPayload.tees, holesPayload.holes);
            if (sets.length) {
                course.tees = sets;
                course.selectedTeeId = sets.find(tee => tee.name.toLowerCase() === String(course.source.selectedTee?.name || '').toLowerCase())?.id || sets[0].id;
                course.source.multiTeeFetchedAt = new Date().toISOString();
                course.source.multiTeeSetCount = sets.length;
                enriched += 1;
                teeSets += sets.length;
            }
        } catch (error) {
            failed += 1;
            process.stderr.write(`  skipped: ${error.message}\n`);
        }
        await sleep(250);
    }
    database.generatedAt = new Date().toISOString();
    fs.writeFileSync(databasePath, `${JSON.stringify(database, null, 2)}\n`);
    fs.writeFileSync(path.join(root, 'js', 'course-data-open.js'), `/* Generated from the ODbL snapshot. See COURSE_DATA_LICENSE.md. */\nglobalThis.CourseCompassBuiltInCourses = ${JSON.stringify(database.courses, null, 2)};\n`);
    console.log(JSON.stringify({ enrichedCourses: enriched, completeTeeSets: teeSets, failedCourses: failed }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
