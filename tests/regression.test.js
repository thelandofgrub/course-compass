const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const projectRoot = path.resolve(__dirname, '..');

function escapeHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function loadGlobal(relativePath, globalName, overrides = {}) {
    const sandbox = {
        console,
        setTimeout,
        clearTimeout,
        alert() {},
        confirm() { return true; },
        navigator: {},
        document: {
            getElementById() { return null; },
            querySelector() { return null; },
            querySelectorAll() { return []; }
        },
        esc: escapeHtml,
        GolfData: {},
        ...overrides
    };
    vm.createContext(sandbox);
    const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
    vm.runInContext(`${source}\nglobalThis.__loaded = ${globalName};`, sandbox);
    return { value: sandbox.__loaded, sandbox };
}

test('WHS calculation does not apply the retired 0.96 multiplier', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring');
    const rounds = Array.from({ length: 20 }, () => ({ score: 92, rating: 72, slope: 113 }));
    const result = scoring.calculateHandicap(rounds);

    assert.equal(result.numToUse, 8);
    assert.equal(result.avgDiff, 20);
    assert.equal(result.handicapIndex, 20);
});

test('WHS initial-index adjustments and most-recent-20 limit are applied', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring');
    const initial = scoring.calculateHandicap(Array.from({ length: 3 }, () => ({ score: 82, rating: 72, slope: 113 })));
    assert.equal(initial.adjustment, -2);
    assert.equal(initial.handicapIndex, 8);

    const rounds = [
        { score: 72, rating: 72, slope: 113 },
        ...Array.from({ length: 20 }, () => ({ score: 82, rating: 72, slope: 113 }))
    ];
    assert.equal(scoring.calculateHandicap(rounds).handicapIndex, 10);
});

test('round dates are formatted from local calendar components', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring');
    const localEvening = new Date(2026, 7, 21, 23, 30, 0);
    assert.equal(scoring.localDateString(localEvening), '2026-08-21');
});

test('partial custom courses navigate through their actual hole numbers', () => {
    const course = {
        id: 'partial',
        holes: [{ hole: 5 }, { hole: 9 }]
    };
    const golfData = { allCourses: [course], courses: [course] };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: golfData });
    caddie._courseState.selectedCourseId = 'partial';
    caddie._courseState.currentHole = 1;
    caddie.renderHoleDiagram = hole => `hole-${hole.hole}`;

    const html = caddie.renderHoleByHoleView(course);
    assert.match(html, /hole-5/);
    assert.equal(caddie._courseState.currentHole, 5);

    caddie.refreshHoleView = () => {};
    caddie.navigateHole(1);
    assert.equal(caddie._courseState.currentHole, 9);
});

test('custom course fields are escaped before HTML rendering', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const course = {
        id: 'custom-test', name: payload, location: payload, grass: payload, style: payload,
        image: '📌', rating: 0, slope: 0, holes: []
    };
    const golfData = {
        allCourses: [course], courses: [], customCourses: [course]
    };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: golfData });
    caddie._courseState.selectedCourseId = course.id;

    const html = caddie.renderCourseStrategy();
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('open course records normalize into editable offline CourseCompass data', () => {
    const golfData = { customCourses: [], allCourses: [], courses: [] };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: golfData, URL });
    const source = caddie.normalizeOpenGolfCourse({
        id: 'course-42', course_name: 'Community Links', city: 'Indy', state: 'IN', country: 'US',
        latitude: 39.8, longitude: -86.1, course_type: 'municipal', par_total: 72,
        website: 'https://example.com', year_built: 1925
    });
    const tee = caddie.normalizeOpenGolfTee({ id: 'blue', tee_name: 'Blue', course_rating: 71.8, slope_rating: 128, total_yardage: 6500 });
    const holes = [
        caddie.normalizeOpenGolfHole({ hole_number: 1, par: 4, handicap_index: 5, yardages: { blue: 410 } }),
        caddie.normalizeOpenGolfHole({ hole_number: 2, par: 3, handicap_index: 17, yardages: [{ tee_id: 'blue', yards: 168 }] })
    ];
    const imported = caddie.buildImportedOpenCourse({ course: source, tees: [tee], holes }, 'blue');

    assert.equal(imported.id, 'open-course-42');
    assert.equal(imported.location, 'Indy, IN, US');
    assert.equal(imported.rating, 71.8);
    assert.equal(imported.slope, 128);
    assert.equal(imported.holes[0].yards, 410);
    assert.equal(imported.holes[1].yards, 168);
    assert.equal(imported.holes[0].strokeIndex, 5);
    assert.equal(imported.source.license, 'ODbL-1.0');
    assert.match(imported.source.attribution, /OpenStreetMap contributors/);
});

test('open course search results escape untrusted provider fields', () => {
    const golfData = { customCourses: [], allCourses: [], courses: [] };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: golfData, URL });
    caddie._courseState.openSearchQuery = 'test';
    caddie._courseState.openSearchResults = [{ id: 'x', name: '<img src=x onerror=alert(1)>', city: '<script>x</script>', state: 'IN', country: 'US', holesCount: 18, parTotal: 72 }];
    const html = caddie.renderOpenCourseImport();
    assert.doesNotMatch(html, /<img src=x|<script>/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('saved round labels are escaped in progress rendering', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const round = {
        id: 'round-1', date: '2026-08-21', courseName: payload, par: 72,
        players: [{ name: payload, totalScore: 90, toPar: 18 }]
    };
    const golfData = {
        roundHistory: [round],
        getPlayerRounds() { return []; }
    };
    const document = {
        getElementById(id) { return id === 'playerName' ? { textContent: 'Golfer' } : null; },
        querySelector() { return null; },
        querySelectorAll() { return []; }
    };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { GolfData: golfData, document });

    const html = scoring.renderProgress();
    assert.doesNotMatch(html, /<img src=x/);
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('active rounds autosave, resume, and finish on variable-hole courses', () => {
    const course = {
        id: 'nine-hole', name: 'Neighborhood Nine', rating: 34.8, slope: 112,
        holes: [
            { hole: 1, par: 4, yards: 350 },
            { hole: 2, par: 3, yards: 145 },
            { hole: 3, par: 5, yards: 490 }
        ]
    };
    let activeRound = null;
    let savedRound = null;
    const golfData = {
        allCourses: [course], courses: [course], selectedCourseId: course.id,
        clubs: [{ name: '7-Iron', type: 'iron' }],
        get activeRound() { return activeRound; },
        set activeRound(value) { activeRound = value; },
        clearActiveRound() { activeRound = null; },
        saveRound(round) { savedRound = JSON.parse(JSON.stringify(round)); }
    };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { GolfData: golfData });
    scoring.course = course;
    scoring.players = [{ id: 0, name: 'Golfer', color: '#3b82f6' }];
    scoring.scores = { 0: { 1: 5, 2: 3, 3: 6 } };
    scoring.roundStats = { 0: {
        1: { fairway: 'hit', gir: 'miss', putts: 2, penalties: 0 },
        2: { fairway: null, gir: 'hit', putts: null, penalties: 0 },
        3: { fairway: 'miss', gir: 'miss', putts: 3, penalties: 1 }
    } };
    scoring.roundShots = { 0: {
        1: [{ id: 'roundshot-test-1', club: '7-Iron', carry: 150, total: 155, offline: -6, lie: 'fairway', quality: 'normal', learnedShotId: 'shot-test-1' }],
        2: [], 3: []
    } };

    scoring.autosaveActiveRound();
    assert.equal(activeRound.courseId, course.id);
    assert.equal(activeRound.courseSnapshot.holes.length, 3);
    assert.equal(activeRound.roundStats[0][3].penalties, 1);
    assert.equal(activeRound.roundShots[0][1][0].club, '7-Iron');

    scoring.players = [];
    scoring.scores = {};
    scoring.resumeActiveRound();
    assert.equal(scoring.players.length, 1);
    assert.equal(scoring.scores[0][3], 6);
    assert.equal(scoring.roundStats[0][1].fairway, 'hit');
    assert.equal(scoring.roundStats[0][2].putts, null);
    assert.equal(scoring.roundShots[0][1][0].carry, 150);

    scoring.saveCurrentRound();
    assert.equal(savedRound.courseName, 'Neighborhood Nine');
    assert.equal(savedRound.par, 12);
    assert.equal(savedRound.players[0].holesPlayed, 3);
    assert.equal(savedRound.players[0].holesTotal, 3);
    assert.equal(savedRound.players[0].totalScore, 14);
    assert.equal(savedRound.players[0].fairwaysHit, 1);
    assert.equal(savedRound.players[0].fairwaysTracked, 2);
    assert.equal(savedRound.players[0].gir, 1);
    assert.equal(savedRound.players[0].putts, 5);
    assert.equal(savedRound.players[0].puttsHoles, 2);
    assert.equal(savedRound.players[0].penalties, 1);
    assert.equal(savedRound.players[0].shotsByHole[1][0].club, '7-Iron');
    assert.equal(activeRound, null);
    assert.equal(scoring.players.length, 0);
});

test('short scorecards omit an empty IN section', () => {
    const course = {
        id: 'short', name: 'Short Course',
        holes: [
            { hole: 1, par: 4, yards: 350 },
            { hole: 5, par: 3, yards: 150 },
            { hole: 9, par: 5, yards: 500 }
        ]
    };
    const scorecardArea = { innerHTML: '' };
    const document = {
        getElementById(id) { return id === 'scorecardArea' ? scorecardArea : null; },
        querySelector() { return null; },
        querySelectorAll() { return []; }
    };
    const golfData = { allCourses: [course] };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { GolfData: golfData, document });
    scoring.course = course;
    scoring.players = [{ id: 0, name: 'Golfer', color: '#3b82f6' }];
    scoring.scores = { 0: { 1: null, 5: null, 9: null } };

    scoring.renderScorecardTable();
    assert.match(scorecardArea.innerHTML, />OUT</);
    assert.doesNotMatch(scorecardArea.innerHTML, />IN</);
    assert.match(scorecardArea.innerHTML, /score_0_9/);
    assert.match(scorecardArea.innerHTML, /oninput="Scoring\.updateScore/);
    assert.doesNotMatch(scorecardArea.innerHTML, /onchange="Scoring\.updateScore/);
});

test('advanced statistics generate targeted coaching insights', () => {
    const golfData = { allCourses: [] };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { GolfData: golfData });
    const rounds = [{
        totalScore: 95, toPar: 23, holesPlayed: 18,
        eagles: 0, birdies: 0, pars: 4, bogeys: 8, doubles: 6,
        fairwaysHit: 2, fairwaysTracked: 10,
        gir: 2, girTracked: 18,
        putts: 40, puttsHoles: 18,
        penalties: 4,
        scores: {}
    }];

    const insights = scoring._generateInsights('Golfer', rounds, [{ players: [] }]);
    const titles = insights.map(insight => insight.title);
    assert.ok(titles.includes('Tee Accuracy Opportunity'));
    assert.ok(titles.includes('Greens in Regulation Need Attention'));
    assert.ok(titles.includes('Putting Is Costing Strokes'));
    assert.ok(titles.includes('Penalty Strokes Are Adding Up'));
});

test('coaching begins with the player-selected improvement goal', () => {
    const CourseCompassStore = { playerProfile: { improvementGoal: 'reduce-penalties' } };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { CourseCompassStore });
    assert.equal(scoring.getGoalPlan().title, 'Goal: Reduce Penalties');
    const rounds = [{ totalScore: 96, toPar: 24, holesPlayed: 18, penalties: 3, fairwaysTracked: 0, girTracked: 0, puttsHoles: 0 }];
    const insights = scoring._generateInsights('Golfer', rounds, rounds);
    assert.equal(insights[0].code, 'YOUR GOAL');
    assert.match(insights[0].tip, /Record every penalty/);
});

test('personal club distances override estimates and unavailable clubs are excluded', () => {
    const clubs = [
        { name: 'Driver', type: 'wood', emoji: 'D', tips: '', avgDistanceMale: { intermediate: 220 }, avgDistanceFemale: { intermediate: 170 } },
        { name: '5-Wood', type: 'wood', emoji: 'W', tips: '', avgDistanceMale: { intermediate: 185 }, avgDistanceFemale: { intermediate: 145 } },
        { name: '7-Iron', type: 'iron', emoji: '7', tips: '', avgDistanceMale: { intermediate: 140 }, avgDistanceFemale: { intermediate: 110 } },
        { name: '8-Iron', type: 'iron', emoji: '8', tips: '', avgDistanceMale: { intermediate: 130 }, avgDistanceFemale: { intermediate: 100 } }
    ];
    const bag = { version: 1, clubs: {
        Driver: { enabled: true, carry: 235, total: 250, dispersion: 30 },
        '5-Wood': { enabled: true, carry: 180, total: 190, dispersion: 20 },
        '7-Iron': { enabled: true, carry: 152, total: 157, dispersion: 12 },
        '8-Iron': { enabled: false, carry: 142, total: 146, dispersion: 10 }
    } };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs, clubProfile: bag } });

    const fairway = caddie.getClubRecommendations({ effectiveDistance: 150, lie: 'fairway', bag });
    assert.equal(fairway[0].club.name, '7-Iron');
    assert.equal(fairway[0].carry, 152);
    assert.ok(!fairway.some(result => result.club.name === 'Driver'));
    assert.ok(!fairway.some(result => result.club.name === '8-Iron'));

    const deepRough = caddie.getClubRecommendations({ effectiveDistance: 180, lie: 'deep-rough', bag });
    assert.ok(!deepRough.some(result => result.club.type === 'wood'));
    assert.equal(caddie.getClubSymbol({ name: 'Driver' }), 'D');
    assert.equal(caddie.getClubSymbol({ name: '7-Iron' }), '7i');
    assert.equal(caddie.getClubSymbol({ name: 'Pitching Wedge (PW)' }), 'PW');
});

test('On-Course Mode renders focused hole controls and escapes player data', () => {
    const caddie = {
        conditions: { windSpeed: 12, windDirection: 'head', temperature: 70, altitude: 500 },
        renderHoleDiagram(hole, options = {}) { return `<div class="test-hole-map">${hole.tip}${options.afterGreenHtml || ''}</div>`; }
    };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { Caddie: caddie });
    scoring.course = { name: 'Test Links', holes: [{ hole: 1, par: 4, yards: 410, fairwayShape: 'dogleg-left', hazards: [{ type: 'bunker', pos: 'right-green' }], tip: 'Favor the right side.' }, { hole: 2, par: 3, yards: 165 }] };
    scoring.players = [{ id: 0, name: '<Alex>', color: '#123456' }];
    scoring.scores = { 0: { 1: null, 2: null } };
    scoring.currentRoundHole = 1;
    const html = scoring.renderOnCourse();
    assert.match(html, /Hole 1/);
    assert.match(html, /Quick scoring/);
    assert.match(html, /Hole Map & Strategy/);
    assert.match(html, /Favor the right side/);
    assert.match(html, /Weather Conditions/);
    assert.match(html, /Wind effect for this shot/);
    assert.match(html, /12 mph Headwind/);
    assert.match(html, /&lt;Alex&gt;/);
    assert.doesNotMatch(html, /<Alex>/);
});

test('current weather is normalized for the on-course wind display', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { Caddie: { conditions: {} } });
    const weather = scoring.normalizeWeatherResponse({
        timezone_abbreviation: 'EDT',
        current: {
            time: '2026-08-24T14:15', temperature_2m: 78.4, apparent_temperature: 80.1,
            relative_humidity_2m: 62, precipitation: 0, weather_code: 2, cloud_cover: 38,
            wind_speed_10m: 11.6, wind_direction_10m: 281, wind_gusts_10m: 18.2
        }
    });
    assert.equal(weather.windSpeed, 11.6);
    assert.equal(weather.temperature, 78.4);
    assert.equal(weather.timezone, 'EDT');
    assert.equal(scoring.weatherRefreshMs, 5 * 60 * 1000);
    assert.equal(scoring.degreesToCompass(weather.windDirection), 'W');
    const [icon, label] = scoring.weatherCodeLabel(weather.weatherCode);
    assert.equal(icon, 'PCL');
    assert.equal(label, 'Partly cloudy');
    assert.throws(() => scoring.normalizeWeatherResponse({ current: { temperature_2m: 70 } }), /incomplete/);
});

test('on-course weather shows descriptive conditions without internal weather codes', () => {
    const status = { innerHTML: '' };
    const readings = { innerHTML: '', hidden: true };
    const card = { querySelector(selector) {
        return ({ '.weather-status': status, '.weather-readings': readings })[selector] || null;
    } };
    const document = { getElementById: id => id === 'onCourseWeather' ? card : null };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { document, Caddie: { conditions: {} } });
    scoring.currentRoundHole = 1;
    scoring.holeWindAnalysis = { hole: 1 };
    scoring.updateWeatherView({
        fetchedAt: Date.now(),
        current: { weatherCode: 2, temperature: 72, feelsLike: 72, windSpeed: 8, windDirection: 270, windGusts: 12, humidity: 55, precipitation: 0, observedAt: '2026-08-24T12:00', timezone: 'EDT' }
    });

    assert.match(readings.innerHTML, /Partly cloudy/);
    assert.doesNotMatch(readings.innerHTML, />PCL</);
    assert.doesNotMatch(scoring.renderOnCourseWeather(), /NWS|weather-observed|Use observed wind/);
});

test('weather and course strategy cards do not expose decorative internal codes', () => {
    const course = { id: 'test-course', name: 'Test Course', location: 'Indianapolis, IN', holes: [] };
    const GolfData = {
        weather: { wind: { title: 'Wind', overview: 'Wind changes ball flight.', impactLevel: 60, impactColor: '#123', details: [] } },
        allCourses: [course], courses: [course], customCourses: [], selectedCourseId: 'test-course'
    };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData });
    assert.doesNotMatch(caddie.renderWeatherAdvisor(), />W01</);
    assert.doesNotMatch(caddie.renderCourseStrategy(), />GC</);
    assert.doesNotMatch(caddie.renderWeatherAdvisor(), /weather-card-icon/);
    assert.doesNotMatch(caddie.renderCourseStrategy(), /course-header-icon/);
});

test('free course enrichment normalizes OSM holes, golf features, and USGS elevation', () => {
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs: [] } });
    const payload = { elements: [
        { id: 101, tags: { golf: 'hole', ref: '1' }, geometry: [{ lat: 40, lon: -86 }, { lat: 40.003, lon: -86 }] },
        { id: 102, tags: { golf: 'hole', name: 'Hole 2' }, geometry: [{ lat: 40, lon: -85.99 }, { lat: 40.003, lon: -85.99 }] },
        { id: 201, tags: { golf: 'bunker' }, geometry: [{ lat: 40.00145, lon: -86.0001 }, { lat: 40.00155, lon: -86.0001 }, { lat: 40.0015, lon: -85.9999 }] }
    ] };
    const holes = caddie.normalizeOverpassGolf(payload);
    assert.equal(holes.size, 2);
    assert.equal(holes.get(1).features[0].type, 'bunker');
    assert.equal(caddie.parseOsmHoleNumber({ name: 'The 17th Hole' }), 17);
    assert.equal(caddie.parseOsmHoleNumber({ name: 'Clubhouse' }), 0);
    assert.equal(caddie.normalizeUsgsElevation({ value: 612.4 }), 612.4);
    assert.equal(caddie.normalizeUsgsElevation({ USGS_Elevation_Point_Query_Service: { Elevation_Query: { Elevation: 488 } } }), 488);
});

test('mapped hole diagrams use measured geometry and retain an offline fallback', () => {
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs: [] } });
    const mapped = caddie.generateHoleSVG({ hole: 1, par: 4, yards: 410, mapGeometry: { path: [{ lat: 40, lon: -86 }, { lat: 40.001, lon: -85.9997 }, { lat: 40.003, lon: -86 }], features: [] } });
    const fallback = caddie.generateHoleSVG({ hole: 2, par: 3, yards: 165, fairwayShape: 'straight', greenShape: 'oval', hazards: [] });
    const details = caddie.renderHoleDiagram({ hole: 2, par: 3, yards: 165, type: 'Par 3', tip: 'Center green.', fairwayShape: 'straight', greenShape: 'oval', greenSlope: 'varies', elevation: 'flat', hazards: [], elevationChangeFeet: null });
    assert.match(mapped, /OSM MAP/);
    assert.match(mapped, /mapped-hole-svg/);
    assert.doesNotMatch(mapped, /Sky gradient/);
    assert.match(fallback, /Sky gradient/);
    assert.doesNotMatch(details, />Elevation</);
});

test('mapped holes offer zero-cost USGS aerial imagery with a course-map fallback', () => {
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs: [] } });
    const hole = { hole: 7, par: 4, yards: 420, type: 'Dogleg', tip: 'Favor the left.', greenShape: 'oval', greenSlope: 'back-to-front', hazards: [], mapGeometry: {
        path: [{ lat: 39.8, lon: -86.15 }, { lat: 39.801, lon: -86.1497 }, { lat: 39.803, lon: -86.15 }],
        features: [{ type: 'bunker', geometry: [{ lat: 39.802, lon: -86.1501 }, { lat: 39.8021, lon: -86.15 }, { lat: 39.802, lon: -86.1499 }] }]
    } };
    const aerial = caddie.generateAerialHoleMap(hole, {
        position: { lat: 39.801, lon: -86.1497 }, accuracy: 9,
        shotStart: { lat: 39.8, lon: -86.15 },
        targets: [{ key: 'center', yards: 218 }, { key: 'back', yards: 231 }],
        hazards: [{ type: 'bunker', yards: 94 }]
    });
    const map = caddie.renderHoleMap(hole);
    assert.match(aerial, /USGSImageryOnly\/MapServer\/tile\/16\//);
    assert.match(aerial, /aerial-map-overlay/);
    assert.match(aerial, /USDA \/ USGS The National Map/);
    assert.match(aerial, /data-map-player/);
    assert.match(aerial, />YOU</);
    assert.match(aerial, /data-map-distance="center"[^>]*><small>C<\/small><strong>218/);
    assert.match(aerial, /Bunker 94 yd/);
    assert.match(aerial, /data-map-shot-line x1=/);
    assert.match(map, /data-map-layer="aerial"/);
    assert.match(map, /data-map-layer="course"/);
    assert.match(map, /mapped-hole-svg/);
});

test('GPS Caddie resolves manual and mapped targets without requiring a network', () => {
    const caddie = { conditions: {}, saveConditions() {} };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { Caddie: caddie });
    const hole = {
        hole: 1,
        coordinates: { green: { lat: 39.001, lon: -86 } },
        mapGeometry: {
            path: [{ lat: 39, lon: -86 }, { lat: 39.002, lon: -86 }],
            features: [{ type: 'bunker', center: { lat: 39.0005, lon: -86 } }]
        }
    };
    scoring.gpsPosition = { lat: 39, lon: -86, accuracy: 8, timestamp: Date.now() };
    const targets = scoring.getGpsDistances(hole);
    assert.equal(targets.source, 'Manual target');
    assert.ok(targets.greenYards > 115 && targets.greenYards < 125);
    assert.ok(targets.hazards[0].yards > 55 && targets.hazards[0].yards < 65);
    assert.match(scoring.renderOnCourseGps(hole), /Use selected distance/);
    assert.match(scoring.renderOnCourseGps(hole), /Excellent/);
    assert.match(scoring.renderOnCourseGps(hole), /Track this shot/);
});

test('GPS Caddie supports front, center, back, and temporary pin targets', () => {
    const caddie = { conditions: {}, saveConditions() {} };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { Caddie: caddie });
    const hole = { hole: 3, coordinates: {
        tee: { lat: 39, lon: -86 }, greenFront: { lat: 39.0009, lon: -86 },
        greenCenter: { lat: 39.001, lon: -86 }, greenBack: { lat: 39.0011, lon: -86 }
    } };
    scoring.roundPins = { 3: { lat: 39.00105, lon: -86 } };
    scoring.gpsPosition = { lat: 39, lon: -86, accuracy: 6, timestamp: Date.now() };
    scoring.gpsTargetPreference = 'pin';
    const distances = scoring.getGpsDistances(hole);
    assert.equal(distances.greenTargetKey, 'pin');
    assert.ok(distances.greenDistances.front < distances.greenDistances.center);
    assert.ok(distances.greenDistances.center < distances.greenDistances.back);
    const html = scoring.renderOnCourseGps(hole);
    assert.match(html, /Front/);
    assert.match(html, /Center/);
    assert.match(html, /Back/);
    assert.match(html, /Clear pin/);
});

test('hole-aware wind converts compass wind into target-relative components', () => {
    const caddie = { conditions: {}, saveConditions() {} };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { Caddie: caddie });
    const hole = { hole: 1, coordinates: { tee: { lat: 39, lon: -86 }, green: { lat: 39.002, lon: -86 } } };
    scoring.course = { holes: [hole] };
    scoring.currentRoundHole = 1;
    const head = scoring.analyzeHoleWind(hole, 12, 0);
    const tail = scoring.analyzeHoleWind(hole, 12, 180);
    const fromRight = scoring.analyzeHoleWind(hole, 12, 90);
    assert.equal(head.direction, 'head');
    assert.equal(head.effectiveSpeed, 12);
    assert.equal(tail.direction, 'tail');
    assert.equal(fromRight.direction, 'cross-r');
    scoring.applyHoleAwareWind({ windSpeed: 12, windDirection: 90 }, 'Forecast');
    assert.equal(caddie.conditions.windDirection, 'cross-r');
    assert.equal(caddie.conditions.windSpeed, 12);
    assert.match(scoring.renderHoleWindAnalysis(), /Right → left crosswind/);
});

test('GPS shot tracking measures, records, and learns an accurate completed shot', () => {
    let learned = null;
    let activeRound = null;
    const elements = {
        gpsShotPlayer: { value: '0' }, gpsShotClub: { value: '7-Iron' }, gpsShotLie: { value: 'tee' },
        gpsShotQuality: { value: 'normal' }, gpsShotOutcome: { value: 'fairway' }, gpsShotCarry: { value: '116' }
    };
    const document = {
        getElementById(id) { return elements[id] || null; },
        querySelector() { return null; }, querySelectorAll() { return []; }
    };
    const course = { id: 'gps-course', name: 'GPS Links', holes: [{ hole: 1, par: 4, yards: 400, coordinates: { green: { lat: 39.002, lon: -86 } } }] };
    const golfData = {
        clubs: [{ name: '7-Iron', type: 'iron' }],
        addClubShot(shot) { learned = shot; return 'shot-gps-learned'; },
        set activeRound(value) { activeRound = value; }, get activeRound() { return activeRound; }
    };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { GolfData: golfData, document, Caddie: { conditions: {}, saveConditions() {} } });
    scoring.course = course;
    scoring.players = [{ id: 0, name: 'Golfer', color: '#123456' }];
    scoring.scores = { 0: { 1: null } };
    scoring.roundStats = { 0: { 1: { fairway: '', gir: '', putts: null, penalties: 0 } } };
    scoring.roundShots = { 0: { 1: [] } };
    scoring.currentRoundHole = 1;
    scoring.gpsTracking = true;
    scoring.gpsPosition = { lat: 39, lon: -86, accuracy: 6, timestamp: Date.now() };
    scoring.refreshGpsCard = () => {};
    assert.equal(scoring.beginGpsShot(), true);
    scoring.gpsPosition = { lat: 39.001, lon: -86, accuracy: 7, timestamp: Date.now() };
    assert.equal(scoring.finishGpsShot(), true);
    const shot = scoring.roundShots[0][1][0];
    assert.ok(shot.total > 115 && shot.total < 125);
    assert.equal(shot.measuredBy, 'gps');
    assert.equal(shot.outcome, 'fairway');
    assert.equal(shot.learnedShotId, 'shot-gps-learned');
    assert.equal(learned.source, 'round');
    assert.equal(activeRound.roundShots[0][1].length, 1);
});

test('GPS total-only shots do not fabricate carry or alter club learning', () => {
    let learnedCount = 0;
    const elements = { gpsShotQuality: { value: 'normal' }, gpsShotOutcome: { value: 'fairway' }, gpsShotCarry: { value: '' } };
    const document = { getElementById(id) { return elements[id] || null; }, querySelector() { return null; }, querySelectorAll() { return []; } };
    const course = { id: 'gps-total', name: 'Total Links', holes: [{ hole: 1, par: 4, yards: 400, coordinates: { green: { lat: 39.002, lon: -86 } } }] };
    let activeRound = null;
    const golfData = {
        clubs: [{ name: 'Driver', type: 'wood' }], addClubShot() { learnedCount++; return 'shot-should-not-exist'; },
        set activeRound(value) { activeRound = value; }, get activeRound() { return activeRound; }
    };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { GolfData: golfData, document, Caddie: { conditions: {}, saveConditions() {} } });
    scoring.course = course;
    scoring.players = [{ id: 0, name: 'Golfer', color: '#123456' }];
    scoring.scores = { 0: { 1: null } }; scoring.roundStats = { 0: { 1: {} } }; scoring.roundShots = { 0: { 1: [] } };
    scoring.currentRoundHole = 1;
    scoring.activeGpsShot = { playerId: 0, hole: 1, club: 'Driver', lie: 'tee', start: { lat: 39, lon: -86 }, startAccuracy: 5 };
    scoring.gpsPosition = { lat: 39.001, lon: -86, accuracy: 5, timestamp: Date.now() };
    scoring.refreshGpsCard = () => {};
    assert.equal(scoring.finishGpsShot(), true);
    assert.equal(scoring.roundShots[0][1][0].carry, null);
    assert.equal(learnedCount, 0);
    assert.match(scoring.gpsShotNotice, /total only/);
});

test('saved-round shot replay renders GPS paths and escaped shot details', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { GolfData: { allCourses: [] } });
    const course = { holes: [{ hole: 1, par: 4, yards: 400, coordinates: { tee: { lat: 39, lon: -86 }, green: { lat: 39.003, lon: -86 } } }] };
    const shots = [
        { club: '<Driver>', total: 225, carry: null, offline: -12, outcome: 'fairway', start: { lat: 39, lon: -86 }, end: { lat: 39.0018, lon: -86.0001 }, measuredBy: 'gps' },
        { club: '8-Iron', total: 145, carry: 139, offline: 3, outcome: 'green', start: { lat: 39.0018, lon: -86.0001 }, end: { lat: 39.003, lon: -86 }, measuredBy: 'gps' }
    ];
    const html = scoring.renderReplayHole(1, shots, course);
    assert.match(html, /shot-replay-map/);
    assert.match(html, /Shot replay for hole 1/);
    assert.match(html, /&lt;Driver&gt;/);
    assert.match(html, /225 total/);
    assert.match(html, /12 yd left/);
    assert.doesNotMatch(html, /<Driver>/);
});

test('local shot coaching identifies directional misses and protects total-only data', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring');
    const shots = [
        { club: 'Driver', total: 220, carry: null, offline: -18, outcome: 'rough', measuredBy: 'gps' },
        { club: 'Driver', total: 225, carry: null, offline: -14, outcome: 'rough', measuredBy: 'gps' },
        { club: 'Driver', total: 218, carry: null, offline: -12, outcome: 'bunker', measuredBy: 'gps' },
        { club: '7-Iron', total: 150, carry: 145, offline: 2, outcome: 'green', measuredBy: 'gps' }
    ];
    const insights = scoring._generateShotInsights([{ shotsByHole: { 1: shots } }]);
    assert.ok(insights.some(item => /left-side miss/.test(item.title)));
    assert.ok(insights.some(item => item.code === 'COURSE MGMT'));
    assert.ok(insights.some(item => item.code === 'DATA QUALITY'));
});

test('course editor exposes offline tee and green coordinate fallbacks', () => {
    const course = { id: 'local', name: 'Local Links', location: 'Town, IN', holes: [{ hole: 1, par: 4, yards: 400, coordinates: { green: { lat: 39.1, lon: -86.2 } } }] };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { customCourses: [course] } });
    caddie._courseState.builderCourseId = 'local';
    const html = caddie.renderCourseBuilder();
    assert.match(html, /GPS targets · green saved/);
    assert.match(html, /Hole 1 green center latitude/);
    assert.match(html, /value="39.1"/);
    assert.match(html, /green front latitude/);
    assert.match(html, /green back latitude/);
    assert.match(html, /Visual editor/);
});

test('visual target editor projects saved targets and exposes tap and drag placement controls', () => {
    const elements = new Map([
        ['.hole-tee-lat[data-hole="1"]', { value: '39' }], ['.hole-tee-lon[data-hole="1"]', { value: '-86' }],
        ['.hole-green-lat[data-hole="1"]', { value: '39.002' }], ['.hole-green-lon[data-hole="1"]', { value: '-86' }]
    ]);
    const document = {
        querySelector(selector) { return elements.get(selector) || null; },
        getElementById() { return null; }, querySelectorAll() { return []; }
    };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { customCourses: [] }, document });
    const html = caddie.renderVisualTargetEditor(1);
    assert.match(html, /Visual GPS target editor/);
    assert.match(html, /visualTargetCanvas/);
    assert.match(html, />Tee<\/text>/);
    assert.match(html, />Center<\/text>/);
    assert.match(html, /Tap anywhere to place/);
    assert.match(html, /data-target="center"/);
    assert.match(html, /drag an existing marker/);
});

test('shared playing conditions translate between Club Selector and Distance Calculator', () => {
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs: [] } });

    const lightHeadwind = caddie.clubWindToConditions('headwind-light');
    const strongTailwind = caddie.clubWindToConditions('tailwind-strong');
    assert.equal(lightHeadwind.windSpeed, 8);
    assert.equal(lightHeadwind.windDirection, 'head');
    assert.equal(strongTailwind.windSpeed, 20);
    assert.equal(strongTailwind.windDirection, 'tail');
    const moderateHeadwind = caddie.clubWindToConditions('headwind-moderate');
    assert.equal(moderateHeadwind.windSpeed, 12);
    assert.equal(moderateHeadwind.windDirection, 'head');
    caddie.conditions.windSpeed = 12;
    caddie.conditions.windDirection = 'head';
    assert.equal(caddie.conditionsToClubWind(), 'headwind-moderate');
    caddie.conditions.windSpeed = 18;
    caddie.conditions.windDirection = 'head';
    assert.equal(caddie.conditionsToClubWind(), 'headwind-strong');
    caddie.conditions.windSpeed = 9;
    caddie.conditions.windDirection = 'cross-r';
    assert.equal(caddie.conditionsToClubWind(), 'crosswind');
    assert.equal(caddie.feetToClubAltitude(4200), 'mid');
});

test('one shot-plan engine applies environment, lie, and crosswind aim consistently', () => {
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs: [] } });
    const plan = caddie.calculateShotPlan({
        distance: 150, elevation: 30, windSpeed: 10, windDirection: 'head',
        temperature: 62, altitude: 5000, lie: 'rough'
    });
    assert.equal(plan.effectiveDistance, 175);
    assert.equal(plan.difference, 25);
    assert.ok(plan.factors.some(factor => factor.includes('Headwind 10 mph')));
    assert.ok(plan.factors.some(factor => factor.includes('rough')));

    const crosswind = caddie.calculateShotPlan({ distance: 150, windSpeed: 12, windDirection: 'cross-r' });
    assert.equal(crosswind.drift, 14);
    assert.equal(crosswind.aimDirection, 'right');
});

test('club profile storage rejects corrupt and out-of-range data', () => {
    const values = new Map();
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
    const document = { createElement() { return { textContent: '', innerHTML: '' }; } };
    const { value: golfData } = loadGlobal('js/data.js', 'GolfData', { localStorage, document });

    localStorage.setItem('coursecompass-club-profile', '{broken');
    assert.equal(golfData.clubProfile, null);

    golfData.clubProfile = { version: 1, clubs: {
        '7-Iron': { enabled: true, carry: 151.6, total: 158.4, dispersion: 12.2 },
        Driver: { enabled: true, carry: 900, total: 910, dispersion: 10 },
        Imaginary: { enabled: true, carry: 100, total: 105, dispersion: 10 }
    } };
    assert.equal(golfData.clubProfile.clubs['7-Iron'].carry, 152);
    assert.equal(golfData.clubProfile.clubs.Driver, undefined);
    assert.equal(golfData.clubProfile.clubs.Imaginary, undefined);
});

test('shot learning needs three good samples and rejects mishits, rough shots, and outliers', () => {
    const clubs = [{
        name: '7-Iron', type: 'iron', emoji: '7', tips: '',
        avgDistanceMale: { intermediate: 140 }, avgDistanceFemale: { intermediate: 110 }
    }];
    const shots = [
        { club: '7-Iron', carry: 150, total: 155, offline: -5, lie: 'range', quality: 'normal' },
        { club: '7-Iron', carry: 152, total: 158, offline: 8, lie: 'fairway', quality: 'solid' },
        { club: '7-Iron', carry: 151, total: 156, offline: 6, lie: 'tee', quality: 'normal' },
        { club: '7-Iron', carry: 40, total: 45, offline: 35, lie: 'range', quality: 'mishit' },
        { club: '7-Iron', carry: 105, total: 110, offline: 20, lie: 'rough', quality: 'normal' },
        { club: '7-Iron', carry: 300, total: 305, offline: 2, lie: 'range', quality: 'normal' }
    ];
    const golfData = {
        clubs,
        clubProfile: { version: 1, clubs: { '7-Iron': { enabled: true, carry: 140, total: 145, dispersion: 15 } } },
        clubShotHistory: shots
    };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: golfData });

    assert.equal(caddie.calculateLearnedClubStats(shots.slice(0, 2), '7-Iron'), null);
    const learned = caddie.calculateLearnedClubStats(shots, '7-Iron');
    assert.equal(learned.carry, 151);
    assert.equal(learned.total, 156);
    assert.equal(learned.dispersion, 8);
    assert.equal(learned.sampleCount, 3);
    assert.equal(learned.excludedCount, 1);

    const active = caddie.getActiveBag('intermediate', 'male');
    assert.equal(active.clubs['7-Iron'].source, 'learned');
    assert.equal(active.clubs['7-Iron'].carry, 151);
});

test('shot history storage validates measurements and identifiers', () => {
    const values = new Map();
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
    const document = { createElement() { return { textContent: '', innerHTML: '' }; } };
    const { value: golfData } = loadGlobal('js/data.js', 'GolfData', { localStorage, document });
    golfData.clubShotHistory = [
        { id: 'shot-1-good', club: '7-Iron', carry: 150, total: 156, offline: -7, lie: 'range', quality: 'normal', date: '2026-08-21' },
        { id: "shot-1-'bad", club: '7-Iron', carry: 151, total: 157, offline: 5, lie: 'range', quality: 'normal' },
        { id: 'shot-2-bad', club: '7-Iron', carry: 150, total: 140, offline: 4, lie: 'range', quality: 'normal' },
        { id: 'shot-3-bad', club: 'Imaginary', carry: 150, total: 155, offline: 4, lie: 'range', quality: 'normal' }
    ];

    assert.equal(golfData.clubShotHistory.length, 1);
    assert.equal(golfData.clubShotHistory[0].offline, -7);
});

test('on-course shots feed learning for the primary player and retract on deletion', () => {
    let learnedShot = null;
    let deletedId = null;
    let activeRound = null;
    const elements = {
        roundShotPlayer: { value: '0' }, roundShotHole: { value: '1' },
        roundShotClub: { value: '7-Iron' }, roundShotCarry: { value: '151' },
        roundShotTotal: { value: '157' }, roundShotDirection: { value: '-1' },
        roundShotOffline: { value: '7' }, roundShotLie: { value: 'fairway' },
        roundShotQuality: { value: 'normal' }, roundShotMessage: { textContent: '' }
    };
    const document = {
        getElementById(id) { return elements[id] || null; },
        querySelector() { return null; }, querySelectorAll() { return []; }
    };
    const course = { id: 'course-1', name: 'Test Course', holes: [{ hole: 1, par: 4, yards: 350 }] };
    const golfData = {
        clubs: [{ name: '7-Iron', type: 'iron' }], allCourses: [course],
        addClubShot(shot) { learnedShot = { ...shot }; return 'shot-learned-1'; },
        deleteClubShot(id) { deletedId = id; },
        set activeRound(value) { activeRound = value; },
        get activeRound() { return activeRound; }
    };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { GolfData: golfData, document });
    scoring.course = course;
    scoring.players = [{ id: 0, name: 'Golfer', color: '#123456' }];
    scoring.scores = { 0: { 1: null } };
    scoring.roundStats = { 0: { 1: { fairway: '', gir: '', putts: null, penalties: 0 } } };
    scoring.roundShots = { 0: { 1: [] } };
    scoring.renderScorecardTable = () => {};

    assert.equal(scoring.addRoundShot(), true);
    assert.equal(learnedShot.club, '7-Iron');
    assert.equal(learnedShot.offline, -7);
    assert.equal(learnedShot.source, 'round');
    assert.equal(scoring.roundShots[0][1][0].learnedShotId, 'shot-learned-1');
    assert.equal(activeRound.roundShots[0][1].length, 1);

    scoring.deleteRoundShot(0, 1, 0);
    assert.equal(deletedId, 'shot-learned-1');
    assert.equal(scoring.roundShots[0][1].length, 0);
});

test('storage repository creates stable identities and coalesces pending changes', () => {
    const values = new Map();
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
    const { value: store } = loadGlobal('js/storage.js', 'CourseCompassStore', { localStorage });

    const firstProfile = store.playerProfile;
    const secondProfile = store.playerProfile;
    assert.equal(firstProfile.id, secondProfile.id);
    assert.match(store.deviceId, /^device-/);

    store.setJSON(store.keys.roundHistory, [{ id: 'round-1', players: [] }]);
    store.setJSON(store.keys.roundHistory, [{ id: 'round-1', players: [] }, { id: 'round-2', players: [] }]);
    const historyEvents = store.outbox.filter(item => item.key === store.keys.roundHistory);
    assert.equal(historyEvents.length, 1);
    assert.equal(JSON.parse(historyEvents[0].value).length, 2);
});

test('golfer experience profiles persist, validate, and map to adaptive guidance', () => {
    const values = new Map();
    const localStorage = {
        getItem: key => values.has(key) ? values.get(key) : null,
        setItem: (key, value) => values.set(key, String(value)),
        removeItem: key => values.delete(key)
    };
    const { value: store } = loadGlobal('js/storage.js', 'CourseCompassStore', { localStorage });
    assert.equal(store.playerProfile.experience, 'developing');
    const competitive = store.updatePlayerProfile('Alex', 'competitive', { driverCarry: 242, swingSpeed: 101, handicapRange: '5-9', handedness: 'left', preferredTee: 'back', distanceUnit: 'meters', improvementGoal: 'competition' });
    assert.equal(competitive.experience, 'competitive');
    assert.equal(competitive.driverCarry, 242);
    assert.equal(competitive.handedness, 'left');
    assert.equal(competitive.improvementGoal, 'competition');
    assert.equal(store.experienceProfile.skill, 'pro');
    assert.equal(store.updatePlayerProfile('Alex', 'unsupported').experience, 'developing');
    assert.equal(store.experienceProfile.lessonLevel, 'intermediate');
    const sanitized = store.updatePlayerProfile('Alex', 'advanced', { driverCarry: 900, swingSpeed: 10, preferredTee: 'black', distanceUnit: 'feet', improvementGoal: 'unknown' });
    assert.equal(sanitized.driverCarry, null);
    assert.equal(sanitized.swingSpeed, null);
    assert.equal(sanitized.preferredTee, 'auto');
    assert.equal(sanitized.distanceUnit, 'yards');
    assert.equal(sanitized.improvementGoal, 'consistency');
});

test('personal baseline scales neutral club estimates and respects display units', () => {
    const clubs = [
        { name: 'Driver', type: 'wood', avgDistanceMale: { intermediate: 220 }, avgDistanceFemale: { intermediate: 170 } },
        { name: '7-Iron', type: 'iron', avgDistanceMale: { intermediate: 140 }, avgDistanceFemale: { intermediate: 110 } }
    ];
    const CourseCompassStore = { playerProfile: { driverCarry: 210, distanceUnit: 'meters' } };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs }, CourseCompassStore });
    const bag = caddie.getDefaultBag('intermediate', 'neutral');
    assert.equal(bag.clubs.Driver.carry, 210);
    assert.equal(bag.clubs['7-Iron'].carry, 135);
    assert.equal(bag.baselineSource, 'driver-carry');
    assert.equal(caddie.displayDistanceValue(150), 137);
    assert.equal(caddie.inputDistanceToYards(137), 150);
});

test('preferred tee selection uses explicit position or driver-carry fit', () => {
    const tees = [{ id: 'f', name: 'Forward', totalYardage: 4800 }, { id: 'm', name: 'Middle', totalYardage: 5600 }, { id: 'b', name: 'Back', totalYardage: 6500 }, { id: 'c', name: 'Championship', totalYardage: 7100 }];
    const CourseCompassStore = { playerProfile: { preferredTee: 'auto', driverCarry: 230, experience: 'advanced' } };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs: [] }, CourseCompassStore });
    assert.equal(caddie.selectPreferredTee(tees).id, 'b');
    CourseCompassStore.playerProfile.preferredTee = 'forward';
    assert.equal(caddie.selectPreferredTee(tees).id, 'f');
    CourseCompassStore.playerProfile.preferredTee = 'championship';
    assert.equal(caddie.selectPreferredTee(tees).id, 'c');
});

test('guided calibration records nine anchor shots and applies learned club values', () => {
    let session = null;
    const clubs = ['Driver', '7-Iron', 'Pitching Wedge (PW)'].map((name, index) => ({ name, type: index ? (index === 1 ? 'iron' : 'wedge') : 'wood', avgDistanceMale: { intermediate: 220 - index * 60 }, avgDistanceFemale: { intermediate: 170 - index * 45 } }));
    const GolfData = { clubs, clubShotHistory: [], clubProfile: null, addClubShot(shot) { this.clubShotHistory.push({ ...shot, id: `shot-${this.clubShotHistory.length + 1}` }); } };
    const CourseCompassStore = { keys: { calibrationSession: 'calibration' }, playerProfile: { distanceUnit: 'yards' }, getJSON: () => session, setJSON: (_key, value) => { session = JSON.parse(JSON.stringify(value)); }, remove: () => { session = null; } };
    const document = { getElementById(id) { if (id === 'calibrationCarry') return { value: '150' }; if (id === 'calibrationOffline') return { value: '5' }; return null; }, querySelectorAll: () => [], querySelector: () => null };
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData, CourseCompassStore, document });
    caddie.startCalibration();
    for (let index = 0; index < 9; index++) assert.equal(caddie.recordCalibrationShot(), true);
    assert.equal(GolfData.clubShotHistory.length, 9);
    assert.ok(session.completedAt);
    assert.equal(GolfData.clubProfile.clubs.Driver.carry, 150);
});

test('weekly practice plans persist completion for the selected goal', () => {
    let saved = null;
    const CourseCompassStore = { keys: { practicePlan: 'practice' }, playerProfile: { improvementGoal: 'putting' }, getJSON: () => saved, setJSON: (_key, value) => { saved = JSON.parse(JSON.stringify(value)); } };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { CourseCompassStore });
    scoring.render = () => {};
    const plan = scoring.getPracticePlan();
    assert.equal(plan.tasks.length, 3);
    assert.match(plan.tasks[0].label, /putts/i);
    scoring.togglePracticeTask('task-1');
    assert.equal(saved.tasks[0].completed, true);
});

test('practice journal records sessions and completes the linked weekly task', () => {
    const saved = new Map();
    const CourseCompassStore = {
        keys: { practicePlan: 'practice-plan', practiceSessions: 'practice-sessions' },
        playerProfile: { improvementGoal: 'approach' },
        getJSON: (key, fallback) => saved.has(key) ? saved.get(key) : fallback,
        setJSON: (key, value) => saved.set(key, JSON.parse(JSON.stringify(value))),
        makeId: () => 'practice-test'
    };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { CourseCompassStore });
    const session = scoring.addPracticeSession({ taskId: 'task-1', focus: 'Calibrate three approach clubs', duration: 35, rating: 4, notes: 'Solid contact' });
    assert.equal(session.id, 'practice-test');
    assert.equal(scoring.getPracticeSessions()[0].duration, 35);
    assert.equal(saved.get('practice-plan').tasks[0].completed, true);
    assert.equal(scoring.practiceStreak(), 1);
});

test('empty coaching state renders the selected goal and practice workflow', () => {
    const saved = new Map();
    const CourseCompassStore = {
        keys: { practicePlan: 'practice-plan', practiceSessions: 'practice-sessions' },
        playerProfile: { improvementGoal: 'break-100' },
        getJSON: (key, fallback) => saved.has(key) ? saved.get(key) : fallback,
        setJSON: (key, value) => saved.set(key, JSON.parse(JSON.stringify(value)))
    };
    const GolfData = { roundHistory: [], getPlayerRounds: () => [] };
    const document = { getElementById: () => null };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { CourseCompassStore, GolfData, document });
    const html = scoring.renderInsights();
    assert.match(html, /Goal: Break 100/);
    assert.match(html, /Practice Journal/);
});

test('post-round review recommends from evidence and connects the priority to practice', () => {
    const saved = new Map();
    const CourseCompassStore = {
        keys: { roundReviews: 'round-reviews', practicePlan: 'practice-plan' },
        playerProfile: { improvementGoal: 'consistency' },
        getJSON: (key, fallback) => saved.has(key) ? saved.get(key) : fallback,
        setJSON: (key, value) => saved.set(key, JSON.parse(JSON.stringify(value)))
    };
    const GolfData = { roundHistory: [{ id: 'round-1', date: '2026-08-20', courseName: 'Test Course' }] };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { CourseCompassStore, GolfData });
    assert.equal(scoring.recommendRoundReview({ penalties: 3 }).priority, 'course-management');
    assert.equal(scoring.recommendRoundReview({ putts: 20, puttsHoles: 9 }).priority, 'putting');
    const fields = {
        '[data-review-priority]': 'approach', '[data-review-strength]': 'tee',
        '[data-review-decision]': '4', '[data-review-composure]': '3',
        '[data-review-win]': 'Committed tee shots', '[data-review-pattern]': 'Short-sided approaches',
        '[data-review-commitment]': 'Aim at the center'
    };
    const form = { dataset: { roundId: 'round-1', playerName: 'Alex' }, querySelector: selector => ({ value: fields[selector] }) };
    const button = { closest: () => form };
    scoring.viewRoundDetail = () => {};
    assert.equal(scoring.addReviewToPractice(button), true);
    assert.equal(scoring.getRoundReview('round-1', 'Alex').priority, 'approach');
    assert.ok(scoring.getRoundReview('round-1', 'Alex').addedToPlanAt);
    assert.equal(saved.get('practice-plan').tasks[0].source, 'round-review');
    assert.match(saved.get('practice-plan').tasks[0].label, /approach shots/i);
});

test('pre-round plan combines course, tee, conditions, bag confidence, goal, and review', () => {
    const saved = new Map();
    saved.set('round-reviews', [{ id: 'review:round-1:alex', roundId: 'round-1', playerName: 'Alex', courseName: 'Prior Course', roundDate: '2026-08-20', priority: 'approach', strength: 'tee', decisionRating: 4, composureRating: 4, win: '', costlyPattern: '', commitment: 'Aim at the center', updatedAt: '2026-08-21T12:00:00Z', addedToPlanAt: '' }]);
    const CourseCompassStore = {
        keys: { preRoundPlans: 'pre-round', roundReviews: 'round-reviews' },
        playerProfile: { name: 'Alex', improvementGoal: 'break-90' },
        experienceProfile: { skill: 'intermediate' },
        getJSON: (key, fallback) => saved.has(key) ? saved.get(key) : fallback,
        setJSON: (key, value) => saved.set(key, JSON.parse(JSON.stringify(value)))
    };
    const GolfData = { clubProfile: { version: 1, clubs: {} }, clubShotHistory: [{ club: '3-Wood', quality: 'solid' }, { club: '3-Wood', quality: 'normal' }] };
    const Caddie = {
        conditions: { temperature: 68, windSpeed: 8, windDirection: 'head' },
        getActiveBag: () => ({ clubs: { Driver: { enabled: true, carry: 225, dispersion: 25 }, '3-Wood': { enabled: true, carry: 205, dispersion: 15 }, '7-Iron': { enabled: true, carry: 145, dispersion: 12 } } }),
        formatDistance: value => `${value} yd`
    };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { CourseCompassStore, GolfData, Caddie });
    scoring.course = { id: 'course-1', name: 'Test Club', selectedTeeId: 'blue', tees: [{ id: 'blue', name: 'Blue', totalYardage: 6400 }], holes: [{ hole: 1, par: 4, yards: 410 }] };
    scoring.getCachedWeather = () => null;
    scoring.render = () => {};
    const plan = scoring.generatePreRoundPlan();
    assert.equal(plan.teeName, 'Blue');
    assert.equal(plan.club.name, '3-Wood');
    assert.match(plan.condition, /manual conditions/);
    assert.match(plan.scoringRule, /Protect bogey/);
    assert.equal(plan.reviewPriority, 'Approach play');
    assert.match(plan.tasks[4].label, /Aim at the center/);
    assert.match(scoring.renderPreRoundCarryover(), /Today’s scoring rule/);
    scoring.togglePreRoundTask('tee');
    assert.equal(scoring.getPreRoundPlan().tasks[0].completed, true);
});

test('performance lab renders accessible miss patterns and distance bands', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring');
    const rounds = [{ shotsByHole: { 1: [{ club: '7-Iron', carry: 150, total: 156, offline: -12 }, { club: '7-Iron', carry: 148, total: 154, offline: 3 }], 2: [{ club: 'Driver', carry: 225, total: 242, offline: 18 }] } }];
    const html = scoring.renderPerformanceLab(rounds);
    assert.match(html, /role="img"/);
    assert.match(html, /Shot-distance bands/);
    assert.match(html, /1 left/);
    assert.match(html, /1 right/);
    scoring.performanceClub = '7-Iron';
    const filtered = scoring.renderPerformanceLab(rounds);
    assert.match(filtered, /2 shots · Early sample/);
    assert.doesNotMatch(filtered, /1 right/);
});

test('complete multi-tee scorecards switch yardage, rating, and slope', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring');
    const holes = Array.from({ length: 18 }, (_, index) => ({ hole: index + 1, yards: 400 - index }));
    const forwardHoles = Array.from({ length: 18 }, (_, index) => ({ hole: index + 1, yards: 330 - index }));
    const course = { id: 'multi', rating: 70, slope: 120, holes, tees: [{ id: 'forward', rating: 68, slope: 115, holes: forwardHoles }] };
    const selected = scoring.courseWithTee(course, 'forward');
    assert.equal(selected.holes[0].yards, 330);
    assert.equal(selected.rating, 68);
    assert.equal(selected.slope, 115);
    assert.equal(course.holes[0].yards, 400);
});

test('accessibility presets apply text, contrast, motion, and simplified layout', () => {
    const document = { readyState: 'loading', addEventListener() {}, documentElement: { dataset: {} } };
    const { value: app } = loadGlobal('js/app.js', 'App', { document });
    app.applyAccessibility({ textSize: 'xlarge', contrast: 'high', motion: 'reduced', simplified: true });
    assert.deepEqual(document.documentElement.dataset, {
        textSize: 'xlarge', contrast: 'high', motion: 'reduced', simplified: 'true'
    });
});

test('versioned backups merge portable data and exclude device transport state', () => {
    const values = new Map();
    const localStorage = {
        getItem(key) { return values.has(key) ? values.get(key) : null; },
        setItem(key, value) { values.set(key, String(value)); },
        removeItem(key) { values.delete(key); }
    };
    const { value: store } = loadGlobal('js/storage.js', 'CourseCompassStore', { localStorage });
    store.setJSON(store.keys.roundHistory, [{ id: 'round-1', players: [] }]);
    store.setJSON(store.keys.clubShots, [{ id: 'shot-1', club: '7-Iron' }]);
    store.setJSON(store.keys.practiceSessions, [{ id: 'practice-1', duration: 20 }]);
    store.setJSON(store.keys.roundReviews, [{ id: 'review-1', priority: 'putting' }]);
    store.setJSON(store.keys.preRoundPlans, [{ id: 'prep-1', tasks: [] }]);
    const backup = store.exportObject();

    assert.equal(backup.format, 'coursecompass-backup');
    assert.equal(backup.version, 1);
    assert.equal(backup.data[store.keys.deviceId], undefined);
    assert.equal(backup.data[store.keys.syncOutbox], undefined);

    const incoming = {
        format: 'coursecompass-backup', version: 1,
        data: {
            [store.keys.roundHistory]: [{ id: 'round-2', players: [] }],
            [store.keys.clubShots]: [{ id: 'shot-1', club: '7-Iron' }, { id: 'shot-2', club: '8-Iron' }],
            [store.keys.practiceSessions]: [{ id: 'practice-2', duration: 30 }],
            [store.keys.roundReviews]: [{ id: 'review-2', priority: 'approach' }],
            [store.keys.preRoundPlans]: [{ id: 'prep-2', tasks: [] }]
        }
    };
    const result = store.importObject(incoming, 'merge');
    assert.equal(result.importedKeys, 5);
    assert.equal(store.getJSON(store.keys.roundHistory).map(round => round.id).join(','), 'round-1,round-2');
    assert.equal(store.getJSON(store.keys.clubShots).map(shot => shot.id).join(','), 'shot-1,shot-2');
    assert.equal(store.getJSON(store.keys.practiceSessions).map(session => session.id).join(','), 'practice-1,practice-2');
    assert.equal(store.getJSON(store.keys.roundReviews).map(review => review.id).join(','), 'review-1,review-2');
    assert.equal(store.getJSON(store.keys.preRoundPlans).map(plan => plan.id).join(','), 'prep-1,prep-2');
    assert.throws(() => store.importObject({ format: 'other', version: 1, data: {} }), /not a supported/);
});

test('sync transport stays dormant until a complete Firebase configuration is supplied', () => {
    const { value: sync } = loadGlobal('js/sync.js', 'CourseCompassSync', {
        COURSECOMPASS_FIREBASE_CONFIG: null,
        CourseCompassStore: { playerProfile: { name: 'Golfer' } }
    });

    assert.equal(sync.isConfigured(), false);
    assert.match(sync.renderPanel(), /Configuration required/);
    assert.equal(sync.sanitizeCode(' ab-c!23 4xyz '), 'ABC234XY');

    sync.config;
    sync.roundStates = [];
});

test('live group score summaries use played-hole par and escape player data', () => {
    const { value: sync } = loadGlobal('js/sync.js', 'CourseCompassSync', {
        COURSECOMPASS_FIREBASE_CONFIG: {
            apiKey: 'valid-api-key-123', projectId: 'coursecompass', appId: 'app-id-123456'
        },
        CourseCompassStore: { playerProfile: { name: 'Golfer' } }
    });
    sync.roundStates = [{
        uid: 'player-1', displayName: '<Alex>',
        activeRound: JSON.stringify({
            players: [{ id: 0, name: 'Alex' }],
            courseSnapshot: { name: 'Test Links', holes: [{ hole: 1, par: 4 }, { hole: 2, par: 3 }] },
            scores: { 0: { 1: 5, 2: 2 } }
        })
    }];

    assert.equal(sync.isConfigured(), true);
    const players = sync.getLivePlayers();
    assert.equal(players[0].total, 7);
    assert.equal(players[0].toPar, 0);
    assert.equal(players[0].holesPlayed, 2);
    assert.equal(sync.escape(players[0].name), '&lt;Alex&gt;');
});

test('live groups label presence freshness and warn about shared player identities', () => {
    const store = { playerProfile: { id: 'player-1', name: 'Alex' }, deviceId: 'device-a', outbox: [] };
    const { value: sync } = loadGlobal('js/sync.js', 'CourseCompassSync', {
        COURSECOMPASS_FIREBASE_CONFIG: { apiKey: 'valid-api-key-123', projectId: 'coursecompass', appId: 'app-id-123456' },
        CourseCompassStore: store
    });
    const recent = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    assert.equal(sync.memberPresence({ updatedAt: recent }).label, 'Online');
    assert.match(sync.memberPresence({ updatedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString() }).label, /12m ago/);
    sync.status = 'connected';
    sync.group = { id: 'ABC234', name: 'Foursome' };
    sync.members = [{ displayName: 'Alex', role: 'owner', updatedAt: recent }];
    sync.roundStates = [];
    sync.syncConflict = 'Another device is publishing as Alex.';
    const html = sync.renderPanel();
    assert.match(html, /1\/1 recently online/);
    assert.match(html, /Player identity conflict/);
    assert.match(html, /Another device is publishing as Alex/);
});

test('account data merging preserves histories and chooses the newest active round', () => {
    const keys = {
        roundHistory: 'rounds', clubShots: 'shots', customCourses: 'courses',
        practiceSessions: 'practice', roundReviews: 'reviews', preRoundPlans: 'prep', activeRound: 'active', clubProfile: 'clubs', playerProfile: 'profile'
    };
    const { value: sync } = loadGlobal('js/sync.js', 'CourseCompassSync', {
        COURSECOMPASS_FIREBASE_CONFIG: null,
        CourseCompassStore: { keys, playerProfile: { name: 'Golfer' } }
    });
    const mergedHistory = JSON.parse(sync.mergeRawValue('rounds', JSON.stringify([{ id: 'local' }]), JSON.stringify([{ id: 'cloud' }])));
    assert.deepEqual(mergedHistory.map(item => item.id), ['cloud', 'local']);
    const mergedPractice = JSON.parse(sync.mergeRawValue('practice', JSON.stringify([{ id: 'local-session' }]), JSON.stringify([{ id: 'cloud-session' }])));
    assert.deepEqual(mergedPractice.map(item => item.id), ['cloud-session', 'local-session']);
    const mergedReviews = JSON.parse(sync.mergeRawValue('reviews', JSON.stringify([{ id: 'local-review' }]), JSON.stringify([{ id: 'cloud-review' }])));
    assert.deepEqual(mergedReviews.map(item => item.id), ['cloud-review', 'local-review']);
    const mergedPrep = JSON.parse(sync.mergeRawValue('prep', JSON.stringify([{ id: 'local-prep' }]), JSON.stringify([{ id: 'cloud-prep' }])));
    assert.deepEqual(mergedPrep.map(item => item.id), ['cloud-prep', 'local-prep']);

    const localRound = JSON.stringify({ savedAt: '2026-08-20T10:00:00Z', marker: 'local' });
    const cloudRound = JSON.stringify({ savedAt: '2026-08-21T10:00:00Z', marker: 'cloud' });
    assert.equal(JSON.parse(sync.mergeRawValue('active', localRound, cloudRound)).marker, 'cloud');
});

test('Voice Caddie gives personal club and active-round answers without cloud AI', () => {
    const golfData = {
        dailyTips: ['Smooth tempo'], glossary: [{ term: 'Birdie', definition: 'One under par.' }],
        activeRound: null
    };
    const scoring = {
        players: [{ id: 0, name: 'Alex' }],
        scores: { 0: { 1: 5, 2: 3 } },
        course: { holes: [{ hole: 1, par: 4 }, { hole: 2, par: 3 }] }
    };
    const caddie = { conditions: {}, calculateShotPlan({ distance }) {
        let effectiveDistance = distance;
        if (this.conditions.windDirection === 'head') effectiveDistance += Math.round(distance * (this.conditions.windSpeed || 0) * 0.01);
        return { effectiveDistance, drift: 0, aimDirection: '', factors: [] };
    }, getActiveBag() { return { clubs: {
        '5-Iron': { enabled: true, carry: 180, dispersion: 14 },
        '7-Iron': { enabled: true, carry: 150, dispersion: 12 },
        '8-Iron': { enabled: true, carry: 140, dispersion: 10 }
    } }; } };
    const { value: voice } = loadGlobal('js/voice.js', 'VoiceCaddie', {
        GolfData: golfData, Scoring: scoring, Caddie: caddie,
        CourseCompassStore: { playerProfile: { name: 'Alex' } },
        CourseCompassSync: { group: null }, App: { navigate() {} },
        COURSECOMPASS_AI_POLICY: { allowBillableUsage: false }
    });

    assert.match(voice.answer('What club for 148 yards?'), /7-Iron/);
    caddie.conditions = { windSpeed: 20, windDirection: 'head', altitude: 0 };
    assert.match(voice.answer('What club for 150 yards?'), /5-Iron.*playing closer to 180/);
    assert.match(voice.answer('What is my round status?'), /1 over par through 2 holes/);
    assert.match(voice.answer('What is a birdie?'), /One under par/);
    assert.match(voice.answer('Can you compose a poem?'), /didn.t quite catch/i);
});

test('Voice Caddie persists controls and handles no-cost condition and score commands', () => {
    const values = new Map();
    const localStorage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, String(value)) };
    const caddie = {
        currentTool: 'club-selector', conditions: {}, saveConditionsCalled: 0,
        saveConditions() { this.saveConditionsCalled++; }, applyConditions() {}
    };
    let recorded = null;
    const scoring = {
        players: [{ id: 3, name: 'Alex' }], scores: { 3: {} }, course: { holes: [{ hole: 7, par: 4 }] },
        updateScore(...args) { recorded = args; }
    };
    const { value: voice } = loadGlobal('js/voice.js', 'VoiceCaddie', {
        localStorage, Caddie: caddie, Scoring: scoring, GolfData: { glossary: [] },
        CourseCompassStore: { playerProfile: { name: 'Alex' } }, CourseCompassSync: { group: null }, App: { navigate() {} }
    });
    assert.match(voice.answer('Set a 12 mph headwind'), /updated.*12 mile-per-hour headwind/i);
    assert.equal(caddie.conditions.windSpeed, 12);
    assert.equal(caddie.conditions.windDirection, 'head');
    assert.match(voice.answer('Record a 5 on hole 7'), /recorded bogey/i);
    assert.deepEqual(recorded, [3, 7, 5, 4]);
    voice.toggleSpeech(false);
    const { value: reloaded } = loadGlobal('js/voice.js', 'VoiceCaddie', { localStorage });
    reloaded.loadSettings();
    assert.equal(reloaded.speakReplies, false);
});

test('AI policy prohibits billable and remote generative usage', () => {
    const { value: policy } = loadGlobal('js/ai-policy.js', 'COURSECOMPASS_AI_POLICY');
    assert.equal(policy.mode, 'free-tier-only');
    assert.equal(policy.allowBillableUsage, false);
    assert.equal(policy.maximumMonthlyCostUsd, 0);
    assert.equal(policy.remoteGenerativeAI, false);
});

test('major championship view includes all-time leaders for women', () => {
    const golfData = {
        pgaTournaments: [],
        lpgaTournaments: []
    };
    const { value: leaderboard } = loadGlobal('js/leaderboard.js', 'Leaderboard', { GolfData: golfData });
    const html = leaderboard.renderMajors();

    assert.match(html, /All-Time Major Championship Leaders \(Women\)/);
    assert.match(html, /Patty Berg/);
    assert.match(html, />15</);
    assert.match(html, /Mickey Wright/);
    assert.match(html, /Annika Sörenstam/);
    assert.match(html, /LPGA-recognized major totals span different championship eras/);
});

test('field modes persist and expose outdoor display state', () => {
    const attributes = new Map();
    const toggle = { textContent: '', title: '', setAttribute(name, value) { this[name] = value; } };
    const document = {
        documentElement: { setAttribute: (name, value) => attributes.set(name, value), getAttribute: name => attributes.get(name) },
        getElementById: id => id === 'fieldModeToggle' ? toggle : null,
        querySelectorAll: () => [],
        addEventListener() {}
    };
    let saved = null;
    const { value: app } = loadGlobal('js/app.js', 'App', {
        document,
        CourseCompassStore: { keys: { fieldMode: 'field-mode' }, setRaw: (key, value) => { saved = [key, value]; } }
    });

    assert.equal(app.setFieldMode('sunlight'), 'sunlight');
    assert.equal(attributes.get('data-field-mode'), 'sunlight');
    assert.equal(toggle.textContent, 'Sunlight');
    assert.deepEqual(saved, ['field-mode', 'sunlight']);
});

test('battery field mode lowers GPS power demand and extends weather polling', () => {
    const document = { documentElement: { getAttribute: () => 'battery' }, getElementById: () => null, querySelector: () => null };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { document });

    assert.equal(scoring.getWeatherRefreshMs(), 15 * 60 * 1000);
    const options = scoring.getGpsOptions();
    assert.equal(options.enableHighAccuracy, false);
    assert.equal(options.timeout, 20000);
    assert.equal(options.maximumAge, 30000);
});

test('professional tour tables disclose reference-data status', () => {
    const golfData = { pgaTournaments: [], pgaLeaderboard: [], lpgaTournaments: [], lpgaLeaderboard: [] };
    const { value: leaderboard } = loadGlobal('js/leaderboard.js', 'Leaderboard', { GolfData: golfData });

    assert.match(leaderboard.renderPGA(), /Demonstration dataset/);
    assert.match(leaderboard.renderLPGA(), /not a live PGA or LPGA feed/);
    assert.match(leaderboard.renderMajors(), /Reference data/);
});

test('course completeness rewards usable scorecards and mapped targets', () => {
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie');
    const completeHoles = Array.from({ length: 18 }, (_, index) => ({
        hole: index + 1, par: 4, yards: 400,
        coordinates: { green: { lat: 39 + index / 1000, lon: -86 } }
    }));
    const score = caddie.getCourseCompleteness({
        name: 'Complete Course', location: 'Indianapolis, IN', lat: 39.7, lon: -86.1,
        rating: 72, slope: 125, grass: 'Bentgrass', style: 'Parkland', holes: completeHoles
    });

    assert.equal(score, 100);
    assert.ok(caddie.getCourseCompleteness({ name: 'Basic', location: 'Indiana', holes: [] }) < 30);
});

test('unified shot decisions combine distance, conditions, personal clubs, and safe miss', () => {
    const Caddie = { conditions: { distance: 160 }, calculateShotPlan: ({ distance }) => ({ effectiveDistance: distance + 8, drift: 0, aimDirection: '' }), getActiveBag: () => ({ clubs: { '7 Iron': { enabled: true, carry: 168, dispersion: 14, source: 'learned', sampleCount: 8 } } }) };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { Caddie });
    scoring.gpsPosition = { lat: 39, lon: -86, accuracy: 10, timestamp: Date.now() };
    const decision = scoring.getShotDecision({ hole: 1, yards: 160, hazards: [{ type: 'water', pos: 'right' }], mapGeometry: { path: [{ lat: 39, lon: -86 }, { lat: 39.001, lon: -86 }] } });
    assert.equal(decision.club.name, '7 Iron');
    assert.equal(decision.plan.effectiveDistance, decision.actualDistance + 8);
    assert.equal(decision.safeMiss, 'Favor the left side');
    assert.equal(decision.confidence, 'High');
    assert.match(decision.confidenceReason, /8 accepted shots/);
    assert.match(scoring.renderShotDecision({ hole: 1, yards: 160, hazards: [] }), /Shot Decision/);
});

test('beginner shot decisions use beginner distances and center-target language', () => {
    let requestedSkill = '';
    const Caddie = { conditions: { distance: 125 }, calculateShotPlan: ({ distance }) => ({ effectiveDistance: distance, drift: 0, aimDirection: '' }), getActiveBag: skill => { requestedSkill = skill; return { clubs: { '8 Iron': { enabled: true, carry: 125, dispersion: 18, source: 'estimate' } } }; } };
    const CourseCompassStore = { experienceProfile: { id: 'beginner', label: 'Beginner', skill: 'beginner', detail: 'essential' } };
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { Caddie, CourseCompassStore });
    const hole = { hole: 1, yards: 125, hazards: [{ type: 'water', pos: 'right' }] };
    const decision = scoring.getShotDecision(hole);
    assert.equal(requestedSkill, 'beginner');
    assert.equal(decision.safeMiss, 'Aim for the center of the safest target');
    assert.match(scoring.renderShotDecision(hole), /Beginner Shot Decision/);
    assert.match(scoring.renderShotDecision(hole), /Hear simple plan/);
});

test('GPS hardening rejects inaccurate and implausible jumps', () => {
    const { value: scoring } = loadGlobal('js/scoring.js', 'Scoring', { Caddie: { conditions: {} } });
    assert.equal(scoring.acceptGpsPosition({ coords: { latitude: 39, longitude: -86, accuracy: 200 }, timestamp: 1000 }), false);
    assert.equal(scoring.acceptGpsPosition({ coords: { latitude: 39, longitude: -86, accuracy: 5 }, timestamp: 2000 }), true);
    assert.equal(scoring.acceptGpsPosition({ coords: { latitude: 40, longitude: -85, accuracy: 10 }, timestamp: 3000 }), false);
    assert.match(scoring.gpsError, /jump/);
});

test('course verification exposes mapped coverage and correction status', () => {
    const { value: caddie } = loadGlobal('js/caddie.js', 'Caddie', { GolfData: { clubs: [] } });
    const coverage = caddie.getCourseCoverage({ holes: [{ mapGeometry: { path: [{}, {}] } }, { coordinates: { green: { lat: 1, lon: 2 } } }, {}] });
    assert.equal(JSON.stringify(coverage), JSON.stringify({ total: 3, mapped: 1, targets: 2, missing: 1, status: 'Partial' }));
});

test('live group host controls lock completed holes for non-host players', () => {
    const { value: sync } = loadGlobal('js/sync.js', 'CourseCompassSync', {});
    sync.user = { uid: 'player' };
    sync.group = { id: 'ABC234', ownerUid: 'host', lockedThrough: 4 };
    assert.equal(sync.isHoleLocked(4), true);
    assert.equal(sync.isHoleLocked(5), false);
    assert.match(sync.groupJoinUrl(), /group=ABC234/);
});

test('live group join QR is generated locally without a third-party request', () => {
    const fakeQr = () => ({ addData() {}, make() {}, createSvgTag() { return '<svg data-local-qr="true"></svg>'; } });
    const { value: sync } = loadGlobal('js/sync.js', 'CourseCompassSync', { qrcode: fakeQr });
    sync.group = { id: 'ABC234' };
    const html = sync.renderGroupQr('https://coursecompass.app/?group=ABC234');
    assert.match(html, /data-local-qr="true"/);
    assert.doesNotMatch(html, /https?:\/\//);
    assert.doesNotMatch(sync.renderPanel.toString(), /quickchart/i);
});

test('onboarding and privacy controls are available without cloud services', () => {
    const { value: app } = loadGlobal('js/app.js', 'App', { document: { readyState: 'loading', addEventListener() {} } });
    assert.equal(typeof app.showOnboarding, 'function');
    assert.equal(typeof app.showPrivacyCenter, 'function');
    assert.equal(typeof app.deleteLocalData, 'function');
});

test('cloud account deletion transfers an owned group before removing the account', async () => {
    const operations = [];
    const store = {
        syncKeys: [],
        remove() {},
        getJSON: (_key, fallback) => fallback,
        getRaw: () => null,
        setRaw() {},
        playerProfile: { id: 'player', name: 'Host' },
        deviceId: 'device'
    };
    const app = {
        ensureProductDialog: () => ({ close: () => operations.push('dialog-close') }),
        setDataCenterMessage: message => operations.push(`message:${message}`)
    };
    const { value: sync } = loadGlobal('js/sync.js', 'CourseCompassSync', {
        CourseCompassStore: store,
        App: app,
        confirm: () => true,
        window: { addEventListener() {} },
        document: { addEventListener() {}, getElementById: () => null, querySelectorAll: () => [] },
        navigator: { onLine: true }
    });
    sync.user = { uid: 'host' };
    sync.group = { id: 'ABC234', ownerUid: 'host' };
    sync.members = [{ uid: 'host', role: 'owner' }, { uid: 'guest', role: 'player' }];
    sync.db = {};
    sync.api = {
        doc: (_db, ...parts) => parts.join('/'),
        serverTimestamp: () => 'timestamp',
        updateDoc: async (ref, value) => operations.push(`update:${ref}:${value.ownerUid || value.role}`),
        deleteDoc: async ref => operations.push(`delete:${ref}`)
    };
    sync.authApi = { deleteUser: async user => operations.push(`auth-delete:${user.uid}`) };
    sync.refreshPanel = () => operations.push('refresh');

    await sync.deleteCloudAccount();

    assert.deepEqual(operations.slice(0, 6), [
        'update:groups/ABC234/members/guest:owner',
        'update:groups/ABC234:guest',
        'delete:groups/ABC234/roundStates/host',
        'delete:groups/ABC234/members/host',
        'delete:users/host',
        'auth-delete:host'
    ]);
    assert.equal(sync.user, null);
    assert.equal(sync.group, null);
});
