const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const fetchedAt = new Date().toISOString();
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const OSM_ELEMENT_OVERRIDES = { 'barnbougle-dunes': { type: 'way', id: 194005453 } };
const OFFICIAL_REFERENCE_OVERRIDES = {
    'royal-melbourne-west': {
        name: 'Royal Melbourne Golf Club — West Course',
        location: 'Black Rock, Victoria, Australia',
        url: 'https://www.royalmelbourne.com.au/courses/the-west-course/',
        note: 'The official club website verifies the West Course identity. No scorecard, descriptive copy, coordinates, or layout data are reproduced.'
    },
    'trump-turnberry-ailsa': {
        name: 'Turnberry — Championship Ailsa Course',
        location: 'Turnberry, Ayrshire, Scotland',
        url: 'https://www.turnberry.co.uk/ailsa-golf-course-scotland',
        note: 'The official resort website verifies the Championship Ailsa identity. No scorecard, descriptive copy, coordinates, or layout data are reproduced.'
    },
    'royal-dornoch': {
        name: 'Royal Dornoch — Championship Course',
        location: 'Dornoch, Scotland',
        url: 'https://royaldornoch.com/championship-course-2/',
        note: 'The official club website verifies the Championship Course identity. No scorecard, descriptive copy, coordinates, or layout data are reproduced.'
    },
    'cabot-cliffs': {
        name: 'Cabot Cliffs',
        location: 'Inverness, Nova Scotia, Canada',
        url: 'https://cabot.com/capebreton/golf/cabot-cliffs/',
        note: 'The official resort website verifies the Cabot Cliffs identity. No scorecard, descriptive copy, coordinates, or layout data are reproduced.'
    },
    'cabo-del-sol-ocean': {
        name: 'Cove Club Golf Course (formerly Ocean Course)',
        location: 'Cabo Del Sol, Los Cabos, Mexico',
        url: 'https://cabodelsol.com/cove-club-course/',
        note: 'The official course website verifies the current identity and former name. No scorecard, descriptive copy, coordinates, or layout data are reproduced.'
    }
};

function loadExistingCourses() {
    const snapshotPath = path.join(root, 'data', 'coursecompass-open-courses.json');
    if (fs.existsSync(snapshotPath)) return JSON.parse(fs.readFileSync(snapshotPath, 'utf8')).courses || [];
    const sandbox = {
        console,
        CourseCompassStore: { getRaw: () => null, setRaw() {}, remove() {}, getJSON: (_key, fallback) => fallback, setJSON() {} },
        localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
        document: { createElement: () => ({ set textContent(value) { this.innerHTML = String(value); }, innerHTML: '' }) }
    };
    vm.createContext(sandbox);
    vm.runInContext(`${fs.readFileSync(path.join(root, 'js', 'data.js'), 'utf8')}\nglobalThis.__courses = GolfData.courses;`, sandbox);
    return JSON.parse(JSON.stringify(sandbox.__courses));
}

function normalized(value) {
    return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
        .replace(/\b(the|golf|club|course|country|links|resort|and|of|no)\b/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ').trim();
}

function similarity(left, right) {
    const a = new Set(normalized(left).split(' ').filter(Boolean));
    const b = new Set(normalized(right).split(' ').filter(Boolean));
    if (!a.size || !b.size) return 0;
    const overlap = [...a].filter(token => b.has(token)).length;
    return overlap / Math.max(a.size, b.size);
}

function distanceMiles(aLat, aLon, bLat, bLon) {
    const radians = degrees => degrees * Math.PI / 180;
    const dLat = radians(bLat - aLat), dLon = radians(bLon - aLon);
    const value = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLon / 2) ** 2;
    return 3958.8 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function getJson(url) {
    let lastError;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const response = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'CourseCompass-Provenance-Resolver/1.0' } });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
            return response.json();
        } catch (error) {
            lastError = error;
            if (attempt < 3) await sleep(String(error.message).startsWith('429') ? 5000 : 1400 * attempt);
        }
    }
    throw lastError;
}

function generatedTip(hole) {
    const distance = Number(hole.yards);
    if (hole.par === 3) return `Confirm the playing distance and wind, then favor the center of the green. The sourced tee distance is ${distance} yards.`;
    if (hole.par === 5) return `Choose a tee target that keeps the next shot in position. The sourced tee distance is ${distance} yards; use a three-shot plan unless conditions clearly favor more.`;
    return `Prioritize a playable approach angle and adjust for current conditions. The sourced tee distance is ${distance} yards.`;
}

function baseHole(number, par, yards, strokeIndex, geometry = null) {
    const hole = {
        hole: number,
        par,
        yards,
        strokeIndex: Number(strokeIndex) || null,
        type: `Par ${par}`,
        fairwayShape: 'source-not-specified',
        elevation: 'source-not-specified',
        hazards: [],
        greenShape: 'source-not-specified',
        greenSlope: 'source-not-specified'
    };
    hole.tip = generatedTip(hole);
    if (geometry?.length >= 2) hole.mapGeometry = { source: 'OpenStreetMap', path: geometry.map(point => ({ lat: Number(point.lat), lon: Number(point.lon) })) };
    return hole;
}

function chooseOpenGolfTee(tees, holes) {
    const candidates = tees.filter(tee => String(tee.gender || '').toLowerCase() === 'male').sort((a, b) => Number(b.yardage || 0) - Number(a.yardage || 0));
    const matchedTee = candidates.find(tee => {
        const keys = [tee.tee_color, tee.tee_name, String(tee.tee_key || '').split('-')[0]].map(value => String(value || '').toLowerCase());
        return holes.every(hole => keys.some(key => Number(hole.yardages?.[key]) > 0));
    });
    if (matchedTee) {
        const key = [matchedTee.tee_color, matchedTee.tee_name, String(matchedTee.tee_key || '').split('-')[0]].map(value => String(value || '').toLowerCase()).find(value => holes.every(hole => Number(hole.yardages?.[value]) > 0));
        return { tee: matchedTee, key };
    }
    const commonKeys = holes.reduce((common, hole, index) => {
        const keys = Object.keys(hole.yardages || {}).filter(key => Number(hole.yardages[key]) > 0);
        return index ? common.filter(key => keys.includes(key)) : keys;
    }, []);
    const key = commonKeys.sort((a, b) => holes.reduce((sum, hole) => sum + Number(hole.yardages[b] || 0), 0) - holes.reduce((sum, hole) => sum + Number(hole.yardages[a] || 0), 0))[0];
    return key ? { tee: candidates.find(item => [item.tee_color, item.tee_name, String(item.tee_key || '').split('-')[0]].some(value => String(value || '').toLowerCase() === key)) || null, key } : null;
}

async function resolveOpenGolf(course) {
    const queryNames = [...new Set([course.name.replace(/\s+[—-].*$/, ''), normalized(course.name).split(' ').slice(0, 4).join(' ')])];
    const searches = [];
    for (const queryName of queryNames) {
        const payload = await getJson(`https://api.opengolfapi.org/v1/courses/search?q=${encodeURIComponent(queryName)}&limit=20`);
        searches.push(...(payload.courses || []));
    }
    const unique = [...new Map(searches.map(candidate => [candidate.id, candidate])).values()];
    const ranked = unique.map(candidate => ({
        candidate,
        nameScore: similarity(course.name, candidate.name || candidate.course_name),
        miles: distanceMiles(course.lat, course.lon, Number(candidate.latitude), Number(candidate.longitude))
    })).filter(item => item.nameScore >= 0.35 && item.miles <= 35).sort((a, b) => (b.nameScore - a.nameScore) || (a.miles - b.miles));
    if (!ranked.length) throw new Error('No OpenGolf match within 35 miles.');
    const match = ranked[0].candidate;
    const [detail, holesPayload, teesPayload] = await Promise.all([
        getJson(`https://api.opengolfapi.org/v1/courses/${encodeURIComponent(match.id)}`),
        getJson(`https://api.opengolfapi.org/v1/courses/${encodeURIComponent(match.id)}/holes`),
        getJson(`https://api.opengolfapi.org/v1/courses/${encodeURIComponent(match.id)}/tees`)
    ]);
    const rawHoles = holesPayload.holes || [];
    const selection = chooseOpenGolfTee(teesPayload.tees || [], rawHoles);
    if (rawHoles.length !== 18 || !selection) throw new Error('OpenGolf record lacks one complete 18-hole yardage set.');
    const { tee, key: yardageKey } = selection;
    const holes = rawHoles.map(raw => {
        const yards = Number(raw.yardages?.[yardageKey]);
        return baseHole(Number(raw.number), Number(raw.par), yards, raw.handicap_index);
    }).sort((a, b) => a.hole - b.hole);
    return {
        id: course.id,
        name: detail.name || detail.course_name,
        location: [detail.city, detail.state].filter(Boolean).join(', ') || 'Location supplied by OpenGolfAPI',
        lat: Number(detail.latitude), lon: Number(detail.longitude),
        grass: 'Not supplied by source', style: detail.type || 'Course type not supplied',
        rating: Number(tee?.course_rating) || null, slope: Number(tee?.slope) || null,
        image: '⛳', holes,
        dataAvailability: 'licensed-scorecard',
        source: {
            provider: 'OpenGolfAPI', providerId: detail.id, license: 'ODbL-1.0',
            attribution: detail._attribution || holesPayload._attribution || '© OpenStreetMap contributors (ODbL 1.0) via OpenGolfAPI',
            url: `https://courses.opengolfapi.org/course/${detail.id}`,
            apiUrl: `https://api.opengolfapi.org/v1/courses/${detail.id}`,
            fetchedAt, selectedTee: tee ? { key: tee.tee_key, name: tee.tee_name, gender: tee.gender, yardage: tee.yardage, yardageField: yardageKey } : { key: yardageKey, name: yardageKey, gender: 'not supplied', yardage: holes.reduce((sum, hole) => sum + hole.yards, 0), yardageField: yardageKey },
            replacedFields: ['name', 'location', 'coordinates', 'rating', 'slope', 'hole-par', 'hole-yardage', 'stroke-index']
        }
    };
}

function elementCenter(element) {
    if (element.center) return element.center;
    if (element.lat != null && element.lon != null) return { lat: element.lat, lon: element.lon };
    if (element.bounds) return { lat: (element.bounds.minlat + element.bounds.maxlat) / 2, lon: (element.bounds.minlon + element.bounds.maxlon) / 2 };
    return null;
}

function geometryYards(geometry) {
    let miles = 0;
    for (let index = 1; index < geometry.length; index += 1) miles += distanceMiles(geometry[index - 1].lat, geometry[index - 1].lon, geometry[index].lat, geometry[index].lon);
    return Math.round(miles * 1760);
}

async function overpass(query) {
    const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
    let lastError;
    for (const endpoint of endpoints) {
        try { return await getJson(`${endpoint}?data=${encodeURIComponent(query)}`); }
        catch (error) { lastError = error; await sleep(1200); }
    }
    throw lastError;
}

async function resolveOsm(course) {
    const override = OSM_ELEMENT_OVERRIDES[course.id];
    const candidatesPayload = override
        ? await overpass(`[out:json][timeout:25];${override.type}(id:${override.id});out center tags;`)
        : await overpass(`[out:json][timeout:25];nwr["leisure"="golf_course"](around:3500,${course.lat},${course.lon});out center tags;`);
    const ranked = (candidatesPayload.elements || []).map(element => {
        const center = elementCenter(element);
        return { element, center, nameScore: similarity(course.name, element.tags?.name), miles: center ? distanceMiles(course.lat, course.lon, center.lat, center.lon) : 999 };
    }).filter(item => item.center && ((item.nameScore >= 0.20 && item.miles <= 10) || item.miles <= 1.25)).sort((a, b) => (b.nameScore - a.nameScore) || (a.miles - b.miles));
    if (!ranked.length) throw new Error('No named OpenStreetMap golf-course feature matched.');
    const selected = ranked[0];
    const element = selected.element;
    let rawHoles = [];
    if (element.type === 'way' || element.type === 'relation') {
        const areaId = (element.type === 'way' ? 2400000000 : 3600000000) + Number(element.id);
        const holesPayload = await overpass(`[out:json][timeout:25];way(area:${areaId})["golf"="hole"];out tags geom;`);
        rawHoles = holesPayload.elements || [];
    }
    const byNumber = new Map();
    for (const raw of rawHoles) {
        const number = Number(raw.tags?.ref), par = Number(raw.tags?.par);
        const yards = Array.isArray(raw.geometry) ? geometryYards(raw.geometry) : 0;
        if (Number.isInteger(number) && number >= 1 && number <= 18 && par >= 3 && par <= 6 && yards >= 50 && yards <= 900 && !byNumber.has(number)) byNumber.set(number, baseHole(number, par, yards, raw.tags?.['handicap:men'] || raw.tags?.handicap, raw.geometry));
    }
    const complete = byNumber.size === 18;
    const tags = element.tags || {};
    return {
        id: course.id,
        name: tags.name || course.name,
        location: [tags['addr:city'], tags['addr:state'], tags['addr:country']].filter(Boolean).join(', ') || 'Location available from OpenStreetMap',
        lat: Number(selected.center.lat), lon: Number(selected.center.lon),
        grass: 'Not supplied by source', style: tags.golf || tags.course || 'Course type not supplied',
        rating: null, slope: null, image: '⛳',
        holes: complete ? [...byNumber.values()].sort((a, b) => a.hole - b.hole) : [],
        dataAvailability: complete ? 'licensed-mapped-scorecard' : 'licensed-catalog-only',
        source: {
            provider: 'OpenStreetMap', providerId: `${element.type}/${element.id}`, license: 'ODbL-1.0',
            attribution: '© OpenStreetMap contributors, ODbL 1.0',
            url: `https://www.openstreetmap.org/${element.type}/${element.id}`,
            fetchedAt,
            replacedFields: complete ? ['name', 'coordinates', 'hole-par', 'calculated-hole-yardage', 'stroke-index', 'hole-geometry'] : ['name', 'coordinates'],
            calculationNote: complete ? 'Hole yardages are calculated from OSM tee-to-green way geometry and are not official tee measurements.' : 'No complete 18-hole OSM way set was available; unproven scorecard and strategy fields were removed.'
        }
    };
}

(async () => {
    const existing = loadExistingCourses();
    const previousPath = path.join(root, 'data', 'coursecompass-open-courses.json');
    const previous = fs.existsSync(previousPath) ? JSON.parse(fs.readFileSync(previousPath, 'utf8')).courses || [] : [];
    const reusable = new Map(previous.filter(course => course.dataAvailability && course.dataAvailability !== 'withheld-unverified').map(course => [course.id, course]));
    const resolved = [];
    const failures = [];
    for (const [index, course] of existing.entries()) {
        const isUs = /,\s*[A-Z]{2}$/.test(course.location);
        if (OFFICIAL_REFERENCE_OVERRIDES[course.id]) {
            const reference = OFFICIAL_REFERENCE_OVERRIDES[course.id];
            process.stdout.write(`[${index + 1}/${existing.length}] ${course.name} — official identity reference\n`);
            resolved.push({
                id: course.id, name: reference.name, location: reference.location, lat: null, lon: null,
                grass: 'Not reproduced', style: 'Reference entry', rating: null, slope: null, image: '⛳', holes: [], dataAvailability: 'verified-reference-only',
                source: { provider: 'Official course website', license: 'Reference-only citation; no protected course content reproduced', attribution: reference.note, url: reference.url, fetchedAt, replacedFields: ['course identity', 'current name'] }
            });
            continue;
        }
        if (reusable.has(course.id)) {
            process.stdout.write(`[${index + 1}/${existing.length}] ${course.name} — retained verified snapshot\n`);
            resolved.push(reusable.get(course.id));
            continue;
        }
        process.stdout.write(`[${index + 1}/${existing.length}] ${course.name} — ${isUs ? 'OpenGolfAPI' : 'OpenStreetMap'}\n`);
        try {
            let replacement;
            if (isUs) {
                try { replacement = await resolveOpenGolf(course); }
                catch (openGolfError) {
                    replacement = await resolveOsm(course);
                    replacement.source.resolutionFallback = `OpenGolfAPI was incomplete or unmatched; resolved from OpenStreetMap instead (${openGolfError.message})`;
                }
            } else replacement = await resolveOsm(course);
            resolved.push(replacement);
        } catch (error) {
            failures.push({ id: course.id, name: course.name, provider: isUs ? 'OpenGolfAPI' : 'OpenStreetMap', error: error.message });
            resolved.push({
                id: course.id, name: course.name, location: 'Location not retained — source match required', lat: null, lon: null,
                grass: 'Not supplied', style: 'Reference entry', rating: null, slope: null, image: '⛳', holes: [], dataAvailability: 'withheld-unverified',
                source: { provider: 'CourseCompass provenance audit', license: 'Not distributable as course data', attribution: 'Original hard-coded values removed because no reliable open-source match was established.', fetchedAt }
            });
        }
        await sleep(isUs ? 120 : 1100);
    }

    const database = {
        name: 'CourseCompass Open Course Snapshot', generatedAt: fetchedAt, license: 'ODbL-1.0',
        attribution: 'Contains © OpenStreetMap contributors (ODbL 1.0), including data delivered via OpenGolfAPI. CourseCompass-generated strategy sentences are not source descriptions.',
        sourceTerms: ['https://www.openstreetmap.org/copyright', 'https://courses.opengolfapi.org/legal/terms'],
        courses: resolved
    };
    const dataDir = path.join(root, 'data');
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, 'coursecompass-open-courses.json'), `${JSON.stringify(database, null, 2)}\n`);
    fs.writeFileSync(path.join(dataDir, 'course-provenance-resolution.json'), `${JSON.stringify({ generatedAt: fetchedAt, total: resolved.length, licensedScorecards: resolved.filter(course => course.holes.length === 18).length, catalogOnly: resolved.filter(course => course.holes.length === 0 && course.dataAvailability !== 'withheld-unverified').length, withheld: failures.length, failures }, null, 2)}\n`);
    const js = `/* Generated by scripts/resolve-course-provenance.js. ODbL 1.0 data; see COURSE_DATA_LICENSE.md. */\nglobalThis.CourseCompassBuiltInCourses = ${JSON.stringify(resolved, null, 2)};\n`;
    fs.writeFileSync(path.join(root, 'js', 'course-data-open.js'), js);
    console.log(JSON.stringify({ total: resolved.length, licensedScorecards: resolved.filter(course => course.holes.length === 18).length, catalogOnly: resolved.filter(course => course.holes.length === 0 && course.dataAvailability !== 'withheld-unverified').length, withheld: failures.length, failures }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
