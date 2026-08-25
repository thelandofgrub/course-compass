/* =========================================================
   CourseCompass — Scoring & Handicap Module
   Scorecard tracker, handicap calculator, scoring terms
   ========================================================= */

const Scoring = {

    currentTool: 'scorecard',
    players: [],
    scores: {},
    roundStats: {},
    roundShots: {},
    roundPins: {},
    course: null,
    handicapRounds: [],
    savedRoundSignature: null,
    scorecardNotice: '',
    currentRoundHole: 1,
    weatherRefreshMs: 5 * 60 * 1000,
    weatherForegroundMinMs: 60 * 1000,
    weatherTimer: null,
    weatherRequest: null,
    weatherResumeHandler: null,
    weatherForceNext: false,
    gpsWatchId: null,
    gpsTracking: false,
    gpsPosition: null,
    gpsError: '',
    gpsRejectedUpdates: 0,
    activeGpsShot: null,
    gpsShotNotice: '',
    gpsTargetPreference: 'center',
    mapTarget: null,
    holeWindAnalysis: null,
    performanceClub: 'all',

    init() {
        const selected = GolfData.selectedCourse;
        this.course = selected?.holes?.length ? selected : GolfData.defaultCourse;
        this.bindTabs();
        this.render('scorecard');
    },

    bindTabs() {
        document.querySelectorAll('.scoring-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.scoring-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTool = tab.dataset.scoring;
                this.render(this.currentTool);
            });
        });
    },

    render(tool) {
        const container = document.getElementById('scoringContent');
        if (!container) return;
        this.stopWeatherRefresh();
        if (tool !== 'on-course') this.stopGpsTracking(false);
        switch (tool) {
            case 'scorecard': container.innerHTML = this.renderScorecard(); this.bindScorecardEvents(); break;
            case 'on-course': container.innerHTML = this.renderOnCourse(); this.bindOnCourseWeather(); break;
            case 'progress':  container.innerHTML = this.renderProgress(); this.bindProgressEvents(); break;
            case 'insights':  container.innerHTML = this.renderInsights(); break;
            case 'handicap':  container.innerHTML = this.renderHandicap(); this.bindHandicapEvents(); break;
            case 'terms':     container.innerHTML = this.renderTerms(); break;
        }
    },

    setScoringTool(tool) {
        document.querySelectorAll('.scoring-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.scoring === tool));
        this.currentTool = tool;
        this.render(tool);
    },

    renderOnCourse() {
        const holes = this.getCourseHoles();
        if (!this.players.length || !holes.length) return `
            <div class="on-course-empty">
                <span class="empty-state-code">ROUND</span>
                <h2>Start a round to enter On-Course Mode</h2>
                <p>Choose a course and players first. This view then combines hole navigation, quick scoring, shot planning, and Voice Caddie.</p>
                <button class="btn btn-primary btn-lg" onclick="Scoring.setScoringTool('scorecard')">Set Up a Round</button>
            </div>`;

        if (!holes.some(hole => hole.hole === this.currentRoundHole)) {
            const firstUnscored = holes.find(hole => this.players.some(player => !Number(this.scores[player.id]?.[hole.hole])));
            this.currentRoundHole = (firstUnscored || holes[0]).hole;
        }
        const index = Math.max(0, holes.findIndex(hole => hole.hole === this.currentRoundHole));
        const hole = holes[index];
        const conditions = Caddie.conditions || {};
        const distanceUnit = Caddie.getDistanceUnit?.() || 'yards';
        const displayDistance = value => Caddie.displayDistanceValue?.(value) ?? Math.round(Number(value));
        const directionLabels = { none: 'No wind', head: 'Headwind', tail: 'Tailwind', 'cross-l': 'Crosswind L→R', 'cross-r': 'Crosswind R→L' };
        const conditionsLabel = `${Number(conditions.windSpeed) || 0} mph ${directionLabels[conditions.windDirection] || 'No wind'} · ${Number(conditions.temperature) || 72}°F · ${Number(conditions.altitude) || 0} ft altitude`;
        const progress = Math.round(((index + 1) / holes.length) * 100);
        const playerCards = this.players.map(player => {
            const scoringLocked = typeof CourseCompassSync !== 'undefined' && CourseCompassSync.isHoleLocked?.(hole.hole);
            const score = Number(this.scores[player.id]?.[hole.hole]) || 0;
            const relation = !score ? 'Not entered' : score === hole.par ? 'Par' : score < hole.par ? `${hole.par - score} under` : `${score - hole.par} over`;
            const quickScores = [hole.par - 2, hole.par - 1, hole.par, hole.par + 1, hole.par + 2]
                .filter(value => value > 0)
                .map(value => `<button type="button" class="quick-score ${score === value ? 'selected' : ''}" onclick="Scoring.setOnCourseScore(${player.id}, ${hole.hole}, ${value}, ${hole.par})" ${scoringLocked ? 'disabled title="Locked by group host"' : ''}>${value === hole.par ? 'Par' : value < hole.par ? `-${hole.par - value}` : `+${value - hole.par}`}<small>${value}</small></button>`).join('');
            return `<article class="on-course-player" style="--player-color:${player.color}">
                <div class="on-course-player-heading"><span class="player-dot"></span><strong>${esc(player.name)}</strong><span>${relation}</span></div>
                <div class="quick-score-row">${quickScores}</div>
                <label class="exact-score">Exact score <input class="form-input" type="number" min="1" max="20" value="${score || ''}" placeholder="—" onchange="Scoring.setOnCourseScore(${player.id}, ${hole.hole}, this.value, ${hole.par})" ${scoringLocked ? 'disabled' : ''}></label>
            </article>`;
        }).join('');

        return `<div class="on-course-shell">
            <header class="on-course-header">
                <div><span class="eyebrow">${esc(this.course.name || 'Active round')}</span><h2>Hole ${hole.hole}</h2><p>Par ${hole.par}${hole.yards ? ` · ${displayDistance(hole.yards)} ${distanceUnit}` : ''}${hole.type ? ` · ${esc(hole.type)}` : ''}</p><span class="field-mode-readout" data-field-mode-label>${typeof App !== 'undefined' ? App.getFieldModeLabel() : 'Standard'} mode</span></div>
                <div class="on-course-header-actions"><button class="btn btn-secondary" onclick="VoiceCaddie.toggle(true)">Ask Caddie</button><button class="btn btn-secondary" onclick="Scoring.setScoringTool('scorecard')">Full Scorecard</button></div>
            </header>
            <div class="hole-progress" aria-label="Round progress"><span style="width:${progress}%"></span></div>
            ${index === 0 ? this.renderPreRoundCarryover() : ''}
            <nav class="hole-nav" aria-label="Hole navigation">
                <button type="button" onclick="Scoring.moveOnCourseHole(-1)" ${index === 0 ? 'disabled' : ''}>← Previous</button>
                <select class="form-select" onchange="Scoring.goToOnCourseHole(this.value)" aria-label="Current hole">${holes.map(item => `<option value="${item.hole}" ${item.hole === hole.hole ? 'selected' : ''}>Hole ${item.hole} · Par ${item.par}</option>`).join('')}</select>
                <button type="button" onclick="Scoring.moveOnCourseHole(1)" ${index === holes.length - 1 ? 'disabled' : ''}>Next →</button>
            </nav>
            ${this.renderShotDecision(hole)}
            ${this.renderOnCourseGps(hole)}
            <details class="on-course-strategy" open>
                <summary><span>Hole Map & Strategy</span><small>Shape, hazards, green, and recommended play</small></summary>
                ${this.renderOnCourseStrategy(hole)}
            </details>
            <div class="on-course-grid">
                <section class="on-course-card on-course-scoring"><div class="on-course-card-title"><h3>Quick scoring</h3><span>${index + 1} of ${holes.length}</span></div>${playerCards}</section>
                <section class="on-course-card shot-plan-card">
                    <div class="on-course-card-title"><h3>Fine-tune distance</h3><button type="button" onclick="App.navigate('caddie'); Caddie.currentTool='distance-calc'; Caddie.render('distance-calc')">Edit conditions</button></div>
                    <p class="conditions-line">${conditionsLabel}</p>
                    <label>Distance to target<div class="shot-plan-input"><input id="onCourseDistance" class="form-input" type="number" min="1" max="${distanceUnit === 'meters' ? '549' : '600'}" value="${displayDistance(conditions.distance || hole.yards || '') || ''}" placeholder="${distanceUnit === 'meters' ? 'Meters' : 'Yards'}"><span>${distanceUnit === 'meters' ? 'm' : 'yds'}</span></div></label>
                    <button class="btn btn-primary btn-block" onclick="Scoring.calculateOnCourseClub()">Recommend a Club</button>
                    <div id="onCourseClubResult" class="on-course-club-result" aria-live="polite">Enter the distance remaining for a condition-adjusted recommendation.</div>
                </section>
            </div>
            <div class="on-course-bottom-actions"><button class="btn btn-secondary" onclick="Scoring.setScoringTool('scorecard')">View all scores</button>${index === holes.length - 1 ? '<button class="btn btn-accent" onclick="Scoring.saveCurrentRound()">Finish Round</button>' : '<button class="btn btn-primary" onclick="Scoring.moveOnCourseHole(1)">Save & Next Hole →</button>'}</div>
        </div>`;
    },

    normalizeGpsPoint(value) {
        const lat = Number(value?.lat), lon = Number(value?.lon);
        return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
    },

    distanceBetweenYards(a, b) {
        const start = this.normalizeGpsPoint(a), end = this.normalizeGpsPoint(b);
        if (!start || !end) return null;
        const toRad = value => value * Math.PI / 180;
        const dLat = toRad(end.lat - start.lat), dLon = toRad(end.lon - start.lon);
        const value = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(start.lat)) * Math.cos(toRad(end.lat)) * Math.sin(dLon / 2) ** 2;
        return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value)) * 1.0936133;
    },

    getHoleGpsTargets(hole) {
        const manualTee = this.normalizeGpsPoint(hole?.coordinates?.tee);
        const manualFront = this.normalizeGpsPoint(hole?.coordinates?.greenFront);
        const manualCenter = this.normalizeGpsPoint(hole?.coordinates?.greenCenter) || this.normalizeGpsPoint(hole?.coordinates?.green);
        const manualBack = this.normalizeGpsPoint(hole?.coordinates?.greenBack);
        const roundPin = this.normalizeGpsPoint(this.roundPins?.[hole?.hole]);
        const path = Array.isArray(hole?.mapGeometry?.path) ? hole.mapGeometry.path : [];
        const tee = manualTee || this.normalizeGpsPoint(path[0]);
        const mappedGreen = this.normalizeGpsPoint(path[path.length - 1]);
        const greenCenter = manualCenter || mappedGreen;
        const greenTargets = { front: manualFront, center: greenCenter, back: manualBack, pin: roundPin };
        const preferred = ['front', 'center', 'back', 'pin'].includes(this.gpsTargetPreference) ? this.gpsTargetPreference : 'center';
        const greenTargetKey = greenTargets[preferred] ? preferred : greenTargets.pin ? 'pin' : greenTargets.center ? 'center' : greenTargets.front ? 'front' : 'back';
        const green = greenTargets[greenTargetKey] || null;
        const hazards = (Array.isArray(hole?.mapGeometry?.features) ? hole.mapGeometry.features : [])
            .filter(feature => ['bunker', 'water'].includes(feature?.type))
            .map(feature => {
                const geometry = Array.isArray(feature.geometry) ? feature.geometry.map(point => this.normalizeGpsPoint(point)).filter(Boolean) : [];
                const center = this.normalizeGpsPoint(feature.center) || (geometry.length ? { lat: geometry.reduce((sum, point) => sum + point.lat, 0) / geometry.length, lon: geometry.reduce((sum, point) => sum + point.lon, 0) / geometry.length } : null);
                return center ? { type: feature.type, point: center } : null;
            }).filter(Boolean).slice(0, 30);
        const manualTarget = ['front', 'back'].includes(greenTargetKey) ? greenTargets[greenTargetKey] : manualCenter;
        return { tee, green, greenFront: manualFront, greenCenter, greenBack: manualBack, pin: roundPin, greenTargetKey, hazards, source: greenTargetKey === 'pin' ? 'Round pin' : manualTarget ? 'Manual target' : green ? 'OpenStreetMap' : '' };
    },

    getGpsDistances(hole, position = this.gpsPosition) {
        const current = this.normalizeGpsPoint(position);
        const targets = this.getHoleGpsTargets(hole);
        if (!current) return { ...targets, greenYards: null, teeYards: null, hazards: [] };
        return {
            editable: true,
            ...targets,
            greenYards: this.distanceBetweenYards(current, targets.green),
            greenDistances: {
                front: this.distanceBetweenYards(current, targets.greenFront),
                center: this.distanceBetweenYards(current, targets.greenCenter),
                back: this.distanceBetweenYards(current, targets.greenBack),
                pin: this.distanceBetweenYards(current, targets.pin)
            },
            teeYards: this.distanceBetweenYards(current, targets.tee),
            hazards: targets.hazards.map(hazard => ({ ...hazard, yards: this.distanceBetweenYards(current, hazard.point) }))
                .filter(hazard => Number.isFinite(hazard.yards)).sort((a, b) => a.yards - b.yards).slice(0, 4)
        };
    },

    getOnCourseMapContext(hole) {
        const distances = this.getGpsDistances(hole);
        return {
            position: this.normalizeGpsPoint(this.gpsPosition),
            accuracy: Number(this.gpsPosition?.accuracy),
            shotStart: this.normalizeGpsPoint(this.activeGpsShot?.start),
            mapTarget: this.normalizeGpsPoint(this.mapTarget),
            targets: ['front', 'center', 'back', 'pin'].map(key => ({
                key,
                point: distances[key === 'center' ? 'greenCenter' : key === 'pin' ? 'pin' : `green${key[0].toUpperCase()}${key.slice(1)}`],
                yards: distances.greenDistances?.[key]
            })),
            hazards: distances.hazards
        };
    },

    getShotDecision(hole) {
        const experience = globalThis.CourseCompassStore?.experienceProfile || { id: 'developing', label: 'Developing', skill: 'intermediate', detail: 'guided' };
        const gps = this.getGpsDistances(hole);
        const targetDistance = this.mapTarget ? this.distanceBetweenYards(this.gpsPosition || gps.tee, this.mapTarget) : null;
        const actualDistance = Number.isFinite(targetDistance) ? Math.round(targetDistance) : Number.isFinite(gps.greenYards) ? Math.round(gps.greenYards) : Number(Caddie.conditions.distance || hole?.yards || 0);
        const plan = typeof Caddie.calculateShotPlan === 'function' ? Caddie.calculateShotPlan({ distance: Math.max(1, actualDistance || 1) }) : { effectiveDistance: Math.max(1, actualDistance || 1), drift: 0, aimDirection: '' };
        const bag = typeof Caddie.getActiveBag === 'function' ? Caddie.getActiveBag(experience.skill, 'neutral') : { clubs: {} };
        const choices = Object.entries(bag.clubs || {}).filter(([, values]) => values.enabled !== false && Number(values.carry) > 0)
            .map(([name, values]) => ({ name, carry: Number(values.carry), dispersion: Number(values.dispersion) || 0, source: values.source || 'estimate', sampleCount: Number(values.sampleCount) || 0, gap: Math.abs(Number(values.carry) - plan.effectiveDistance) }))
            .sort((a, b) => a.gap - b.gap || a.dispersion - b.dispersion);
        const club = choices[0] || null;
        const hazardPositions = (hole?.hazards || []).map(value => String(value.pos || ''));
        const safeMiss = experience.id === 'beginner' ? 'Aim for the center of the safest target' : hazardPositions.some(value => value.includes('right')) ? 'Favor the left side' : hazardPositions.some(value => value.includes('left')) ? 'Favor the right side' : 'Favor the widest part of the target';
        const accuracy = Number(this.gpsPosition?.accuracy);
        const learnedSamples = Number(club?.sampleCount || 0);
        const clubBasis = club?.source === 'learned' ? `learned from ${learnedSamples} accepted shots` : club?.source === 'profile' ? 'your saved club profile' : 'skill-level club estimate';
        const confidence = !this.gpsPosition ? 'Estimated' : accuracy > 40 ? 'Caution' : accuracy <= 15 && learnedSamples >= 8 ? 'High' : 'Good';
        const confidenceReason = this.gpsPosition ? `GPS ±${Math.round(accuracy)} m · ${clubBasis}` : `No live GPS · ${clubBasis}`;
        const source = this.mapTarget ? 'Map target' : Number.isFinite(gps.greenYards) ? `${gps.greenTargetKey || 'green'} GPS` : 'Entered distance';
        return { actualDistance, plan, club, safeMiss, confidence, confidenceReason, source, experience };
    },

    renderShotDecision(hole) {
        const decision = this.getShotDecision(hole);
        const displayDistance = value => Caddie.displayDistanceValue?.(value) ?? Math.round(Number(value));
        const unit = Caddie.getDistanceUnit?.() === 'meters' ? 'm' : 'yd';
        const aim = decision.plan.drift ? `Aim ${decision.plan.drift} yd ${decision.plan.aimDirection}` : decision.safeMiss;
        const detail = decision.experience.id === 'beginner'
            ? `Simple play · ${decision.safeMiss}`
            : decision.experience.id === 'competitive'
                ? `${decision.source} · ${decision.safeMiss} · dispersion ${decision.club?.dispersion ? `±${Caddie.formatDistance?.(decision.club.dispersion) || decision.club.dispersion + ' yd'}` : 'not established'}`
                : `${decision.source} · ${decision.safeMiss}`;
        const actionLabel = decision.experience.id === 'beginner' ? 'Hear simple plan' : 'Read recommendation';
        return `<section class="shot-decision-card" id="shotDecisionCard" aria-live="polite">
            <header><div><span class="eyebrow">${esc(decision.experience.label)} Shot Decision</span><h3>${decision.club ? esc(decision.club.name) : 'Set up My Bag'}</h3></div><span class="decision-confidence confidence-${decision.confidence.toLowerCase()}">${decision.confidence} confidence</span></header>
            <div class="shot-decision-numbers"><div><span>Actual</span><strong>${displayDistance(decision.actualDistance || 0)}</strong><small>${unit}</small></div><div><span>Plays like</span><strong>${displayDistance(decision.plan.effectiveDistance)}</strong><small>${unit}</small></div><div><span>Carry</span><strong>${decision.club?.carry ? displayDistance(decision.club.carry) : '—'}</strong><small>${unit}</small></div></div>
            <div class="shot-decision-guidance"><strong>${esc(aim)}</strong><span>${esc(detail)}</span><small>${esc(decision.confidenceReason)}</small></div>
            <div class="shot-decision-actions"><button class="btn btn-primary btn-sm" type="button" onclick="VoiceCaddie.speakShotDecision()">${actionLabel}</button>${this.mapTarget ? '<button class="btn btn-outline btn-sm" type="button" onclick="Scoring.clearAerialTarget()">Clear map target</button>' : '<span>Tap the aerial map to choose a landing target.</span>'}</div>
        </section>`;
    },

    refreshShotDecision() {
        const hole = this.getCourseHoles().find(item => item.hole === this.currentRoundHole);
        const card = document.getElementById('shotDecisionCard');
        if (hole && card) card.outerHTML = this.renderShotDecision(hole);
    },

    setAerialTarget(point) {
        const target = this.normalizeGpsPoint(point);
        const hole = this.getCourseHoles().find(item => item.hole === this.currentRoundHole);
        if (!target || !hole) return;
        this.mapTarget = target;
        const origin = this.normalizeGpsPoint(this.gpsPosition) || this.getHoleGpsTargets(hole).tee;
        const yards = this.distanceBetweenYards(origin, target);
        if (Number.isFinite(yards)) Caddie.conditions.distance = Math.max(1, Math.min(600, Math.round(yards)));
        Caddie.saveConditions();
        this.refreshGpsCard();
        this.refreshShotDecision();
    },

    clearAerialTarget() {
        this.mapTarget = null;
        this.refreshGpsCard();
        this.refreshShotDecision();
    },

    openCurrentCourseEditor() {
        let course = GolfData.customCourses.find(item => item.id === this.course?.id);
        if (!course) {
            const copy = JSON.parse(JSON.stringify(this.course));
            copy.id = `corrected-${String(copy.id || 'course')}-${Date.now()}`;
            copy.name = `${copy.name} · Corrected`;
            copy.source = { ...(copy.source || {}), provider: 'Player-corrected course', userCorrectedAt: new Date().toISOString() };
            if (!GolfData.addCustomCourse(copy)) return;
            course = copy;
        }
        GolfData.selectedCourseId = course.id;
        Caddie._courseState.selectedCourseId = course.id;
        Caddie._courseState.builderCourseId = course.id;
        Caddie._courseState.currentHole = this.currentRoundHole;
        Caddie._courseState.viewMode = 'builder';
        App.navigate('caddie');
        Caddie.currentTool = 'course-strategy';
        document.querySelectorAll('.caddie-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.caddie === 'course-strategy'));
        Caddie.render('course-strategy');
    },

    renderOnCourseGps(hole) {
        const targets = this.getGpsDistances(hole);
        const displayDistance = value => Caddie.displayDistanceValue?.(value) ?? Math.round(Number(value));
        const unit = Caddie.getDistanceUnit?.() === 'meters' ? 'm' : 'yd';
        const hasGreen = Boolean(targets.green);
        const accuracy = Number(this.gpsPosition?.accuracy);
        const ageSeconds = this.gpsPosition?.timestamp ? Math.max(0, Math.round((Date.now() - this.gpsPosition.timestamp) / 1000)) : null;
        const status = this.gpsError || (this.gpsPosition ? `GPS accuracy ±${Math.round(accuracy || 0)} m${ageSeconds !== null ? ` · ${ageSeconds}s ago` : ''}` : hasGreen ? 'A green target is ready. Start GPS for your live distance.' : 'No green coordinate is saved for this hole. Add one in Course Strategy → Edit.');
        const hazardHtml = targets.hazards.length ? `<div class="gps-hazard-list">${targets.hazards.map(hazard => `<span>${hazard.type === 'water' ? 'Water' : 'Bunker'} <strong>${displayDistance(hazard.yards)} ${unit}</strong></span>`).join('')}</div>` : '';
        const targetLabels = { front: 'Front', center: 'Center', back: 'Back', pin: 'Pin' };
        const availableTargets = [['front', targets.greenFront], ['center', targets.greenCenter], ['back', targets.greenBack], ['pin', targets.pin]].filter(([, point]) => point);
        const targetSelector = availableTargets.length > 1 ? `<label class="gps-target-select">Green target<select class="form-select" onchange="Scoring.setGpsTargetPreference(this.value)">${availableTargets.map(([key]) => `<option value="${key}" ${targets.greenTargetKey === key ? 'selected' : ''}>${targetLabels[key]}</option>`).join('')}</select></label>` : '';
        const greenStrip = targets.greenDistances ? `<div class="gps-green-strip">${['front', 'center', 'back', 'pin'].filter(key => Number.isFinite(targets.greenDistances[key])).map(key => `<button type="button" class="${targets.greenTargetKey === key ? 'active' : ''}" onclick="Scoring.setGpsTargetPreference('${key}')"><span>${targetLabels[key]}</span><strong>${displayDistance(targets.greenDistances[key])}</strong><small>${unit}</small></button>`).join('')}</div>` : '';
        return `<section class="on-course-gps ${this.gpsTracking ? 'is-tracking' : ''}" id="onCourseGps" aria-live="polite">
            <div class="gps-heading"><div><span class="eyebrow">Live position</span><h3>GPS Caddie</h3></div><button type="button" class="btn btn-sm ${this.gpsTracking ? 'btn-outline' : 'btn-primary'}" onclick="Scoring.${this.gpsTracking ? 'stopGpsTracking()' : 'startGpsTracking()'}">${this.gpsTracking ? 'Stop GPS' : 'Start GPS'}</button></div>
            <div class="gps-distance-grid">
                <div class="gps-primary-distance"><span>To ${String(targetLabels[targets.greenTargetKey] || 'green').toLowerCase()}</span><strong>${Number.isFinite(targets.greenYards) ? displayDistance(targets.greenYards) : '—'}</strong><small>${unit} · ${esc(targets.source || 'target needed')}</small></div>
                ${Number.isFinite(targets.teeYards) ? `<div><span>From saved tee</span><strong>${displayDistance(targets.teeYards)} ${unit}</strong></div>` : ''}
                <div><span>Position quality</span><strong>${this.gpsPosition ? (accuracy <= 15 ? 'Excellent' : accuracy <= 40 ? 'Good' : 'Approximate') : 'Waiting'}</strong></div>
            </div>
            ${greenStrip}
            ${hazardHtml}
            <div class="gps-target-tools">${targetSelector}<div><button type="button" class="btn btn-sm btn-outline" onclick="Scoring.captureRoundPin()" ${!this.gpsPosition ? 'disabled' : ''}>Set pin here</button>${targets.pin ? '<button type="button" class="btn btn-sm btn-ghost" onclick="Scoring.clearRoundPin()">Clear pin</button>' : ''}</div></div>
            <div class="gps-footer"><span>${esc(status)}</span>${Number.isFinite(targets.greenYards) ? '<button type="button" class="btn btn-sm btn-outline" onclick="Scoring.useGpsGreenDistance()">Use selected distance</button>' : ''}</div>
            ${this.renderGpsShotTracker(hole)}
        </section>`;
    },

    setGpsTargetPreference(target) {
        if (!['front', 'center', 'back', 'pin'].includes(target)) return;
        this.gpsTargetPreference = target;
        this.holeWindAnalysis = null;
        this.refreshGpsCard();
        this.autoAlignHoleWind();
    },

    captureRoundPin() {
        const point = this.normalizeGpsPoint(this.gpsPosition);
        if (!point) return;
        const age = this.gpsPosition?.timestamp ? Date.now() - this.gpsPosition.timestamp : Infinity;
        const accuracy = Number(this.gpsPosition?.accuracy);
        if (age > 30000 || !Number.isFinite(accuracy) || accuracy > 30) {
            this.gpsShotNotice = 'Wait for a recent GPS position with ±30 yards accuracy or better before setting the pin.';
            this.refreshGpsCard();
            return;
        }
        this.roundPins[this.currentRoundHole] = point;
        this.gpsTargetPreference = 'pin';
        this.gpsShotNotice = 'Temporary pin saved for this round.';
        this.markRoundDirty();
        this.autosaveActiveRound();
        this.refreshGpsCard();
    },

    clearRoundPin() {
        delete this.roundPins[this.currentRoundHole];
        if (this.gpsTargetPreference === 'pin') this.gpsTargetPreference = 'center';
        this.markRoundDirty();
        this.autosaveActiveRound();
        this.refreshGpsCard();
    },

    renderGpsShotTracker(hole) {
        const active = this.activeGpsShot;
        const notice = this.gpsShotNotice ? `<p class="gps-shot-notice">${esc(this.gpsShotNotice)}</p>` : '';
        if (active) {
            const liveDistance = this.distanceBetweenYards(active.start, this.gpsPosition);
            const player = this.players.find(item => item.id === active.playerId);
            const combinedAccuracy = Math.hypot(active.startAccuracy || 0, Number(this.gpsPosition?.accuracy) || 0);
            return `<div class="gps-shot-tracker is-active">
                <div class="gps-shot-title"><div><span class="eyebrow">Shot in progress</span><strong>${esc(active.club)} · ${esc(player?.name || 'Player')}</strong></div><span class="gps-shot-distance">${Number.isFinite(liveDistance) ? Math.round(liveDistance) : 0} yd</span></div>
                <div class="gps-measure-confidence"><span>Estimated measurement uncertainty</span><strong>±${Math.round(combinedAccuracy)} yd</strong></div>
                <div class="gps-shot-finish-grid">
                    <label>Carry yards <small>Optional—enter only if known</small><input class="form-input" id="gpsShotCarry" type="number" min="1" max="400" placeholder="Leave blank for total only"></label>
                    <label>Result<select class="form-select" id="gpsShotOutcome"><option value="fairway">Fairway</option><option value="green">Green</option><option value="rough">Rough</option><option value="bunker">Bunker</option><option value="water">Water / penalty</option><option value="other">Other</option></select></label>
                    <label>Strike<select class="form-select" id="gpsShotQuality"><option value="normal">Normal</option><option value="solid">Solid</option><option value="mishit">Mishit</option></select></label>
                </div>
                <div class="gps-shot-actions"><button type="button" class="btn btn-primary" onclick="Scoring.finishGpsShot()">■ End & save shot</button><button type="button" class="btn btn-outline" onclick="Scoring.cancelGpsShot()">Cancel</button></div>
                <small>Walk or ride to the ball, then end the shot. Straight-line distance and left/right dispersion are calculated automatically.</small>${notice}
            </div>`;
        }
        const clubOptions = (GolfData.clubs || []).filter(club => club.type !== 'putter')
            .map(club => `<option value="${esc(club.name)}">${esc(club.name)}</option>`).join('');
        const playerOptions = this.players.map(player => `<option value="${player.id}">${esc(player.name)}</option>`).join('');
        const shotCount = this.players.reduce((sum, player) => sum + (this.roundShots[player.id]?.[hole.hole]?.length || 0), 0);
        return `<div class="gps-shot-tracker">
            <div class="gps-shot-title"><div><span class="eyebrow">Automatic measurement</span><strong>Track this shot</strong></div><span>${shotCount} saved on hole</span></div>
            <div class="gps-shot-start-grid">
                <label>Player<select class="form-select" id="gpsShotPlayer">${playerOptions}</select></label>
                <label>Club<select class="form-select" id="gpsShotClub">${clubOptions}</select></label>
                <label>Starting lie<select class="form-select" id="gpsShotLie"><option value="tee">Tee</option><option value="fairway">Fairway</option><option value="rough">Rough</option></select></label>
                <button type="button" class="btn btn-accent" onclick="Scoring.beginGpsShot()" ${!clubOptions ? 'disabled' : ''}>▶ Start shot</button>
            </div>
            <small>GPS must be running with a recent position. GPS supplies total distance; My Bag carry learning changes only when you later enter a known carry.</small>${notice}
        </div>`;
    },

    beginGpsShot() {
        const age = this.gpsPosition?.timestamp ? Date.now() - this.gpsPosition.timestamp : Infinity;
        if (!this.gpsTracking || !this.normalizeGpsPoint(this.gpsPosition) || age > 30000) {
            this.gpsShotNotice = 'Start GPS and wait for a current position before beginning the shot.';
            this.refreshGpsCard();
            return false;
        }
        const playerId = Number(document.getElementById('gpsShotPlayer')?.value);
        const club = document.getElementById('gpsShotClub')?.value;
        const lie = document.getElementById('gpsShotLie')?.value;
        if (!this.players.some(player => player.id === playerId) || !(GolfData.clubs || []).some(item => item.name === club && item.type !== 'putter') || !['tee', 'fairway', 'rough'].includes(lie)) return false;
        this.activeGpsShot = {
            id: `gpsshot-${Date.now()}`,
            playerId,
            hole: this.currentRoundHole,
            club,
            lie,
            start: { lat: this.gpsPosition.lat, lon: this.gpsPosition.lon },
            startAccuracy: Number(this.gpsPosition.accuracy) || 999,
            startedAt: Date.now()
        };
        this.gpsShotNotice = '';
        this.refreshGpsCard();
        return true;
    },

    calculateGpsOffline(start, end, target) {
        const a = this.normalizeGpsPoint(start), b = this.normalizeGpsPoint(end), t = this.normalizeGpsPoint(target);
        if (!a || !b || !t) return 0;
        const latScale = 111320;
        const lonScale = latScale * Math.cos(a.lat * Math.PI / 180);
        const tx = (t.lon - a.lon) * lonScale, ty = (t.lat - a.lat) * latScale;
        const ex = (b.lon - a.lon) * lonScale, ey = (b.lat - a.lat) * latScale;
        const targetLength = Math.hypot(tx, ty);
        if (targetLength < 1) return 0;
        return ((ex * ty - ey * tx) / targetLength) * 1.0936133;
    },

    finishGpsShot() {
        const active = this.activeGpsShot;
        const end = this.normalizeGpsPoint(this.gpsPosition);
        if (!active || !end) return false;
        const age = this.gpsPosition?.timestamp ? Date.now() - this.gpsPosition.timestamp : Infinity;
        if (age > 30000) {
            this.gpsShotNotice = 'Waiting for a newer GPS position before saving the shot.';
            this.refreshGpsCard();
            return false;
        }
        const distance = this.distanceBetweenYards(active.start, end);
        if (!Number.isFinite(distance) || distance < 1 || distance > 450) {
            this.gpsShotNotice = distance > 450 ? 'This measurement is over 450 yards and was not saved.' : 'Move at least one yard before ending the shot.';
            this.refreshGpsCard();
            return false;
        }
        const hole = this.getCourseHoles().find(item => item.hole === active.hole);
        const target = this.getHoleGpsTargets(hole).green;
        const combinedAccuracy = Math.hypot(active.startAccuracy, Number(this.gpsPosition.accuracy) || 999);
        const quality = document.getElementById('gpsShotQuality')?.value || 'normal';
        const outcome = document.getElementById('gpsShotOutcome')?.value || 'other';
        const carryRaw = document.getElementById('gpsShotCarry')?.value;
        const enteredCarry = carryRaw === '' || carryRaw === undefined ? null : Number(carryRaw);
        if (enteredCarry !== null && (!Number.isFinite(enteredCarry) || enteredCarry < 1 || enteredCarry > Math.min(400, distance))) {
            this.gpsShotNotice = 'Carry must be between 1 yard and the measured total distance.';
            this.refreshGpsCard();
            return false;
        }
        const candidate = this.normalizeRoundShot({
            club: active.club,
            carry: enteredCarry,
            total: distance,
            offline: Math.max(-100, Math.min(100, this.calculateGpsOffline(active.start, end, target))),
            lie: active.lie,
            quality,
            outcome,
            measuredBy: 'gps',
            gpsAccuracy: combinedAccuracy,
            start: active.start,
            end
        });
        if (!candidate) {
            this.gpsShotNotice = 'The GPS measurement could not be saved.';
            this.refreshGpsCard();
            return false;
        }
        const learningEligible = combinedAccuracy <= 20 && quality !== 'mishit' && distance >= 10 && Number.isFinite(enteredCarry);
        this.recordRoundShot(candidate, active.playerId, active.hole, learningEligible);
        this.activeGpsShot = null;
        this.gpsShotNotice = `${candidate.club}: ${candidate.total} total yards saved${active.playerId === 0 && learningEligible ? ' and confirmed carry added to My Bag learning' : enteredCarry === null ? ' (total only; carry learning unchanged)' : combinedAccuracy > 20 ? ' (GPS uncertainty too high for learning)' : ''}.`;
        this.refreshGpsCard();
        return true;
    },

    cancelGpsShot() {
        this.activeGpsShot = null;
        this.gpsShotNotice = 'Shot measurement canceled.';
        this.refreshGpsCard();
    },

    refreshGpsCard() {
        const card = document.getElementById('onCourseGps');
        const hole = this.getCourseHoles().find(item => item.hole === this.currentRoundHole);
        if (card && hole) card.outerHTML = this.renderOnCourseGps(hole);
        if (hole && typeof Caddie !== 'undefined' && typeof Caddie.updateAerialMapLive === 'function') Caddie.updateAerialMapLive(this.getOnCourseMapContext(hole));
        this.refreshShotDecision();
    },

    acceptGpsPosition(position) {
        const next = { lat: Number(position?.coords?.latitude), lon: Number(position?.coords?.longitude), accuracy: Number(position?.coords?.accuracy) * 1.0936133, timestamp: Number(position?.timestamp) || Date.now() };
        if (!this.normalizeGpsPoint(next) || !Number.isFinite(next.accuracy) || next.accuracy > 120) {
            this.gpsRejectedUpdates += 1;
            this.gpsError = 'Waiting for a more accurate GPS reading.';
            return false;
        }
        if (this.gpsPosition?.timestamp && next.timestamp > this.gpsPosition.timestamp) {
            const seconds = (next.timestamp - this.gpsPosition.timestamp) / 1000;
            const yards = this.distanceBetweenYards(this.gpsPosition, next);
            const speedMph = Number.isFinite(yards) && seconds > 0 ? yards / seconds * 2.04545 : 0;
            if (seconds < 30 && speedMph > 65 && Number(next.accuracy) >= Number(this.gpsPosition.accuracy || 0)) {
                this.gpsRejectedUpdates += 1;
                this.gpsError = 'An implausible GPS jump was ignored.';
                return false;
            }
        }
        this.gpsPosition = next;
        this.gpsRejectedUpdates = 0;
        this.gpsError = '';
        return true;
    },

    startGpsTracking() {
        if (!navigator.geolocation) { this.gpsError = 'GPS is unavailable on this device.'; this.refreshGpsCard(); return; }
        if (this.gpsTracking) return;
        this.gpsTracking = true;
        this.gpsError = 'Requesting a high-accuracy position…';
        this.refreshGpsCard();
        this.gpsWatchId = navigator.geolocation.watchPosition(position => {
            this.acceptGpsPosition(position);
            this.refreshGpsCard();
        }, error => {
            const messages = { 1: 'Location permission was denied.', 2: 'A GPS position is currently unavailable.', 3: 'GPS timed out. Move to an open area and retry.' };
            this.gpsError = messages[error?.code] || 'GPS could not determine your position.';
            this.stopGpsTracking(false);
            this.refreshGpsCard();
        }, this.getGpsOptions());
    },

    stopGpsTracking(refresh = true) {
        if (this.gpsWatchId !== null && navigator.geolocation?.clearWatch) navigator.geolocation.clearWatch(this.gpsWatchId);
        this.gpsWatchId = null;
        this.gpsTracking = false;
        if (refresh) this.refreshGpsCard();
    },

    useGpsGreenDistance() {
        const hole = this.getCourseHoles().find(item => item.hole === this.currentRoundHole);
        const yards = this.getGpsDistances(hole).greenYards;
        if (!Number.isFinite(yards)) return;
        const rounded = Math.max(1, Math.min(600, Math.round(yards)));
        Caddie.conditions.distance = rounded;
        Caddie.saveConditions();
        const input = document.getElementById('onCourseDistance');
        if (input) input.value = Caddie.displayDistanceValue?.(rounded) ?? rounded;
        const result = document.getElementById('onCourseClubResult');
        if (result) result.textContent = `${Caddie.formatDistance?.(rounded) || rounded + ' yards'} loaded from GPS. Request a club when ready.`;
    },

    renderOnCourseStrategy(hole) {
        const safeWord = (value, fallback) => /^[a-z0-9-]+$/i.test(String(value || '')) ? String(value) : fallback;
        const safeHole = {
            ...hole,
            hole: Number(hole.hole) || 1,
            par: Number(hole.par) || 4,
            yards: Number(hole.yards) || 0,
            type: esc(hole.type || 'Course hole'),
            tip: esc(hole.tip || 'Detailed strategy is not available for this hole. Favor the widest target and plan for your safest miss.'),
            fairwayShape: safeWord(hole.fairwayShape, 'straight'),
            elevation: safeWord(hole.elevation, 'flat'),
            greenShape: safeWord(hole.greenShape, 'oval'),
            greenSlope: safeWord(hole.greenSlope, 'varies'),
            hazards: (Array.isArray(hole.hazards) ? hole.hazards : []).slice(0, 12).map(hazard => ({
                type: safeWord(hazard?.type, 'hazard'), pos: safeWord(hazard?.pos, 'center')
            })),
            teeElevationFeet: Number.isFinite(Number(hole.teeElevationFeet)) ? Number(hole.teeElevationFeet) : null,
            greenElevationFeet: Number.isFinite(Number(hole.greenElevationFeet)) ? Number(hole.greenElevationFeet) : null,
            elevationChangeFeet: Number.isFinite(Number(hole.elevationChangeFeet)) ? Number(hole.elevationChangeFeet) : null,
            coordinates: hole.coordinates,
            mapGeometry: hole.mapGeometry
        };
        return Caddie.renderHoleDiagram(safeHole, { afterGreenHtml: this.renderOnCourseWeather(), mapContext: this.getOnCourseMapContext(hole) });
    },

    renderOnCourseWeather() {
        const direction = Caddie.conditions?.windDirection || 'none';
        const options = [
            ['none', 'Set effect relative to target'],
            ['head', 'Headwind'],
            ['tail', 'Tailwind'],
            ['cross-l', 'Crosswind L→R'],
            ['cross-r', 'Crosswind R→L']
        ].map(([value, label]) => `<option value="${value}" ${direction === value ? 'selected' : ''}>${label}</option>`).join('');
        return `<section class="hole-info-section on-course-weather" id="onCourseWeather" aria-live="polite">
            <div class="weather-live-heading">
                <h4>Weather Conditions</h4>
                <button type="button" class="weather-refresh" onclick="Scoring.fetchOnCourseWeather(true)" aria-label="Refresh weather">↻ Refresh</button>
            </div>
            <div class="weather-status"><span class="weather-status-dot"></span><span>Loading current conditions…</span></div>
            <div class="weather-readings" hidden></div>
            <div class="hole-wind-analysis" id="holeWindAnalysis">${this.renderHoleWindAnalysis()}</div>
            <label class="weather-relative-label">Wind effect for this shot
                <select class="form-select" id="weatherRelativeDirection" onchange="Scoring.setWeatherWindDirection(this.value)">${options}</select>
            </label>
            <p class="weather-note">Open-Meteo course-coordinate conditions · ${this.getWeatherRefreshMs() / 60000}-minute automatic refresh${this.isBatteryMode() ? ' in Battery mode' : ''}. Use the shot control above when wind at the ball differs from the reported course conditions.</p>
        </section>`;
    },

    isBatteryMode() {
        return typeof document !== 'undefined' && document.documentElement?.getAttribute('data-field-mode') === 'battery';
    },

    getWeatherRefreshMs() {
        return this.isBatteryMode() ? 15 * 60 * 1000 : this.weatherRefreshMs;
    },

    getGpsOptions() {
        return this.isBatteryMode()
            ? { enableHighAccuracy: false, timeout: 20000, maximumAge: 30000 }
            : { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 };
    },

    bindOnCourseWeather() {
        if (!document.getElementById('onCourseWeather')) return;
        this.stopWeatherRefresh();
        const force = this.weatherForceNext;
        this.weatherForceNext = false;
        this.fetchOnCourseWeather(force);
        this.weatherTimer = setInterval(() => this.fetchOnCourseWeather(true), this.getWeatherRefreshMs());
        this.weatherResumeHandler = () => {
            if (this.currentTool !== 'on-course' || document.visibilityState === 'hidden') return;
            const cached = this.getCachedWeather();
            if (!cached || Date.now() - cached.fetchedAt >= this.weatherForegroundMinMs) this.fetchOnCourseWeather(true);
        };
        window.addEventListener('focus', this.weatherResumeHandler);
        document.addEventListener('visibilitychange', this.weatherResumeHandler);
    },

    stopWeatherRefresh() {
        if (this.weatherTimer) clearInterval(this.weatherTimer);
        this.weatherTimer = null;
        if (this.weatherResumeHandler) {
            window.removeEventListener('focus', this.weatherResumeHandler);
            document.removeEventListener('visibilitychange', this.weatherResumeHandler);
        }
        this.weatherResumeHandler = null;
    },

    getWeatherCourseKey() {
        const lat = Number(this.course?.lat);
        const lon = Number(this.course?.lon);
        return Number.isFinite(lat) && Number.isFinite(lon) ? `${this.course?.id || this.course?.name || 'course'}:${lat.toFixed(4)},${lon.toFixed(4)}` : '';
    },

    getCachedWeather() {
        try {
            const cached = JSON.parse(sessionStorage.getItem('coursecompass-on-course-weather') || 'null');
            return cached?.courseKey === this.getWeatherCourseKey() ? cached : null;
        } catch (_) { return null; }
    },

    cacheWeather(weather) {
        try { sessionStorage.setItem('coursecompass-on-course-weather', JSON.stringify(weather)); } catch (_) { /* storage may be unavailable */ }
    },

    degreesToCompass(degrees) {
        const points = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const normalized = ((Number(degrees) % 360) + 360) % 360;
        return points[Math.round(normalized / 22.5) % 16];
    },

    bearingBetweenPoints(start, end) {
        const a = this.normalizeGpsPoint(start), b = this.normalizeGpsPoint(end);
        if (!a || !b) return null;
        const toRad = value => value * Math.PI / 180;
        const toDeg = value => value * 180 / Math.PI;
        const lat1 = toRad(a.lat), lat2 = toRad(b.lat), deltaLon = toRad(b.lon - a.lon);
        const y = Math.sin(deltaLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
        return (toDeg(Math.atan2(y, x)) + 360) % 360;
    },

    analyzeHoleWind(hole, windSpeed, windFromDegrees) {
        const targets = this.getHoleGpsTargets(hole);
        const freshGps = this.gpsPosition?.timestamp && Date.now() - this.gpsPosition.timestamp <= 30000 ? this.normalizeGpsPoint(this.gpsPosition) : null;
        const start = freshGps || targets.tee;
        const bearing = this.bearingBetweenPoints(start, targets.green);
        const speed = Math.max(0, Number(windSpeed) || 0);
        const windFrom = ((Number(windFromDegrees) % 360) + 360) % 360;
        if (!Number.isFinite(bearing) || !Number.isFinite(windFromDegrees) || speed < 1) return null;
        const delta = ((windFrom - bearing + 540) % 360) - 180;
        const radians = delta * Math.PI / 180;
        const headComponent = speed * Math.cos(radians);
        const crossComponent = speed * Math.sin(radians);
        let direction;
        let effectiveSpeed;
        if (Math.abs(headComponent) >= Math.abs(crossComponent)) {
            direction = headComponent >= 0 ? 'head' : 'tail';
            effectiveSpeed = Math.abs(headComponent);
        } else {
            direction = crossComponent < 0 ? 'cross-l' : 'cross-r';
            effectiveSpeed = Math.abs(crossComponent);
        }
        const source = freshGps ? 'Live position → green' : 'Tee → green';
        const confidence = freshGps && Number(this.gpsPosition.accuracy) <= 20 ? 'High' : targets.source === 'Manual target' ? 'Good' : 'Estimated';
        return {
            hole: Number(hole?.hole),
            direction,
            effectiveSpeed: Math.max(1, Math.round(effectiveSpeed)),
            actualSpeed: Math.round(speed),
            windFrom: Math.round(windFrom),
            bearing: Math.round(bearing),
            headComponent: Math.round(headComponent),
            crossComponent: Math.round(crossComponent),
            source,
            confidence
        };
    },

    applyHoleAwareWind(reading, source = 'Forecast') {
        if (!reading || typeof Caddie === 'undefined') return null;
        const hole = this.getCourseHoles().find(item => item.hole === this.currentRoundHole);
        const analysis = this.analyzeHoleWind(hole, reading.windSpeed, reading.windDirection);
        if (!analysis) {
            Caddie.conditions.windSpeed = Math.max(0, Math.min(80, Math.round(Number(reading.windSpeed) || 0)));
            this.holeWindAnalysis = null;
        } else {
            this.holeWindAnalysis = { ...analysis, weatherSource: source, manual: false };
            Caddie.conditions.windSpeed = analysis.effectiveSpeed;
            Caddie.conditions.windDirection = analysis.direction;
            if (['cross-l', 'cross-r'].includes(analysis.direction)) Caddie.conditions.crosswindDirection = analysis.direction;
        }
        Caddie.saveConditions();
        this.updateConditionsLine();
        this.refreshHoleWindView();
        return analysis;
    },

    renderHoleWindAnalysis() {
        const analysis = this.holeWindAnalysis;
        if (!analysis || analysis.hole !== Number(this.currentRoundHole)) return '<span>Save tee/green targets to automatically align wind with this hole.</span>';
        if (analysis.manual) return `<div><strong>Manual wind effect</strong><small>${esc(analysis.label)} selected for this shot.</small></div><button type="button" class="btn btn-sm btn-outline" onclick="Scoring.autoAlignHoleWind()">Auto-align</button>`;
        const labels = { head: 'Headwind', tail: 'Tailwind', 'cross-l': 'Left → right crosswind', 'cross-r': 'Right → left crosswind' };
        const aim = analysis.direction === 'cross-l' ? ' · aim left' : analysis.direction === 'cross-r' ? ' · aim right' : '';
        return `<div><span class="source-badge">${esc(analysis.weatherSource)} · ${esc(analysis.confidence)} confidence</span><strong>${analysis.effectiveSpeed} mph ${labels[analysis.direction]}${aim}</strong><small>${esc(analysis.source)} bearing ${analysis.bearing}° · wind from ${this.degreesToCompass(analysis.windFrom)} · actual ${analysis.actualSpeed} mph</small></div><button type="button" class="btn btn-sm btn-outline" onclick="Scoring.autoAlignHoleWind()">Recalculate</button>`;
    },

    refreshHoleWindView() {
        const view = document.getElementById('holeWindAnalysis');
        if (view) view.innerHTML = this.renderHoleWindAnalysis();
        const select = document.getElementById('weatherRelativeDirection');
        if (select && Caddie.conditions?.windDirection) select.value = Caddie.conditions.windDirection;
    },

    autoAlignHoleWind() {
        const weather = this.getCachedWeather();
        if (weather?.current) this.applyHoleAwareWind(weather.current, 'Course weather');
    },

    weatherCodeLabel(code) {
        const value = Number(code);
        if (value === 0) return ['CLR', 'Clear'];
        if ([1, 2].includes(value)) return ['PCL', 'Partly cloudy'];
        if (value === 3) return ['OVC', 'Overcast'];
        if ([45, 48].includes(value)) return ['FOG', 'Fog'];
        if (value >= 51 && value <= 67) return ['RAIN', 'Rain or drizzle'];
        if (value >= 71 && value <= 77) return ['SNOW', 'Snow'];
        if (value >= 80 && value <= 82) return ['RAIN', 'Rain showers'];
        if (value >= 85 && value <= 86) return ['SNOW', 'Snow showers'];
        if (value >= 95) return ['TSTM', 'Thunderstorms'];
        return ['WX', 'Current conditions'];
    },

    normalizeWeatherResponse(payload) {
        const current = payload?.current || {};
        const required = ['temperature_2m', 'wind_speed_10m', 'wind_direction_10m'];
        if (!required.every(key => Number.isFinite(Number(current[key])))) throw new Error('Weather data is incomplete.');
        return {
            temperature: Number(current.temperature_2m),
            feelsLike: Number(current.apparent_temperature),
            humidity: Number(current.relative_humidity_2m),
            precipitation: Number(current.precipitation),
            cloudCover: Number(current.cloud_cover),
            windSpeed: Number(current.wind_speed_10m),
            windDirection: Number(current.wind_direction_10m),
            windGusts: Number(current.wind_gusts_10m),
            weatherCode: Number(current.weather_code),
            observedAt: current.time || new Date().toISOString(),
            timezone: payload?.timezone_abbreviation || payload?.timezone || ''
        };
    },

    async fetchOnCourseWeather(force = false) {
        const card = document.getElementById('onCourseWeather');
        const lat = Number(this.course?.lat);
        const lon = Number(this.course?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            if (card) this.updateWeatherView(null, 'Add course coordinates to enable current weather for this course.');
            return null;
        }
        const cached = this.getCachedWeather();
        if (cached && card) this.updateWeatherView(cached);
        if (!force && cached && Date.now() - cached.fetchedAt < this.getWeatherRefreshMs()) {
            return cached;
        }
        if (this.weatherRequest) return this.weatherRequest;
        const status = card?.querySelector('.weather-status span:last-child');
        if (status) status.textContent = cached ? 'Checking for a newer reading…' : 'Loading current conditions…';
        const fields = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m';
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=${fields}&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto`;
        this.weatherRequest = (async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 12000);
                const response = await fetch(url, { signal: controller.signal });
                clearTimeout(timeout);
                if (!response.ok) throw new Error(`Weather service returned ${response.status}.`);
                const current = this.normalizeWeatherResponse(await response.json());
                const weather = { courseKey: this.getWeatherCourseKey(), fetchedAt: Date.now(), current };
                this.cacheWeather(weather);
                this.applyWeatherToShotPlan(current);
                if (card) this.updateWeatherView(weather);
                return weather;
            } catch (_) {
                if (card) this.updateWeatherView(cached, cached ? 'Live refresh failed; showing the most recent saved reading.' : 'Current weather is temporarily unavailable. Check your connection and try again.');
                return cached || null;
            } finally { this.weatherRequest = null; }
        })();
        return this.weatherRequest;
    },

    applyWeatherToShotPlan(current) {
        if (!current || typeof Caddie === 'undefined') return;
        Caddie.conditions.temperature = Math.max(-40, Math.min(140, Math.round(current.temperature)));
        this.applyHoleAwareWind(current, 'Course weather');
    },

    setWeatherWindDirection(direction) {
        if (!['none', 'head', 'tail', 'cross-l', 'cross-r'].includes(direction)) return;
        Caddie.conditions.windDirection = direction;
        const labels = { none: 'No relative wind', head: 'Headwind', tail: 'Tailwind', 'cross-l': 'Left → right crosswind', 'cross-r': 'Right → left crosswind' };
        this.holeWindAnalysis = { hole: Number(this.currentRoundHole), manual: true, label: labels[direction] };
        Caddie.saveConditions();
        this.updateConditionsLine();
        this.refreshHoleWindView();
    },

    updateConditionsLine() {
        const line = document.querySelector('.shot-plan-card .conditions-line');
        if (!line) return;
        const conditions = Caddie.conditions || {};
        const labels = { none: 'No relative wind selected', head: 'Headwind', tail: 'Tailwind', 'cross-l': 'Crosswind L→R', 'cross-r': 'Crosswind R→L' };
        line.textContent = `${Number(conditions.windSpeed) || 0} mph ${labels[conditions.windDirection] || labels.none} · ${Number(conditions.temperature) || 72}°F · ${Number(conditions.altitude) || 0} ft altitude`;
    },

    updateWeatherView(weather, message = '') {
        const card = document.getElementById('onCourseWeather');
        if (!card) return;
        const status = card.querySelector('.weather-status');
        const readings = card.querySelector('.weather-readings');
        if (!weather?.current) {
            if (status) status.innerHTML = `<span class="weather-status-dot is-error"></span><span>${esc(message || 'Weather unavailable.')}</span>`;
            if (readings) readings.hidden = true;
            return;
        }
        const current = weather.current;
        if (!this.holeWindAnalysis || this.holeWindAnalysis.hole !== Number(this.currentRoundHole)) this.applyHoleAwareWind(current, 'Course weather');
        const [, label] = this.weatherCodeLabel(current.weatherCode);
        const ageMinutes = Math.max(0, Math.round((Date.now() - weather.fetchedAt) / 60000));
        const timeLabel = current.observedAt ? String(current.observedAt).replace('T', ' ') : 'recent';
        if (status) status.innerHTML = `<span class="weather-status-dot ${message ? 'is-stale' : ''}"></span><span>${esc(message || `Updated ${ageMinutes < 1 ? 'just now' : `${ageMinutes} min ago`} · ${timeLabel} ${current.timezone || ''}`)}</span>`;
        if (readings) {
            readings.hidden = false;
            readings.innerHTML = `<div class="weather-condition"><strong>${label}</strong><small>${Math.round(current.temperature)}°F · feels ${Math.round(current.feelsLike)}°</small></div>
                <div class="weather-wind"><span>Wind</span><strong>${Math.round(current.windSpeed)} mph</strong><small>From ${this.degreesToCompass(current.windDirection)} (${Math.round(current.windDirection)}°) · gusts ${Math.round(current.windGusts)} mph</small></div>
                <div><span>Humidity</span><strong>${Math.round(current.humidity)}%</strong></div>
                <div><span>Precipitation</span><strong>${Number(current.precipitation).toFixed(2)} in</strong></div>`;
        }
    },

    setOnCourseScore(playerId, hole, value, par) {
        if (typeof CourseCompassSync !== 'undefined' && CourseCompassSync.isHoleLocked?.(hole)) return;
        this.updateScore(playerId, hole, value, par);
        navigator.vibrate?.(18);
        this.render('on-course');
    },

    goToOnCourseHole(value) {
        if (this.activeGpsShot) {
            this.gpsShotNotice = 'End or cancel the active GPS shot before changing holes.';
            this.refreshGpsCard();
            return;
        }
        const hole = Number(value);
        const target = this.getCourseHoles().find(item => item.hole === hole);
        if (target) {
            this.mapTarget = null;
            this.currentRoundHole = hole;
            Caddie.conditions.distance = target.yards || '';
            Caddie.conditions.elevation = Number.isFinite(Number(target.elevationChangeFeet)) ? Math.max(-200, Math.min(200, Math.round(Number(target.elevationChangeFeet)))) : 0;
            Caddie.saveConditions();
            this.autosaveActiveRound();
            this.weatherForceNext = true;
            this.holeWindAnalysis = null;
        }
        this.render('on-course');
    },

    moveOnCourseHole(direction) {
        if (this.activeGpsShot) {
            this.gpsShotNotice = 'End or cancel the active GPS shot before changing holes.';
            this.refreshGpsCard();
            return;
        }
        const holes = this.getCourseHoles();
        const index = holes.findIndex(hole => hole.hole === this.currentRoundHole);
        const next = holes[Math.max(0, Math.min(holes.length - 1, index + Number(direction)))];
        if (next) {
            this.mapTarget = null;
            this.currentRoundHole = next.hole;
            Caddie.conditions.distance = next.yards || '';
            Caddie.conditions.elevation = Number.isFinite(Number(next.elevationChangeFeet)) ? Math.max(-200, Math.min(200, Math.round(Number(next.elevationChangeFeet)))) : 0;
            Caddie.saveConditions();
            this.autosaveActiveRound();
            this.weatherForceNext = true;
            this.holeWindAnalysis = null;
        }
        this.render('on-course');
    },

    calculateOnCourseClub() {
        const displayedDistance = Number(document.getElementById('onCourseDistance')?.value);
        const distance = Caddie.inputDistanceToYards?.(displayedDistance) ?? displayedDistance;
        const result = document.getElementById('onCourseClubResult');
        if (!result || !Number.isFinite(distance) || distance < 1) { if (result) result.textContent = 'Enter a valid target distance.'; return; }
        Caddie.conditions.distance = distance;
        Caddie.saveConditions();
        const plan = Caddie.calculateShotPlan({ distance });
        const skill = globalThis.CourseCompassStore?.experienceProfile?.skill || 'intermediate';
        const bag = Caddie.getActiveBag(skill, 'neutral');
        const choices = Object.entries(bag.clubs || {}).filter(([, values]) => values.enabled !== false && Number(values.carry) > 0)
            .map(([name, values]) => ({ name, carry: Number(values.carry), dispersion: Number(values.dispersion) || 0, gap: Math.abs(Number(values.carry) - plan.effectiveDistance) }))
            .sort((a, b) => a.gap - b.gap || a.dispersion - b.dispersion);
        const best = choices[0];
        if (!best) { result.textContent = 'Set up My Bag before requesting an on-course club.'; return; }
        const formatDistance = value => Caddie.formatDistance?.(value) || `${Math.round(value)} yd`;
        const aim = plan.drift ? ` · Aim ${formatDistance(plan.drift)} ${plan.aimDirection}` : '';
        result.innerHTML = `<strong>${esc(best.name)}</strong><span>${formatDistance(distance)} actual · ${formatDistance(plan.effectiveDistance)} plays like · ${formatDistance(best.carry)} carry${aim}</span>`;
    },

    /* ── Scorecard ──────────────────────────────────────── */
    getCourseHoles(course = this.course) {
        return [...(course?.holes || [])].sort((a, b) => a.hole - b.hole);
    },

    getScorecardCourses() {
        return GolfData.allCourses.filter(course => Array.isArray(course.holes) && course.holes.length > 0);
    },

    preRoundPlanDate(date = new Date()) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },

    getPreRoundPlans() {
        const plans = globalThis.CourseCompassStore?.getJSON?.(CourseCompassStore.keys.preRoundPlans, []);
        if (!Array.isArray(plans)) return [];
        return plans.filter(plan => plan && typeof plan.id === 'string' && typeof plan.courseId === 'string' && typeof plan.playerName === 'string' && Array.isArray(plan.tasks))
            .map(plan => ({
                ...plan,
                id: plan.id.slice(0, 300), courseId: plan.courseId.slice(0, 160), teeId: String(plan.teeId || '').slice(0, 160),
                playerName: plan.playerName.slice(0, 80), date: String(plan.date || '').slice(0, 20),
                tasks: plan.tasks.filter(task => task && typeof task.id === 'string' && typeof task.label === 'string').slice(0, 8)
                    .map(task => ({ id: task.id.slice(0, 50), label: task.label.slice(0, 220), completed: task.completed === true }))
            })).slice(-50);
    },

    preRoundPlanId() {
        const profile = globalThis.CourseCompassStore?.playerProfile || { name: 'Golfer' };
        return `prep:${this.preRoundPlanDate()}:${String(this.course?.id || 'course').slice(0, 150)}:${String(this.course?.selectedTeeId || 'default').slice(0, 120)}:${String(profile.name || 'Golfer').trim().toLowerCase().slice(0, 80)}`;
    },

    getPreRoundPlan() {
        const id = this.preRoundPlanId();
        return this.getPreRoundPlans().find(plan => plan.id === id) || null;
    },

    preRoundClubConfidence() {
        const skill = globalThis.CourseCompassStore?.experienceProfile?.skill || 'intermediate';
        const bag = typeof Caddie !== 'undefined' ? Caddie.getActiveBag(skill, 'neutral') : { clubs: {} };
        const enabled = Object.entries(bag.clubs || {}).filter(([, values]) => values.enabled !== false && Number(values.carry) >= 120);
        const longestCarry = Math.max(0, ...enabled.map(([, values]) => Number(values.carry) || 0));
        const choices = enabled.filter(([, values]) => Number(values.carry) >= Math.max(150, longestCarry * .75))
            .map(([name, values]) => ({ name, carry: Number(values.carry), dispersion: Number(values.dispersion) || 20, score: (Number(values.dispersion) || 20) - Number(values.carry) * .035 }))
            .sort((a, b) => a.score - b.score || b.carry - a.carry);
        const teeClub = choices[0] || { name: 'your most reliable tee club', carry: 0, dispersion: 0 };
        const shots = GolfData.clubShotHistory || [];
        const samples = shots.filter(shot => shot.club === teeClub.name && shot.quality !== 'mishit').length;
        const source = samples >= 5 ? `${samples} representative shots` : GolfData.clubProfile ? 'personal bag values' : globalThis.CourseCompassStore?.playerProfile?.driverCarry ? 'driver-carry baseline' : 'starting estimates';
        return { ...teeClub, samples, source };
    },

    generatePreRoundPlan(force = false) {
        const existing = this.getPreRoundPlan();
        if (existing && !force) return existing;
        const profile = globalThis.CourseCompassStore?.playerProfile || { name: 'Golfer', improvementGoal: 'consistency' };
        const goal = this.getGoalPlan(profile.improvementGoal);
        const tee = (this.course?.tees || []).find(item => item.id === this.course?.selectedTeeId);
        const holes = this.getCourseHoles();
        const opening = holes[0] || { hole: 1, par: 4, yards: 0 };
        const club = this.preRoundClubConfidence();
        const weather = this.getCachedWeather();
        const current = weather?.current;
        const weatherAge = weather?.fetchedAt ? Math.max(0, Math.round((Date.now() - weather.fetchedAt) / 60000)) : null;
        const conditionLabels = { none: 'calm or not selected', head: 'headwind', tail: 'tailwind', 'cross-l': 'left-to-right crosswind', 'cross-r': 'right-to-left crosswind' };
        const condition = current
            ? `${Math.round(current.temperature)}°F · ${Math.round(current.windSpeed)} mph from ${this.degreesToCompass(current.windDirection)}${weatherAge !== null ? ` · ${weatherAge} min old` : ''}`
            : `${Number(Caddie?.conditions?.temperature) || 72}°F · ${Number(Caddie?.conditions?.windSpeed) || 0} mph ${conditionLabels[Caddie?.conditions?.windDirection] || conditionLabels.none} · manual conditions`;
        const reviews = this.getRoundReviews().filter(review => review.playerName.toLowerCase() === String(profile.name || '').toLowerCase()).sort((a, b) => Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0));
        const lastReview = reviews[0] || null;
        const reviewFocus = lastReview ? this.reviewFocusOptions()[lastReview.priority] : null;
        const scoringRule = profile.improvementGoal === 'break-100' ? 'Bogey is a successful target; remove penalties and forced carries.'
            : profile.improvementGoal === 'break-90' ? 'Protect bogey after a miss and avoid doubles created by recovery shots.'
            : profile.improvementGoal === 'break-80' ? 'Prioritize green-in-regulation chances without short-siding the approach.'
            : profile.improvementGoal === 'reduce-penalties' ? 'Choose the club and line that keep normal dispersion away from boundaries.'
            : profile.improvementGoal === 'competition' ? 'Commit to the written target and routine; judge execution separately from outcome.'
            : 'Play the highest-percentage stock shot and favor the safe side of every target.';
        const openingDistance = opening.yards ? `${Caddie?.formatDistance?.(opening.yards) || `${opening.yards} yd`}` : 'recorded tee distance';
        const tasks = [
            { id: 'tee', label: `Confirm ${tee?.name || 'selected'} tee${tee?.totalYardage ? ` (${Number(tee.totalYardage).toLocaleString()} yd)` : ''} and opening-hole yardage.`, completed: false },
            { id: 'weather', label: 'Refresh course weather and verify wind direction immediately before teeing off.', completed: false },
            { id: 'warmup', label: `Warm up to ${club.name}, then finish with three committed shots to the opening target.`, completed: false },
            { id: 'strategy', label: `Hole ${opening.hole}: choose a center-safe target for the ${openingDistance} par ${opening.par}.`, completed: false },
            { id: 'commitment', label: lastReview?.commitment ? `Carry forward: ${lastReview.commitment}` : `State one on-course commitment tied to ${goal.title.replace('Goal: ', '')}.`, completed: false }
        ];
        if (existing) tasks.forEach(task => { task.completed = existing.tasks.find(item => item.id === task.id)?.completed === true; });
        const now = new Date().toISOString();
        const plan = {
            id: this.preRoundPlanId(), date: this.preRoundPlanDate(), courseId: String(this.course?.id || 'course'),
            courseName: String(this.course?.name || 'Course').slice(0, 120), teeId: String(this.course?.selectedTeeId || ''), teeName: String(tee?.name || 'Selected tee'),
            playerName: String(profile.name || 'Golfer').slice(0, 80), goal: profile.improvementGoal || 'consistency',
            condition, weatherSource: current ? 'Live course weather' : 'Manual playing conditions',
            club: { name: club.name, carry: club.carry, dispersion: club.dispersion, confidence: club.source },
            opening: { hole: opening.hole, par: opening.par, yards: opening.yards || 0 }, scoringRule,
            reviewPriority: reviewFocus?.label || 'No saved post-round priority', reviewCommitment: lastReview?.commitment || '',
            tasks, createdAt: existing?.createdAt || now, updatedAt: now
        };
        const plans = this.getPreRoundPlans().filter(item => item.id !== plan.id);
        CourseCompassStore.setJSON(CourseCompassStore.keys.preRoundPlans, [...plans, plan].slice(-50));
        return plan;
    },

    togglePreRoundTask(taskId) {
        const plan = this.generatePreRoundPlan();
        plan.tasks = plan.tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task);
        plan.updatedAt = new Date().toISOString();
        const plans = this.getPreRoundPlans().filter(item => item.id !== plan.id);
        CourseCompassStore.setJSON(CourseCompassStore.keys.preRoundPlans, [...plans, plan].slice(-50));
        this.render('scorecard');
    },

    regeneratePreRoundPlan() {
        this.generatePreRoundPlan(true);
        this.render('scorecard');
    },

    async refreshPreRoundWeather() {
        const weather = await this.fetchOnCourseWeather(true);
        this.generatePreRoundPlan(true);
        this.scorecardNotice = weather?.current ? 'Current course weather added to the pre-round plan.' : 'Live weather is unavailable; the plan is using manual playing conditions.';
        this.render('scorecard');
    },

    renderPreRoundPlan() {
        const plan = this.generatePreRoundPlan();
        const completed = plan.tasks.filter(task => task.completed).length;
        const percent = Math.round(completed / Math.max(1, plan.tasks.length) * 100);
        return `<section class="pre-round-plan"><header><div><span class="eyebrow">Personal game plan · ${esc(plan.date)}</span><h3>Pre-Round Preparation</h3><p>${esc(plan.courseName)} · ${esc(plan.teeName)} · ${esc(plan.condition)}</p></div><div class="readiness-score"><strong>${percent}%</strong><span>${completed === plan.tasks.length ? 'Ready to play' : `${completed}/${plan.tasks.length} checked`}</span></div></header><div class="pre-round-strategy"><article><span>Scoring rule</span><strong>${esc(plan.scoringRule)}</strong></article><article><span>Reliable tee option</span><strong>${esc(plan.club.name)}${plan.club.carry ? ` · ${Caddie?.formatDistance?.(plan.club.carry) || `${plan.club.carry} yd`} carry` : ''}</strong><small>${esc(plan.club.confidence)}</small></article><article><span>Last review focus</span><strong>${esc(plan.reviewPriority)}</strong><small>${esc(plan.reviewCommitment || 'Complete a post-round review to connect a personal commitment.')}</small></article></div><div class="pre-round-checklist">${plan.tasks.map(task => `<label class="pre-round-task ${task.completed ? 'complete' : ''}"><input type="checkbox" ${task.completed ? 'checked' : ''} onchange="Scoring.togglePreRoundTask('${task.id}')"><span>${esc(task.label)}</span></label>`).join('')}</div><div class="pre-round-actions"><button type="button" class="btn btn-secondary" onclick="Scoring.refreshPreRoundWeather()">Refresh Live Conditions</button><button type="button" class="btn btn-ghost" onclick="Scoring.regeneratePreRoundPlan()">Regenerate Plan</button><span>${esc(plan.weatherSource)} · no paid service required</span></div></section>`;
    },

    renderPreRoundCarryover() {
        const plan = this.getPreRoundPlan();
        if (!plan) return '';
        return `<aside class="pre-round-carryover" aria-label="Opening-hole game plan"><div><span>Today’s scoring rule</span><strong>${esc(plan.scoringRule)}</strong></div><div><span>Carryover commitment</span><strong>${esc(plan.reviewCommitment || `Commit to the target with ${plan.club.name}.`)}</strong></div></aside>`;
    },

    renderScorecard() {
        const courses = this.getScorecardCourses();
        if (!courses.some(course => course.id === this.course?.id)) this.course = GolfData.defaultCourse;
        const playerCount = this.players.length || 2;
        const activeRound = !this.players.length ? GolfData.activeRound : null;
        return `
            <div class="caddie-panel">
                <h2>Interactive Scorecard</h2>
                <p class="panel-desc">Track a 9-hole, 18-hole, or custom-length round for up to 6 players. Your active round is saved automatically.</p>

                ${this.scorecardNotice ? `<div class="geo-message success show" style="margin-bottom:20px;">${esc(this.scorecardNotice)}</div>` : ''}

                <div id="liveSyncPanel">${typeof CourseCompassSync !== 'undefined' ? CourseCompassSync.renderPanel() : ''}</div>

                ${activeRound ? `
                    <div class="progress-tip" style="margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; gap:12px; flex-wrap:wrap;">
                        <div><strong>Unfinished round found</strong><br><span class="text-sm">${esc(activeRound.courseSnapshot?.name || 'Saved course')} · Autosaved ${esc(this.formatAutosaveTime(activeRound.savedAt))}</span></div>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-primary" onclick="Scoring.resumeActiveRound()">Resume</button>
                            <button class="btn btn-ghost" onclick="Scoring.discardActiveRound()">Discard</button>
                        </div>
                    </div>` : ''}
                 
                <div class="scorecard-setup">
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Number of Players</label>
                            <select class="form-select" id="numPlayers" onchange="Scoring.setupPlayers()" ${this.players.length ? 'disabled' : ''}>
                                <option value="1" ${playerCount === 1 ? 'selected' : ''}>1 Player (Solo)</option>
                                <option value="2" ${playerCount === 2 ? 'selected' : ''}>2 Players</option>
                                <option value="3" ${playerCount === 3 ? 'selected' : ''}>3 Players</option>
                                <option value="4" ${playerCount === 4 ? 'selected' : ''}>4 Players (Foursome)</option>
                                <option value="5" ${playerCount === 5 ? 'selected' : ''}>5 Players</option>
                                <option value="6" ${playerCount === 6 ? 'selected' : ''}>6 Players</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Course</label>
                            <select class="form-select" id="scorecardCourse" onchange="Scoring.selectCourse(this.value)" ${this.players.length ? 'disabled' : ''}>
                                ${courses.map(course => {
                                    const tee = course.tees?.find(item => item.id === course.selectedTeeId);
                                    const sourceLabel = course.source?.provider ? ` · Open Data${tee?.name ? ` (${tee.name})` : ''}` : '';
                                    return `<option value="${esc(course.id)}" ${course.id === this.course.id ? 'selected' : ''}>${esc(course.name)} · ${course.holes.length} holes${esc(sourceLabel)}</option>`;
                                }).join('')}
                            </select>
                        </div>
                        ${this.renderScorecardTeeSelector()}
                    </div>

                    ${!this.players.length ? this.renderPreRoundPlan() : ''}
                    
                    <div class="player-inputs" id="playerInputs"></div>
                    
                    <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                        <button class="btn btn-primary" id="startRoundBtn" onclick="Scoring.startRound()" style="${this.players.length ? 'display:none;' : ''}">Start Round</button>
                        <button class="btn btn-danger" onclick="Scoring.discardActiveRound()" id="discardRoundBtn" style="${this.players.length ? '' : 'display:none;'}">Discard Round</button>
                        <button class="btn btn-ghost" onclick="window.print()">Print Scorecard</button>
                        <button class="btn btn-accent" onclick="Scoring.saveCurrentRound()" id="saveRoundBtn" style="${this.players.length ? '' : 'display:none;'}">Finish & Save</button>
                    </div>
                </div>
                
                <div id="scorecardArea"></div>
            </div>
        `;
    },

    formatAutosaveTime(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'recently' : date.toLocaleString();
    },

    renderScorecardTeeSelector() {
        const tees = (this.course?.tees || []).filter(tee => Array.isArray(tee.holes) && tee.holes.length === 18);
        if (tees.length < 2) return '';
        return `<div class="form-group"><label class="form-label">Tee set</label><select class="form-select" id="scorecardTee" onchange="Scoring.selectTee(this.value)" ${this.players.length ? 'disabled' : ''}>${tees.map(tee => `<option value="${esc(tee.id)}" ${tee.id === this.course.selectedTeeId ? 'selected' : ''}>${esc(tee.name)}${tee.totalYardage ? ` · ${Number(tee.totalYardage).toLocaleString()} yd` : ''}${tee.rating ? ` · ${tee.rating}/${tee.slope || '—'}` : ''}</option>`).join('')}</select><small class="profile-setting-note">Complete ODbL scorecard tee set</small></div>`;
    },

    courseWithTee(course, teeId) {
        const tee = (course?.tees || []).find(item => item.id === teeId && Array.isArray(item.holes) && item.holes.length === 18);
        if (!tee) return course;
        const yardages = new Map(tee.holes.map(hole => [Number(hole.hole), Number(hole.yards)]));
        return { ...course, selectedTeeId: tee.id, rating: tee.rating || course.rating, slope: tee.slope || course.slope, holes: (course.holes || []).map(hole => ({ ...hole, yards: yardages.get(Number(hole.hole)) || hole.yards })) };
    },

    selectTee(teeId) {
        if (this.players.length) return;
        const base = this.getScorecardCourses().find(course => course.id === this.course.id) || this.course;
        this.course = this.courseWithTee(base, teeId);
        this.render('scorecard');
    },

    selectCourse(courseId) {
        const nextCourse = this.getScorecardCourses().find(course => course.id === courseId);
        if (!nextCourse) return;

        if (this.players.length && !confirm('Changing courses will discard the active round. Continue?')) {
            const select = document.getElementById('scorecardCourse');
            if (select) select.value = this.course.id;
            return;
        }

        if (this.players.length) this.clearActiveRoundState();
        const preferred = typeof Caddie !== 'undefined' && typeof Caddie.selectPreferredTee === 'function' ? Caddie.selectPreferredTee(nextCourse.tees || []) : null;
        this.course = this.courseWithTee(nextCourse, preferred?.id || nextCourse.selectedTeeId);
        GolfData.selectedCourseId = nextCourse.id;
        this.render('scorecard');
    },

    setupPlayers() {
        const num = parseInt(document.getElementById('numPlayers').value);
        const container = document.getElementById('playerInputs');
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        
        container.innerHTML = '';
        for (let i = 0; i < num; i++) {
            const name = this.players[i]?.name || `Player ${i + 1}`;
            container.innerHTML += `
                <div class="player-input-row">
                    <input type="color" class="player-color" value="${colors[i]}" id="pColor${i}">
                    <input type="text" class="form-input" id="pName${i}" placeholder="Player ${i + 1} name" value="${esc(name)}">
                </div>
            `;
        }
    },

    startRound() {
        const num = parseInt(document.getElementById('numPlayers').value);
        this.scorecardNotice = '';
        this.players = [];
        this.scores = {};
        this.roundStats = {};
        this.roundShots = {};
        this.roundPins = {};
        this.activeGpsShot = null;
        this.gpsShotNotice = '';
        this.holeWindAnalysis = null;
        this.savedRoundSignature = null;
        this.currentRoundHole = this.getCourseHoles()[0]?.hole || 1;
        const openingHole = this.getCourseHoles()[0];
        if (openingHole && typeof Caddie !== 'undefined') {
            Caddie.conditions.distance = openingHole.yards || '';
            Caddie.conditions.elevation = Number.isFinite(Number(openingHole.elevationChangeFeet)) ? Math.max(-200, Math.min(200, Math.round(Number(openingHole.elevationChangeFeet)))) : 0;
            Caddie.saveConditions();
        }

        for (let i = 0; i < num; i++) {
            const name = document.getElementById(`pName${i}`)?.value || `Player ${i + 1}`;
            const color = document.getElementById(`pColor${i}`)?.value || '#3b82f6';
            this.players.push({ name, color, id: i });
            this.scores[i] = {};
            this.roundStats[i] = {};
            this.roundShots[i] = {};
            this.getCourseHoles().forEach(hole => {
                this.scores[i][hole.hole] = null;
                this.roundShots[i][hole.hole] = [];
                this.roundStats[i][hole.hole] = {
                    fairway: hole.par === 3 ? null : '',
                    gir: '',
                    putts: null,
                    penalties: 0
                };
            });
        }

        this.setScoringTool('on-course');
        this.autosaveActiveRound();
        // Show save button once round is started
        const saveBtn = document.getElementById('saveRoundBtn');
        if (saveBtn) saveBtn.style.display = '';
        const discardBtn = document.getElementById('discardRoundBtn');
        if (discardBtn) discardBtn.style.display = '';
        const startBtn = document.getElementById('startRoundBtn');
        if (startBtn) startBtn.style.display = 'none';
        const playerSelect = document.getElementById('numPlayers');
        const courseSelect = document.getElementById('scorecardCourse');
        if (playerSelect) playerSelect.disabled = true;
        if (courseSelect) courseSelect.disabled = true;
    },

    renderScorecardTable() {
        const holes = this.getCourseHoles();
        const front9 = holes.slice(0, 9);
        const back9 = holes.slice(9);
        const front9Par = front9.reduce((s, h) => s + h.par, 0);
        const back9Par = back9.reduce((s, h) => s + h.par, 0);

        let html = `
            <div class="scorecard-table-wrapper">
                <table class="scorecard-table">
                    <thead>
                        <tr>
                            <th>Hole</th>
                            ${front9.map(h => `<th>${h.hole}</th>`).join('')}
                            <th style="background: var(--green-800);">OUT</th>
                            ${back9.length ? `${back9.map(h => `<th>${h.hole}</th>`).join('')}
                            <th style="background: var(--green-800);">IN</th>` : ''}
                            <th style="background: var(--gold-500); color: var(--gray-900);">TOT</th>
                            <th style="background: var(--gold-500); color: var(--gray-900);">+/-</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Par Row -->
                        <tr class="hole-par">
                            <td><strong>Par</strong></td>
                            ${front9.map(h => `<td>${h.par}</td>`).join('')}
                            <td><strong>${front9Par}</strong></td>
                            ${back9.length ? `${back9.map(h => `<td>${h.par}</td>`).join('')}
                            <td><strong>${back9Par}</strong></td>` : ''}
                            <td><strong>${front9Par + back9Par}</strong></td>
                            <td>E</td>
                        </tr>
                        <!-- Yardage Row -->
                        <tr style="font-size: 0.75rem; color: var(--text-muted);">
                            <td>Yards</td>
                            ${front9.map(h => `<td>${h.yards}</td>`).join('')}
                            <td>${front9.reduce((s, h) => s + h.yards, 0)}</td>
                            ${back9.length ? `${back9.map(h => `<td>${h.yards}</td>`).join('')}
                            <td>${back9.reduce((s, h) => s + h.yards, 0)}</td>` : ''}
                            <td>${holes.reduce((s, h) => s + h.yards, 0)}</td>
                            <td></td>
                        </tr>
                        <!-- Player Rows -->
                        ${this.players.map(p => `
                            <tr id="playerRow${p.id}">
                                <td style="font-weight: 700; color: ${esc(p.color)}; white-space: nowrap;">${esc(p.name)}</td>
                                ${front9.map(h => `
                                    <td>
                                        <input type="number" class="score-input" 
                                            id="score_${p.id}_${h.hole}" 
                                            min="1" max="15"
                                            data-player="${p.id}" 
                                            data-hole="${h.hole}" 
                                            data-par="${h.par}"
                                            oninput="Scoring.updateScore(${p.id}, ${h.hole}, this.value, ${h.par})"
                                            ${this.scores[p.id][h.hole] ? `value="${this.scores[p.id][h.hole]}"` : ''}>
                                    </td>
                                `).join('')}
                                <td id="front_${p.id}" style="font-weight: 700;">—</td>
                                ${back9.length ? `${back9.map(h => `
                                    <td>
                                        <input type="number" class="score-input" 
                                            id="score_${p.id}_${h.hole}" 
                                            min="1" max="15"
                                            data-player="${p.id}" 
                                            data-hole="${h.hole}" 
                                            data-par="${h.par}"
                                            oninput="Scoring.updateScore(${p.id}, ${h.hole}, this.value, ${h.par})"
                                            ${this.scores[p.id][h.hole] ? `value="${this.scores[p.id][h.hole]}"` : ''}>
                                    </td>
                                `).join('')}
                                <td id="back_${p.id}" style="font-weight: 700;">—</td>` : ''}
                                <td id="total_${p.id}" style="font-weight: 900; font-size: 1rem;">—</td>
                                <td id="diff_${p.id}" style="font-weight: 900;">—</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <!-- Score Summary Cards -->
            <div class="score-summary" id="scoreSummary">
                ${this.players.map(p => `
                    <div class="score-summary-card" style="border-top: 4px solid ${esc(p.color)};">
                        <div class="player-label" style="color: ${esc(p.color)};">${esc(p.name)}</div>
                        <div class="player-score" id="summaryScore_${p.id}">—</div>
                        <div class="score-detail" id="summaryDetail_${p.id}">Enter scores above</div>
                    </div>
                `).join('')}
            </div>

            ${this.renderRoundStatTracker()}
            ${this.renderRoundShotTracker()}

            <!-- Score Legend -->
            <div style="margin-top: 20px; display: flex; gap: 16px; flex-wrap: wrap; font-size: 0.8rem;">
                <span><span style="display: inline-block; width: 14px; height: 14px; background: #fef3c7; border: 1px solid #ccc; border-radius: 3px; vertical-align: middle;"></span> Eagle or better</span>
                <span><span style="display: inline-block; width: 14px; height: 14px; background: #dcfce7; border: 1px solid #ccc; border-radius: 3px; vertical-align: middle;"></span> Birdie</span>
                <span><span style="display: inline-block; width: 14px; height: 14px; background: #fff; border: 1px solid #ccc; border-radius: 3px; vertical-align: middle;"></span> Par</span>
                <span><span style="display: inline-block; width: 14px; height: 14px; background: #fee2e2; border: 1px solid #ccc; border-radius: 3px; vertical-align: middle;"></span> Bogey</span>
                <span><span style="display: inline-block; width: 14px; height: 14px; background: #fecaca; border: 1px solid #ccc; border-radius: 3px; vertical-align: middle;"></span> Double Bogey+</span>
            </div>
        `;

        document.getElementById('scorecardArea').innerHTML = html;
        
        // Re-apply any existing scores
        this.players.forEach(p => {
            holes.forEach(hole => {
                const h = hole.hole;
                if (this.scores[p.id]?.[h] !== null && this.scores[p.id]?.[h] !== undefined) {
                    const input = document.getElementById(`score_${p.id}_${h}`);
                    if (input) {
                        input.value = this.scores[p.id][h];
                        this.colorScore(input, this.scores[p.id][h], hole.par);
                    }
                }
            });
            this.recalcTotals(p.id);
            this.renderStatSummary(p.id);
        });
        this.bindRoundShotInputs();
    },

    renderRoundStatTracker() {
        const holes = this.getCourseHoles();
        return `
            <details class="round-stat-tracker" open>
                <summary>Advanced Round Stats <span>Fairways, GIR, putts, and penalties</span></summary>
                <p class="text-sm" style="color:var(--text-secondary); margin:10px 0 16px;">Optional: record each result as you play. These stats power more specific coaching insights.</p>
                ${this.players.map(player => `
                    <div class="round-stat-player">
                        <h4 style="color:${esc(player.color)};">${esc(player.name)}</h4>
                        <div class="round-stat-summary" id="statSummary_${player.id}">No advanced stats recorded yet</div>
                        <div class="round-stat-table-wrap">
                            <table class="round-stat-table">
                                <thead><tr><th>Hole</th><th>Par</th><th>Fairway</th><th>GIR</th><th>Putts</th><th>Penalties</th></tr></thead>
                                <tbody>
                                    ${holes.map(hole => {
                                        const stat = this.roundStats[player.id]?.[hole.hole] || {};
                                        return `<tr>
                                            <td><strong>${hole.hole}</strong></td>
                                            <td>${hole.par}</td>
                                            <td>${hole.par === 3 ? '<span class="stat-na">N/A</span>' : `
                                                <select class="form-select stat-select" aria-label="Hole ${hole.hole} fairway for ${esc(player.name)}" onchange="Scoring.updateRoundStat(${player.id}, ${hole.hole}, 'fairway', this.value)">
                                                    <option value="" ${!stat.fairway ? 'selected' : ''}>—</option>
                                                    <option value="hit" ${stat.fairway === 'hit' ? 'selected' : ''}>Hit</option>
                                                    <option value="miss" ${stat.fairway === 'miss' ? 'selected' : ''}>Miss</option>
                                                </select>`}</td>
                                            <td><select class="form-select stat-select" aria-label="Hole ${hole.hole} GIR for ${esc(player.name)}" onchange="Scoring.updateRoundStat(${player.id}, ${hole.hole}, 'gir', this.value)">
                                                <option value="" ${!stat.gir ? 'selected' : ''}>—</option>
                                                <option value="hit" ${stat.gir === 'hit' ? 'selected' : ''}>Hit</option>
                                                <option value="miss" ${stat.gir === 'miss' ? 'selected' : ''}>Miss</option>
                                            </select></td>
                                            <td><input class="form-input stat-number" type="number" min="0" max="9" inputmode="numeric" aria-label="Hole ${hole.hole} putts for ${esc(player.name)}" value="${stat.putts ?? ''}" oninput="Scoring.updateRoundStat(${player.id}, ${hole.hole}, 'putts', this.value)"></td>
                                            <td><input class="form-input stat-number" type="number" min="0" max="9" inputmode="numeric" aria-label="Hole ${hole.hole} penalties for ${esc(player.name)}" value="${stat.penalties || ''}" oninput="Scoring.updateRoundStat(${player.id}, ${hole.hole}, 'penalties', this.value)"></td>
                                        </tr>`;
                                    }).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `).join('')}
            </details>`;
    },

    normalizeRoundShot(shot) {
        const validClub = (GolfData.clubs || []).some(club => club.type !== 'putter' && club.name === shot?.club);
        const gpsTotalOnly = shot?.measuredBy === 'gps' && (shot?.carry === null || shot?.carry === '' || shot?.carry === undefined);
        const carry = gpsTotalOnly ? null : Number(shot?.carry);
        const total = Number(shot?.total);
        const offline = Number(shot?.offline);
        const validLies = ['tee', 'fairway', 'rough'];
        const validQualities = ['solid', 'normal', 'mishit'];
        const validOutcomes = ['fairway', 'green', 'rough', 'bunker', 'water', 'other'];
        if (!validClub || (!gpsTotalOnly && (!Number.isFinite(carry) || carry < 1 || carry > 400)) ||
            !Number.isFinite(total) || (!gpsTotalOnly && total < carry) || total < 1 || total > 450 ||
            !Number.isFinite(offline) || Math.abs(offline) > 100 ||
            !validLies.includes(shot.lie) || !validQualities.includes(shot.quality)) return null;
        return {
            id: typeof shot.id === 'string' && /^roundshot-[a-z0-9-]+$/i.test(shot.id)
                ? shot.id : `roundshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            club: shot.club,
            carry: gpsTotalOnly ? null : Math.round(carry),
            total: Math.round(total),
            offline: Math.round(offline),
            lie: shot.lie,
            quality: shot.quality,
            outcome: validOutcomes.includes(shot.outcome) ? shot.outcome : '',
            measuredBy: shot.measuredBy === 'gps' ? 'gps' : 'manual',
            gpsAccuracy: shot.measuredBy === 'gps' && Number.isFinite(Number(shot.gpsAccuracy)) ? Math.max(0, Math.round(Number(shot.gpsAccuracy))) : null,
            start: shot.measuredBy === 'gps' ? this.normalizeGpsPoint(shot.start) : null,
            end: shot.measuredBy === 'gps' ? this.normalizeGpsPoint(shot.end) : null,
            learnedShotId: typeof shot.learnedShotId === 'string' && /^shot-[a-z0-9-]+$/i.test(shot.learnedShotId)
                ? shot.learnedShotId : ''
        };
    },

    renderRoundShotTracker() {
        const holes = this.getCourseHoles();
        const clubOptions = (GolfData.clubs || []).filter(club => club.type !== 'putter')
            .map(club => `<option value="${club.name}">${club.name}</option>`).join('');
        const playerOptions = this.players.map(player => `<option value="${player.id}">${esc(player.name)}</option>`).join('');
        const holeOptions = holes.map(hole => `<option value="${hole.hole}">Hole ${hole.hole} · Par ${hole.par}</option>`).join('');
        const recorded = [];
        this.players.forEach(player => holes.forEach(hole => {
            const shots = this.roundShots[player.id]?.[hole.hole] || [];
            shots.forEach((shot, index) => recorded.push({ player, hole, shot, index }));
        }));

        const history = recorded.length ? recorded.map(({ player, hole, shot, index }) => {
            const finish = shot.offline < 0 ? `${Math.abs(shot.offline)}L` : shot.offline > 0 ? `${shot.offline}R` : 'center';
            return `
                <div class="round-shot-row">
                    <span><strong>${esc(player.name)} · Hole ${hole.hole}</strong><small>${shot.club}</small></span>
                    <span>${Number.isFinite(shot.carry) ? `${shot.carry} carry / ` : ''}${shot.total} total${!Number.isFinite(shot.carry) ? ' · carry unconfirmed' : ''}</span>
                    <span>${finish} · ${shot.lie} · ${shot.quality}${shot.outcome ? ` · ${shot.outcome}` : ''}${shot.measuredBy === 'gps' ? ' · GPS' : ''}</span>
                    <span class="round-shot-learned">${player.id === 0 ? 'Feeds My Bag' : 'Round only'}</span>
                    <button type="button" class="btn-danger-sm" onclick="Scoring.deleteRoundShot(${player.id}, ${hole.hole}, ${index})" aria-label="Delete ${shot.club} shot on hole ${hole.hole}">Delete</button>
                </div>`;
        }).join('') : '<p class="text-sm round-shot-empty">No shots recorded yet.</p>';

        return `
            <details class="round-shot-tracker" open>
                <summary>On-Course Shot Tracking <span>${recorded.length} shot${recorded.length === 1 ? '' : 's'} recorded</span></summary>
                <p class="text-sm round-shot-help">Record measured shots without leaving the scorecard. ${this.players[0] ? `<strong>${esc(this.players[0].name)}</strong> is the My Bag learning player; other players' shots remain attached to this round only.` : ''}</p>
                <div class="round-shot-form">
                    <label>Player<select class="form-select" id="roundShotPlayer">${playerOptions}</select></label>
                    <label>Hole<select class="form-select" id="roundShotHole">${holeOptions}</select></label>
                    <label>Club<select class="form-select" id="roundShotClub">${clubOptions}</select></label>
                    <label>Carry yards<input type="number" class="form-input" id="roundShotCarry" min="1" max="400" placeholder="e.g., 153"></label>
                    <label>Total yards<input type="number" class="form-input" id="roundShotTotal" min="1" max="450" placeholder="e.g., 158"></label>
                    <label>Finish<select class="form-select" id="roundShotDirection"><option value="0">Center</option><option value="-1">Left</option><option value="1">Right</option></select></label>
                    <label>Offline yards<input type="number" class="form-input" id="roundShotOffline" min="0" max="100" value="0"></label>
                    <label>Lie<select class="form-select" id="roundShotLie"><option value="tee">Tee</option><option value="fairway">Fairway</option><option value="rough">Rough</option></select></label>
                    <label>Strike<select class="form-select" id="roundShotQuality"><option value="normal">Normal</option><option value="solid">Solid</option><option value="mishit">Mishit</option></select></label>
                </div>
                <button type="button" class="btn btn-primary" onclick="Scoring.addRoundShot()">Add Shot</button>
                <div id="roundShotMessage" class="text-sm" aria-live="polite"></div>
                <div class="round-shot-history">${history}</div>
            </details>`;
    },

    addRoundShot() {
        const playerId = Number(document.getElementById('roundShotPlayer')?.value);
        const hole = Number(document.getElementById('roundShotHole')?.value);
        const carry = Number(document.getElementById('roundShotCarry')?.value);
        const totalRaw = document.getElementById('roundShotTotal')?.value;
        const total = totalRaw === '' ? carry : Number(totalRaw);
        const direction = Number(document.getElementById('roundShotDirection')?.value);
        const offlineMagnitude = Number(document.getElementById('roundShotOffline')?.value);
        const candidate = this.normalizeRoundShot({
            club: document.getElementById('roundShotClub')?.value,
            carry,
            total,
            offline: offlineMagnitude * direction,
            lie: document.getElementById('roundShotLie')?.value,
            quality: document.getElementById('roundShotQuality')?.value
        });
        const validPlayer = this.players.some(player => player.id === playerId);
        const validHole = this.getCourseHoles().some(item => item.hole === hole);
        if (!candidate || !validPlayer || !validHole) {
            const message = document.getElementById('roundShotMessage');
            if (message) message.textContent = 'Enter valid shot measurements and select an active player and hole.';
            return false;
        }

        this.recordRoundShot(candidate, playerId, hole, true);
        this.renderScorecardTable();
        const message = document.getElementById('roundShotMessage');
        if (message) message.textContent = `${candidate.club} added for hole ${hole}${playerId === 0 ? ' and sent to Shot Learning' : ''}.`;
        return true;
    },

    recordRoundShot(candidate, playerId, hole, allowLearning = true) {
        if (!candidate || !this.players.some(player => player.id === playerId) || !this.getCourseHoles().some(item => item.hole === hole)) return false;
        if (!this.roundShots[playerId]) this.roundShots[playerId] = {};
        if (!Array.isArray(this.roundShots[playerId][hole])) this.roundShots[playerId][hole] = [];
        if (playerId === 0 && allowLearning && Number.isFinite(candidate.carry)) {
            candidate.learnedShotId = GolfData.addClubShot({
                club: candidate.club,
                carry: candidate.carry,
                total: candidate.total,
                offline: candidate.offline,
                lie: candidate.lie,
                quality: candidate.quality,
                source: 'round',
                courseId: this.course.id || '',
                courseName: this.course.name || '',
                hole,
                playerName: this.players[0].name
            });
        }
        this.roundShots[playerId][hole].push(candidate);
        this.markRoundDirty();
        this.autosaveActiveRound();
        return true;
    },

    deleteRoundShot(playerId, hole, index) {
        const shots = this.roundShots[playerId]?.[hole];
        if (!Array.isArray(shots) || !shots[index]) return;
        const [removed] = shots.splice(index, 1);
        if (removed.learnedShotId) GolfData.deleteClubShot(removed.learnedShotId);
        this.markRoundDirty();
        this.autosaveActiveRound();
        this.renderScorecardTable();
    },

    updateRoundStat(playerId, hole, field, rawValue) {
        const stat = this.roundStats[playerId]?.[hole];
        if (!stat || !['fairway', 'gir', 'putts', 'penalties'].includes(field)) return;

        if (field === 'fairway' || field === 'gir') {
            stat[field] = rawValue === 'hit' || rawValue === 'miss' ? rawValue : '';
        } else {
            const value = rawValue === '' ? null : Math.max(0, Math.min(9, parseInt(rawValue)));
            stat[field] = Number.isFinite(value) ? value : (field === 'penalties' ? 0 : null);
        }

        this.markRoundDirty();
        this.renderStatSummary(playerId);
        this.autosaveActiveRound();
    },

    calculateRoundStats(playerId) {
        const holes = this.getCourseHoles();
        const stats = this.roundStats[playerId] || {};
        const totals = {
            fairwaysHit: 0, fairwaysTracked: 0,
            gir: 0, girTracked: 0,
            putts: 0, puttsHoles: 0,
            penalties: 0
        };

        holes.forEach(hole => {
            const stat = stats[hole.hole] || {};
            if (hole.par !== 3 && (stat.fairway === 'hit' || stat.fairway === 'miss')) {
                totals.fairwaysTracked++;
                if (stat.fairway === 'hit') totals.fairwaysHit++;
            }
            if (stat.gir === 'hit' || stat.gir === 'miss') {
                totals.girTracked++;
                if (stat.gir === 'hit') totals.gir++;
            }
            if (Number.isFinite(stat.putts)) {
                totals.putts += stat.putts;
                totals.puttsHoles++;
            }
            if (Number.isFinite(stat.penalties)) totals.penalties += stat.penalties;
        });
        return totals;
    },

    renderStatSummary(playerId) {
        const el = document.getElementById(`statSummary_${playerId}`);
        if (!el) return;
        const totals = this.calculateRoundStats(playerId);
        const parts = [];
        if (totals.fairwaysTracked) parts.push(`Fairways ${totals.fairwaysHit}/${totals.fairwaysTracked}`);
        if (totals.girTracked) parts.push(`GIR ${totals.gir}/${totals.girTracked}`);
        if (totals.puttsHoles) parts.push(`Putts ${totals.putts} (${totals.puttsHoles} hole${totals.puttsHoles === 1 ? '' : 's'})`);
        if (totals.penalties) parts.push(`Penalties ${totals.penalties}`);
        el.textContent = parts.length ? parts.join(' · ') : 'No advanced stats recorded yet';
    },

    updateScore(playerId, hole, value, par) {
        const score = parseInt(value);
        if (isNaN(score) || score < 1) {
            this.scores[playerId][hole] = null;
        } else {
            this.scores[playerId][hole] = score;
        }

        this.markRoundDirty();
        
        const input = document.getElementById(`score_${playerId}_${hole}`);
        if (input && score >= 1) {
            this.colorScore(input, score, par);
        } else if (input) {
            input.classList.remove('score-eagle', 'score-birdie', 'score-par', 'score-bogey', 'score-double');
        }
         
        this.recalcTotals(playerId);
        this.autosaveActiveRound();
    },

    colorScore(input, score, par) {
        input.classList.remove('score-eagle', 'score-birdie', 'score-par', 'score-bogey', 'score-double');
        const diff = score - par;
        if (diff <= -2) input.classList.add('score-eagle');
        else if (diff === -1) input.classList.add('score-birdie');
        else if (diff === 0) input.classList.add('score-par');
        else if (diff === 1) input.classList.add('score-bogey');
        else if (diff >= 2) input.classList.add('score-double');
    },

    recalcTotals(playerId) {
        const holes = this.getCourseHoles();
        const frontHoleIds = new Set(holes.slice(0, 9).map(hole => hole.hole));
        let front = 0, back = 0, frontCount = 0, backCount = 0;
        let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0;

        holes.forEach(hole => {
            const h = hole.hole;
            const score = this.scores[playerId]?.[h];
            if (score !== null && score !== undefined) {
                const par = hole.par;
                if (frontHoleIds.has(h)) { front += score; frontCount++; }
                else { back += score; backCount++; }

                const diff = score - par;
                if (diff <= -2) eagles++;
                else if (diff === -1) birdies++;
                else if (diff === 0) pars++;
                else if (diff === 1) bogeys++;
                else doubles++;
            }
        });

        const frontEl = document.getElementById(`front_${playerId}`);
        const backEl = document.getElementById(`back_${playerId}`);
        const totalEl = document.getElementById(`total_${playerId}`);
        const diffEl = document.getElementById(`diff_${playerId}`);
        const summaryScore = document.getElementById(`summaryScore_${playerId}`);
        const summaryDetail = document.getElementById(`summaryDetail_${playerId}`);

        if (frontEl) frontEl.textContent = frontCount > 0 ? front : '—';
        if (backEl) backEl.textContent = backCount > 0 ? back : '—';
        
        const total = front + back;
        const totalCount = frontCount + backCount;
        if (totalEl) totalEl.textContent = totalCount > 0 ? total : '—';

        // Calculate relative to par
        // Only show +/- for completed holes
        let playedPar = 0;
        holes.forEach(hole => {
            if (this.scores[playerId]?.[hole.hole] !== null && this.scores[playerId]?.[hole.hole] !== undefined) {
                playedPar += hole.par;
            }
        });
        
        const diff = total - playedPar;
        if (diffEl) {
            if (totalCount > 0) {
                diffEl.textContent = diff === 0 ? 'E' : (diff > 0 ? `+${diff}` : `${diff}`);
                diffEl.style.color = diff < 0 ? 'var(--success)' : diff > 0 ? 'var(--danger)' : 'var(--text-secondary)';
            } else {
                diffEl.textContent = '—';
            }
        }

        // Summary cards
        if (summaryScore) summaryScore.textContent = totalCount > 0 ? total : '—';
        if (summaryDetail && totalCount > 0) {
            const parts = [];
            if (eagles > 0) parts.push(`🦅 ${eagles} eagle${eagles > 1 ? 's' : ''}`);
            if (birdies > 0) parts.push(`🐦 ${birdies} birdie${birdies > 1 ? 's' : ''}`);
            if (pars > 0) parts.push(`✅ ${pars} par${pars > 1 ? 's' : ''}`);
            if (bogeys > 0) parts.push(`😐 ${bogeys} bogey${bogeys > 1 ? 's' : ''}`);
            if (doubles > 0) parts.push(`😟 ${doubles} double+`);
            summaryDetail.innerHTML = `${diff === 0 ? 'Even par' : diff > 0 ? `+${diff}` : diff} (${totalCount}/${holes.length} holes)<br>${parts.join(' | ')}`;
        }
    },

    resetScorecard() {
        this.clearActiveRoundState();
        this.render('scorecard');
    },

    clearActiveRoundState() {
        this.players = [];
        this.scores = {};
        this.roundStats = {};
        this.roundShots = {};
        this.roundPins = {};
        this.activeGpsShot = null;
        this.gpsShotNotice = '';
        this.holeWindAnalysis = null;
        this.savedRoundSignature = null;
        GolfData.clearActiveRound();
    },

    discardActiveRound(requireConfirmation = true) {
        if (requireConfirmation && (this.players.length || GolfData.activeRound) && !confirm('Discard this unfinished round? This cannot be undone.')) return;
        this.clearActiveRoundState();
        this.render('scorecard');
    },

    autosaveActiveRound() {
        if (!this.players.length || !this.course) return;
        GolfData.activeRound = {
            version: 1,
            savedAt: new Date().toISOString(),
            courseId: this.course.id || '',
            currentHole: this.currentRoundHole,
            courseSnapshot: {
                id: this.course.id || '',
                name: this.course.name || 'Saved Course',
                location: this.course.location || '',
                country: this.course.country || '',
                lat: Number.isFinite(Number(this.course.lat)) ? Number(this.course.lat) : null,
                lon: Number.isFinite(Number(this.course.lon)) ? Number(this.course.lon) : null,
                rating: Number(this.course.rating) || 0,
                slope: Number(this.course.slope) || 0,
                holes: this.getCourseHoles().map(hole => ({
                    hole: hole.hole,
                    par: hole.par,
                    yards: hole.yards,
                    type: hole.type || '',
                    fairwayShape: hole.fairwayShape || 'straight',
                    elevation: hole.elevation || 'flat',
                    teeElevationFeet: Number.isFinite(Number(hole.teeElevationFeet)) ? Number(hole.teeElevationFeet) : null,
                    greenElevationFeet: Number.isFinite(Number(hole.greenElevationFeet)) ? Number(hole.greenElevationFeet) : null,
                    elevationChangeFeet: Number.isFinite(Number(hole.elevationChangeFeet)) ? Number(hole.elevationChangeFeet) : null,
                    coordinates: hole.coordinates ? {
                        tee: this.normalizeGpsPoint(hole.coordinates.tee),
                        green: this.normalizeGpsPoint(hole.coordinates.green),
                        greenCenter: this.normalizeGpsPoint(hole.coordinates.greenCenter),
                        greenFront: this.normalizeGpsPoint(hole.coordinates.greenFront),
                        greenBack: this.normalizeGpsPoint(hole.coordinates.greenBack)
                    } : undefined,
                    hazards: Array.isArray(hole.hazards) ? hole.hazards.slice(0, 12).map(hazard => ({ type: hazard.type, pos: hazard.pos })) : [],
                    greenShape: hole.greenShape || 'oval',
                    greenSlope: hole.greenSlope || 'varies',
                    tip: hole.tip || ''
                }))
            },
            players: this.players.map(player => ({ ...player })),
            scores: this.scores,
            roundStats: this.roundStats,
            roundShots: this.roundShots,
            roundPins: this.roundPins
        };
    },

    resumeActiveRound() {
        const active = GolfData.activeRound;
        if (!active) return;

        const storedCourse = GolfData.allCourses.find(course => course.id === active.courseId);
        const snapshot = active.courseSnapshot;
        const course = storedCourse?.holes?.length ? storedCourse : snapshot;
        if (!course?.holes?.length) {
            alert('This round cannot be resumed because its course data is unavailable.');
            GolfData.clearActiveRound();
            this.render('scorecard');
            return;
        }

        this.course = course;
        GolfData.selectedCourseId = course.id;
        this.players = active.players.slice(0, 6).map((player, index) => ({
            id: index,
            name: String(player.name || `Player ${index + 1}`),
            color: String(player.color || '#3b82f6')
        }));
        this.scores = {};
        this.roundStats = {};
        this.roundShots = {};
        this.roundPins = Object.fromEntries(Object.entries(active.roundPins || {}).map(([hole, point]) => [Number(hole), this.normalizeGpsPoint(point)]).filter(([, point]) => point));
        this.activeGpsShot = null;
        this.gpsShotNotice = '';
        this.holeWindAnalysis = null;
        this.players.forEach(player => {
            const savedScores = active.scores[player.id] || active.scores[String(player.id)] || {};
            const savedStats = active.roundStats?.[player.id] || active.roundStats?.[String(player.id)] || {};
            this.scores[player.id] = {};
            this.roundStats[player.id] = {};
            this.roundShots[player.id] = {};
            this.getCourseHoles().forEach(hole => {
                const value = Number(savedScores[hole.hole]);
                this.scores[player.id][hole.hole] = Number.isFinite(value) && value > 0 ? value : null;
                const stat = savedStats[hole.hole] || {};
                this.roundStats[player.id][hole.hole] = {
                    fairway: hole.par === 3 ? null : (stat.fairway === 'hit' || stat.fairway === 'miss' ? stat.fairway : ''),
                    gir: stat.gir === 'hit' || stat.gir === 'miss' ? stat.gir : '',
                    putts: stat.putts !== null && stat.putts !== '' && Number.isInteger(Number(stat.putts)) && Number(stat.putts) >= 0 ? Number(stat.putts) : null,
                    penalties: Number.isInteger(Number(stat.penalties)) && Number(stat.penalties) >= 0 ? Number(stat.penalties) : 0
                };
                const savedShots = active.roundShots?.[player.id]?.[hole.hole] || active.roundShots?.[String(player.id)]?.[String(hole.hole)] || [];
                this.roundShots[player.id][hole.hole] = Array.isArray(savedShots)
                    ? savedShots.map(shot => this.normalizeRoundShot(shot)).filter(Boolean).slice(0, 30)
                    : [];
            });
        });
        this.savedRoundSignature = null;
        const holes = this.getCourseHoles();
        const savedHole = Number(active.currentHole);
        const firstUnscored = holes.find(hole => this.players.some(player => !Number(this.scores[player.id]?.[hole.hole])));
        this.currentRoundHole = holes.some(hole => hole.hole === savedHole) ? savedHole : (firstUnscored || holes[0]).hole;
        const resumedHole = holes.find(hole => hole.hole === this.currentRoundHole);
        if (resumedHole && typeof Caddie !== 'undefined') {
            Caddie.conditions.distance = resumedHole.yards || '';
            Caddie.conditions.elevation = Number.isFinite(Number(resumedHole.elevationChangeFeet)) ? Math.max(-200, Math.min(200, Math.round(Number(resumedHole.elevationChangeFeet)))) : 0;
            Caddie.saveConditions();
        }
        if (typeof Caddie !== 'undefined') this.setScoringTool('on-course');
        else this.render('scorecard');
    },

    markRoundDirty() {
        this.savedRoundSignature = null;
        const btn = document.getElementById('saveRoundBtn');
        if (btn) {
            btn.textContent = '🏁 Finish & Save';
            btn.disabled = false;
        }
    },

    bindRoundShotInputs() {
        const carry = document.getElementById('roundShotCarry');
        const total = document.getElementById('roundShotTotal');
        if (carry && total) {
            carry.addEventListener('input', () => {
                if (!total.dataset.edited) total.value = carry.value;
            });
            total.addEventListener('input', () => { total.dataset.edited = 'true'; });
        }
    },

    bindScorecardEvents() {
        this.setupPlayers();
        if (this.players.length) this.renderScorecardTable();
    },

    localDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /* ── Save Current Round to History ──────────────────── */
    saveCurrentRound() {
        if (this.players.length === 0) { alert('Start a round first.'); return; }

        const holes = this.getCourseHoles();
        const frontHoleIds = new Set(holes.slice(0, 9).map(hole => hole.hole));
        const totalPar = holes.reduce((s, h) => s + h.par, 0);
        const courseName = this.course.name;

        // Check at least one player has some scores
        let anyScores = false;
        this.players.forEach(p => {
            if (holes.some(hole => this.scores[p.id]?.[hole.hole] !== null && this.scores[p.id]?.[hole.hole] !== undefined)) anyScores = true;
        });
        if (!anyScores) { alert('Enter at least one score before saving.'); return; }

        const playerData = this.players.map(p => {
            let front = 0, back = 0, total = 0, holesPlayed = 0;
            let eagles = 0, birdies = 0, pars = 0, bogeys = 0, doubles = 0;
            const holeScores = {};

            holes.forEach(hole => {
                const h = hole.hole;
                const s = this.scores[p.id][h];
                holeScores[h] = s;
                if (s !== null && s !== undefined) {
                    const par = hole.par;
                    total += s;
                    holesPlayed++;
                    if (frontHoleIds.has(h)) front += s; else back += s;
                    const diff = s - par;
                    if (diff <= -2) eagles++;
                    else if (diff === -1) birdies++;
                    else if (diff === 0) pars++;
                    else if (diff === 1) bogeys++;
                    else doubles++;
                }
            });

            // Calculate par for played holes only
            let playedPar = 0;
            holes.forEach(hole => {
                if (this.scores[p.id]?.[hole.hole] !== null && this.scores[p.id]?.[hole.hole] !== undefined) {
                    playedPar += hole.par;
                }
            });
            const statTotals = this.calculateRoundStats(p.id);

            return {
                name: p.name, color: p.color,
                scores: holeScores,
                perHoleStats: this.roundStats[p.id] || {},
                shotsByHole: this.roundShots[p.id] || {},
                totalScore: total, toPar: total - playedPar,
                front9: front, back9: back,
                holesPlayed, holesTotal: holes.length,
                eagles, birdies, pars, bogeys, doubles,
                ...statTotals
            };
        });

        const round = {
            date: this.localDateString(),
            courseName,
            courseId: this.course.id || '',
            courseSnapshot: this.createReplayCourseSnapshot(),
            par: totalPar,
            rating: this.course.rating || 0,
            slope: this.course.slope || 0,
            players: playerData
        };

        const signature = JSON.stringify(round);
        if (signature === this.savedRoundSignature) {
            alert('This version of the round is already saved. Change a score before saving again.');
            return;
        }

        GolfData.saveRound(round);
        this.stopGpsTracking(false);
        this.mapTarget = null;
        this.savedRoundSignature = signature;
        this.clearActiveRoundState();
        this.scorecardNotice = `✅ Round saved to My Progress for ${courseName}.`;
        this.render('scorecard');
    },

    createReplayCourseSnapshot() {
        return {
            id: this.course?.id || '',
            name: this.course?.name || 'Course',
            holes: this.getCourseHoles().map(hole => ({
                hole: Number(hole.hole), par: Number(hole.par), yards: Number(hole.yards) || 0,
                coordinates: hole.coordinates ? {
                    tee: this.normalizeGpsPoint(hole.coordinates.tee),
                    green: this.normalizeGpsPoint(hole.coordinates.green),
                    greenCenter: this.normalizeGpsPoint(hole.coordinates.greenCenter),
                    greenFront: this.normalizeGpsPoint(hole.coordinates.greenFront),
                    greenBack: this.normalizeGpsPoint(hole.coordinates.greenBack)
                } : undefined,
                mapGeometry: Array.isArray(hole.mapGeometry?.path) ? {
                    path: hole.mapGeometry.path.slice(0, 120).map(point => this.normalizeGpsPoint(point)).filter(Boolean)
                } : undefined
            }))
        };
    },

    /* ══════════════════════════════════════════════════════
       📈  MY PROGRESS — Round History & Trends
       ══════════════════════════════════════════════════════ */
    renderProgress() {
        const playerName = document.getElementById('playerName')?.textContent || 'Golfer';
        const rounds = GolfData.getPlayerRounds(playerName);
        const allRounds = GolfData.roundHistory;
        const goal = this.getGoalPlan();

        if (allRounds.length === 0) {
            return `
                <div class="caddie-panel">
                    <h2>My Progress</h2>
                    <div class="empty-state mt-3">
                        <span class="empty-state-code">DATA</span>
                        <h3>No Rounds Saved Yet</h3>
                        <p>Go to the <strong>Scorecard</strong> tab, play a round, and select <strong>Finish & Save</strong> to start tracking your progress over time.</p>
                    </div>
                </div>`;
        }

        // Build dashboard for the current player first, then show all rounds
        let playerSection = '';
        if (rounds.length >= 2) {
            playerSection = this._renderPlayerTrendSection(playerName, rounds);
        } else if (rounds.length === 1) {
            playerSection = `
                <div class="progress-tip mt-2">
                    <strong>Guidance:</strong> Play at least 2 rounds to see trends and improvement graphs for <strong>${esc(playerName)}</strong>. Trends unlock with more data.
                </div>`;
        }

        // Round history table
        const roundReviews = this.getRoundReviews();
        const historyRows = allRounds.slice().reverse().map((r, idx) => {
            const pNames = r.players.map(p => p.name).join(', ');
            const bestPlayer = r.players.reduce((best, p) => (!best || p.toPar < best.toPar) ? p : best, null);
            const toParStr = bestPlayer ? (bestPlayer.toPar === 0 ? 'E' : (bestPlayer.toPar > 0 ? `+${bestPlayer.toPar}` : bestPlayer.toPar)) : '—';
            return `
                <tr>
                    <td>${esc(r.date)}</td>
                    <td>${esc(r.courseName)}</td>
                    <td>${esc(pNames)}</td>
                    <td style="font-weight:700;">${bestPlayer ? bestPlayer.totalScore : '—'}</td>
                    <td style="font-weight:700; color:${bestPlayer && bestPlayer.toPar < 0 ? 'var(--success)' : bestPlayer && bestPlayer.toPar > 0 ? 'var(--danger)' : 'var(--text-secondary)'};">${toParStr}</td>
                    <td>
                        <button class="btn btn-ghost btn-sm" onclick="Scoring.viewRoundDetail('${r.id}')" title="View details and complete a post-round review">${roundReviews.some(review => review.roundId === r.id) ? 'Reviewed' : 'View & Review'}</button>
                        <button class="btn btn-ghost btn-sm" onclick="Scoring.deleteRound('${r.id}')" title="Delete" style="color:var(--danger);">Delete</button>
                    </td>
                </tr>`;
        }).join('');

        return `
            <div class="caddie-panel">
                <h2>My Progress</h2>
                <p class="panel-desc">Track your scoring trends, best rounds, and improvement over time. Save rounds from the Scorecard tab to build your history.</p>

                ${playerSection}

                <h3 class="module-subheading">Round History (${allRounds.length} round${allRounds.length !== 1 ? 's' : ''})</h3>
                <div class="progress-table-wrapper">
                    <table class="progress-table">
                        <thead>
                            <tr><th>Date</th><th>Course</th><th>Player(s)</th><th>Score</th><th>+/−</th><th></th></tr>
                        </thead>
                        <tbody>${historyRows}</tbody>
                    </table>
                </div>

                <div id="roundDetailArea"></div>
            </div>`;
    },

    _renderPlayerTrendSection(name, rounds) {
        // Score trend sparkline (CSS-based bar chart)
        const scores = rounds.map(r => r.totalScore);
        const toPars = rounds.map(r => r.toPar);
        const maxScore = Math.max(...scores);
        const minScore = Math.min(...scores);
        const range = maxScore - minScore || 1;
        const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
        const latestScore = scores[scores.length - 1];
        const trend = scores.length >= 2 ? scores[scores.length - 1] - scores[0] : 0;
        const improving = trend < 0;

        // Scoring distribution (across all rounds)
        let totalEagles = 0, totalBirdies = 0, totalPars = 0, totalBogeys = 0, totalDoubles = 0, totalHoles = 0;
        rounds.forEach(r => {
            totalEagles += r.eagles || 0;
            totalBirdies += r.birdies || 0;
            totalPars += r.pars || 0;
            totalBogeys += r.bogeys || 0;
            totalDoubles += r.doubles || 0;
            totalHoles += r.holesPlayed || 18;
        });

        const distTotal = totalEagles + totalBirdies + totalPars + totalBogeys + totalDoubles || 1;

        // Best round
        const bestRound = rounds.reduce((best, r) => r.toPar < best.toPar ? r : best, rounds[0]);
        const bestToParStr = bestRound.toPar === 0 ? 'E' : (bestRound.toPar > 0 ? `+${bestRound.toPar}` : bestRound.toPar);

        // Front 9 vs Back 9 average
        const avgFront = rounds.filter(r => r.front9).length ? (rounds.reduce((s, r) => s + (r.front9 || 0), 0) / rounds.filter(r => r.front9).length).toFixed(1) : '—';
        const avgBack = rounds.filter(r => r.back9).length ? (rounds.reduce((s, r) => s + (r.back9 || 0), 0) / rounds.filter(r => r.back9).length).toFixed(1) : '—';

        return `
            <div class="progress-trend-section">
                <h3>${esc(name)}'s Trends <span class="badge-custom" style="font-size:0.7rem;">${rounds.length} rounds</span></h3>

                <div class="progress-stat-grid mt-2">
                    <div class="progress-stat-card">
                        <div class="progress-stat-label">Average Score</div>
                        <div class="progress-stat-value">${avgScore}</div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="progress-stat-label">Best Round</div>
                        <div class="progress-stat-value" style="color:var(--success);">${bestRound.totalScore} <span style="font-size:0.8rem;">(${bestToParStr})</span></div>
                        <div class="progress-stat-sub">${esc(bestRound.courseName)} — ${esc(bestRound.date)}</div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="progress-stat-label">Latest Score</div>
                        <div class="progress-stat-value">${latestScore}</div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="progress-stat-label">Overall Trend</div>
                        <div class="progress-stat-value ${improving ? 'trend-improving' : trend > 0 ? 'trend-declining' : ''}">${improving ? '↓ Improving' : trend > 0 ? '↑ Rising' : '→ Steady'}</div>
                        <div class="progress-stat-sub">${Math.abs(trend)} stroke${Math.abs(trend) !== 1 ? 's' : ''} ${improving ? 'better' : trend > 0 ? 'higher' : ''}</div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="progress-stat-label">Avg Front 9</div>
                        <div class="progress-stat-value">${avgFront}</div>
                    </div>
                    <div class="progress-stat-card">
                        <div class="progress-stat-label">Avg Back 9</div>
                        <div class="progress-stat-value">${avgBack}</div>
                    </div>
                </div>

                <!-- Score Trend Chart -->
                <h4 class="mt-3" style="margin-bottom:8px;">Score Trend</h4>
                <div class="progress-chart">
                    ${scores.map((s, i) => {
                        const pct = ((s - minScore) / range) * 100;
                        const barHeight = 20 + pct * 0.6; // 20-80% height range
                        const color = toPars[i] < 0 ? 'var(--green-500)' : toPars[i] === 0 ? 'var(--blue-500, #3b82f6)' : toPars[i] <= 5 ? 'var(--gold-500)' : 'var(--danger)';
                        return `<div class="chart-bar-wrapper" title="${esc(`${rounds[i].date} — ${rounds[i].courseName}: ${s} (${toPars[i] > 0 ? '+' : ''}${toPars[i]})`)}">
                            <div class="chart-bar" style="height:${barHeight}%;background:${color};"></div>
                            <div class="chart-bar-label">${s}</div>
                        </div>`;
                    }).join('')}
                </div>
                <div class="chart-legend" style="display:flex;gap:12px;font-size:0.75rem;color:var(--text-secondary);margin-top:4px;flex-wrap:wrap;">
                    <span>🟢 Under par</span><span>🔵 Even</span><span>🟡 1-5 over</span><span>🔴 6+ over</span>
                </div>

                <!-- Scoring Distribution -->
                <h4 class="mt-3" style="margin-bottom:8px;">Scoring Distribution (${totalHoles} holes)</h4>
                <div class="dist-bar-wrapper">
                    <div class="dist-bar-segment" style="flex:${totalEagles};background:#fbbf24;" title="Eagles: ${totalEagles}"></div>
                    <div class="dist-bar-segment" style="flex:${totalBirdies};background:#22c55e;" title="Birdies: ${totalBirdies}"></div>
                    <div class="dist-bar-segment" style="flex:${totalPars};background:#3b82f6;" title="Pars: ${totalPars}"></div>
                    <div class="dist-bar-segment" style="flex:${totalBogeys};background:#f97316;" title="Bogeys: ${totalBogeys}"></div>
                    <div class="dist-bar-segment" style="flex:${totalDoubles};background:#ef4444;" title="Double+: ${totalDoubles}"></div>
                </div>
                <div style="display:flex;gap:12px;font-size:0.78rem;color:var(--text-secondary);margin-top:6px;flex-wrap:wrap;">
                    <span>🦅 Eagles ${totalEagles} (${(totalEagles/distTotal*100).toFixed(0)}%)</span>
                    <span>🐦 Birdies ${totalBirdies} (${(totalBirdies/distTotal*100).toFixed(0)}%)</span>
                    <span>✅ Pars ${totalPars} (${(totalPars/distTotal*100).toFixed(0)}%)</span>
                    <span>😐 Bogeys ${totalBogeys} (${(totalBogeys/distTotal*100).toFixed(0)}%)</span>
                    <span>😟 Double+ ${totalDoubles} (${(totalDoubles/distTotal*100).toFixed(0)}%)</span>
                </div>
            </div>`;
    },

    viewRoundDetail(roundId) {
        const round = GolfData.roundHistory.find(r => r.id === roundId);
        if (!round) return;

        const area = document.getElementById('roundDetailArea');
        const playerRows = round.players.map((p, playerIndex) => {
            const holeNums = Object.keys(p.scores || {}).map(Number).sort((a,b) => a-b);
            const advancedStats = [];
            if (p.fairwaysTracked) advancedStats.push(`🎯 Fairways ${p.fairwaysHit || 0}/${p.fairwaysTracked}`);
            if (p.girTracked) advancedStats.push(`🟢 GIR ${p.gir || 0}/${p.girTracked}`);
            if (p.puttsHoles) advancedStats.push(`⛳ Putts ${p.putts || 0} (${p.puttsHoles} hole${p.puttsHoles === 1 ? '' : 's'})`);
            if (p.penalties) advancedStats.push(`⚠️ Penalties ${p.penalties}`);
            return `
                <div class="round-detail-player">
                    <h4 style="color:${esc(p.color) || 'var(--text-primary)'};">${esc(p.name)}</h4>
                    <div class="round-detail-stats">
                        <span><strong>Score:</strong> ${p.totalScore}</span>
                        <span><strong>To Par:</strong> ${p.toPar === 0 ? 'E' : p.toPar > 0 ? `+${p.toPar}` : p.toPar}</span>
                        <span>🦅${p.eagles || 0} 🐦${p.birdies || 0} ✅${p.pars || 0} 😐${p.bogeys || 0} 😟${p.doubles || 0}</span>
                        <span><strong>Front:</strong> ${p.front9 || '—'}</span>
                        <span><strong>Back:</strong> ${p.back9 || '—'}</span>
                    </div>
                    ${advancedStats.length ? `<div class="round-detail-stats advanced">${advancedStats.map(stat => `<span>${stat}</span>`).join('')}</div>` : ''}
                    ${holeNums.length > 0 ? `
                    <div class="round-detail-holes">
                        ${holeNums.map(h => {
                            const s = p.scores[h];
                            return s !== null ? `<span class="round-hole-pill" title="Hole ${h}">${h}:${s}</span>` : '';
                        }).join('')}
                    </div>` : ''}
                    ${this.renderShotReplay(round, p)}
                    ${this.renderRoundReview(round, p, playerIndex)}
                </div>`;
        }).join('');

        area.innerHTML = `
            <div class="round-detail-card mt-3 animate-slide-up">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h3>${esc(round.courseName)} — ${esc(round.date)}</h3>
                    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('roundDetailArea').innerHTML='';">✕ Close</button>
                </div>
                <p class="text-sm" style="color:var(--text-secondary);">Par ${round.par} &bull; Rating ${round.rating || '—'} &bull; Slope ${round.slope || '—'}</p>
                ${playerRows}
            </div>`;
    },

    reviewFocusOptions() {
        return {
            tee: { label: 'Tee-shot control', task: 'Hit 20 tee shots to a fairway-width target using the safest reliable club.' },
            approach: { label: 'Approach play', task: 'Hit 24 random approach shots across three distance bands and record the miss side.' },
            'short-game': { label: 'Short game', task: 'Complete 20 varied up-and-down attempts and record how many finish inside six feet.' },
            putting: { label: 'Putting', task: 'Alternate 20 start-line putts inside six feet with 20 lag putts to a three-foot circle.' },
            'course-management': { label: 'Course management', task: 'Review the costly decisions from the last round and rehearse a conservative alternative for each.' },
            mindset: { label: 'Routine and composure', task: 'Play a nine-shot pressure test using a complete pre-shot and reset routine on every ball.' }
        };
    },

    recommendRoundReview(player = {}) {
        const penalties = Number(player.penalties) || 0;
        const puttRate = Number(player.puttsHoles) > 0 ? Number(player.putts) / Number(player.puttsHoles) : null;
        const girRate = Number(player.girTracked) > 0 ? Number(player.gir) / Number(player.girTracked) : null;
        const fairwayRate = Number(player.fairwaysTracked) > 0 ? Number(player.fairwaysHit) / Number(player.fairwaysTracked) : null;
        if (penalties >= 2) return { priority: 'course-management', reason: `${penalties} penalties make decision quality and safe targets the clearest opportunity.` };
        if (puttRate !== null && Number(player.puttsHoles) >= 6 && puttRate >= 2) return { priority: 'putting', reason: `${puttRate.toFixed(1)} putts per tracked hole suggests the fastest scoring opportunity is on the greens.` };
        if (girRate !== null && Number(player.girTracked) >= 6 && girRate < .3) return { priority: 'approach', reason: `${Math.round(girRate * 100)}% greens in regulation makes approach control the strongest evidence-based priority.` };
        if (fairwayRate !== null && Number(player.fairwaysTracked) >= 6 && fairwayRate < .4) return { priority: 'tee', reason: `${Math.round(fairwayRate * 100)}% fairways hit points to a more reliable tee-shot pattern.` };
        if ((Number(player.doubles) || 0) >= 4) return { priority: 'short-game', reason: `${Number(player.doubles)} double-bogey-or-worse holes make recovery and conversion practice worthwhile.` };
        return { priority: 'mindset', reason: 'No single tracked statistic dominates, so reinforce the routine and decisions that produced the round.' };
    },

    getRoundReviews() {
        const allowed = new Set(Object.keys(this.reviewFocusOptions()));
        const reviews = globalThis.CourseCompassStore?.getJSON?.(CourseCompassStore.keys.roundReviews, []);
        if (!Array.isArray(reviews)) return [];
        return reviews.filter(review => review && typeof review.id === 'string' && typeof review.roundId === 'string' && typeof review.playerName === 'string' && allowed.has(review.priority) && allowed.has(review.strength))
            .map(review => ({
                id: review.id.slice(0, 240), roundId: review.roundId.slice(0, 160), playerName: review.playerName.slice(0, 80),
                courseName: String(review.courseName || '').slice(0, 120), roundDate: String(review.roundDate || '').slice(0, 40),
                priority: review.priority, strength: review.strength,
                decisionRating: Math.min(5, Math.max(1, Math.round(Number(review.decisionRating) || 3))),
                composureRating: Math.min(5, Math.max(1, Math.round(Number(review.composureRating) || 3))),
                win: String(review.win || '').slice(0, 240), costlyPattern: String(review.costlyPattern || '').slice(0, 240),
                commitment: String(review.commitment || '').slice(0, 240), updatedAt: String(review.updatedAt || ''),
                addedToPlanAt: String(review.addedToPlanAt || '')
            })).slice(-200);
    },

    roundReviewId(roundId, playerName) {
        return `review:${String(roundId).slice(0, 150)}:${String(playerName).trim().toLowerCase().slice(0, 80)}`;
    },

    getRoundReview(roundId, playerName) {
        const id = this.roundReviewId(roundId, playerName);
        return this.getRoundReviews().find(review => review.id === id) || null;
    },

    saveRoundReview(review) {
        const options = this.reviewFocusOptions();
        if (!review || !options[review.priority] || !options[review.strength] || !review.roundId || !review.playerName) return false;
        const saved = {
            id: this.roundReviewId(review.roundId, review.playerName), roundId: String(review.roundId).slice(0, 160),
            playerName: String(review.playerName).slice(0, 80), courseName: String(review.courseName || '').slice(0, 120),
            roundDate: String(review.roundDate || '').slice(0, 40), priority: review.priority, strength: review.strength,
            decisionRating: Math.min(5, Math.max(1, Math.round(Number(review.decisionRating) || 3))),
            composureRating: Math.min(5, Math.max(1, Math.round(Number(review.composureRating) || 3))),
            win: String(review.win || '').trim().slice(0, 240), costlyPattern: String(review.costlyPattern || '').trim().slice(0, 240),
            commitment: String(review.commitment || '').trim().slice(0, 240), updatedAt: new Date().toISOString(),
            addedToPlanAt: String(review.addedToPlanAt || '')
        };
        const reviews = this.getRoundReviews().filter(item => item.id !== saved.id);
        CourseCompassStore.setJSON(CourseCompassStore.keys.roundReviews, [...reviews, saved].slice(-200));
        return saved;
    },

    saveRoundReviewFromForm(element, rerender = true) {
        const form = element?.closest?.('.round-review') || element;
        if (!form?.dataset?.roundId || !form.dataset.playerName) return false;
        const round = GolfData.roundHistory.find(item => item.id === form.dataset.roundId);
        const review = this.saveRoundReview({
            roundId: form.dataset.roundId, playerName: form.dataset.playerName, courseName: round?.courseName,
            roundDate: round?.date, priority: form.querySelector('[data-review-priority]')?.value,
            strength: form.querySelector('[data-review-strength]')?.value,
            decisionRating: form.querySelector('[data-review-decision]')?.value,
            composureRating: form.querySelector('[data-review-composure]')?.value,
            win: form.querySelector('[data-review-win]')?.value,
            costlyPattern: form.querySelector('[data-review-pattern]')?.value,
            commitment: form.querySelector('[data-review-commitment]')?.value,
            addedToPlanAt: this.getRoundReview(form.dataset.roundId, form.dataset.playerName)?.addedToPlanAt
        });
        if (review && rerender) this.viewRoundDetail(review.roundId);
        return review;
    },

    addReviewToPractice(element) {
        const review = this.saveRoundReviewFromForm(element, false);
        if (!review) return false;
        const plan = this.getPracticePlan();
        const focus = this.reviewFocusOptions()[review.priority];
        plan.tasks = [{ id: 'round-review', label: focus.task, completed: false, source: 'round-review', roundId: review.roundId }, ...plan.tasks.filter(task => task.source !== 'round-review')];
        plan.updatedAt = new Date().toISOString();
        CourseCompassStore.setJSON(CourseCompassStore.keys.practicePlan, plan);
        review.addedToPlanAt = plan.updatedAt;
        this.saveRoundReview(review);
        this.viewRoundDetail(review.roundId);
        return true;
    },

    renderRoundReview(round, player, playerIndex = 0) {
        const options = this.reviewFocusOptions();
        const recommendation = this.recommendRoundReview(player);
        const review = this.getRoundReview(round.id, player.name);
        const priority = review?.priority || recommendation.priority;
        const strength = review?.strength || Object.keys(options).find(key => key !== priority) || 'mindset';
        const optionList = selected => Object.entries(options).map(([value, item]) => `<option value="${value}" ${selected === value ? 'selected' : ''}>${esc(item.label)}</option>`).join('');
        return `<section class="round-review" data-round-id="${esc(round.id)}" data-player-name="${esc(player.name)}" aria-labelledby="round-review-${playerIndex}"><header><div><span class="eyebrow">Reflect · prioritize · practice</span><h4 id="round-review-${playerIndex}">Post-Round Review</h4></div>${review ? '<strong>Saved</strong>' : '<strong>Not yet saved</strong>'}</header><div class="review-recommendation"><strong>Suggested priority: ${esc(options[recommendation.priority].label)}</strong><span>${esc(recommendation.reason)}</span></div><div class="round-review-grid"><label>Strongest area<select class="form-select" data-review-strength>${optionList(strength)}</select></label><label>Next priority<select class="form-select" data-review-priority>${optionList(priority)}</select></label><label>Decision quality<select class="form-select" data-review-decision>${[1,2,3,4,5].map(value => `<option value="${value}" ${(review?.decisionRating || 3) === value ? 'selected' : ''}>${value}${value === 1 ? ' · Reactive' : value === 5 ? ' · Disciplined' : ''}</option>`).join('')}</select></label><label>Composure<select class="form-select" data-review-composure>${[1,2,3,4,5].map(value => `<option value="${value}" ${(review?.composureRating || 3) === value ? 'selected' : ''}>${value}${value === 1 ? ' · Unsettled' : value === 5 ? ' · Steady' : ''}</option>`).join('')}</select></label><label class="review-wide">What worked?<textarea class="form-input" data-review-win maxlength="240" rows="2" placeholder="One decision, skill, or routine to retain">${esc(review?.win || '')}</textarea></label><label class="review-wide">What cost strokes?<textarea class="form-input" data-review-pattern maxlength="240" rows="2" placeholder="Describe the repeated miss or decision—not just the score">${esc(review?.costlyPattern || '')}</textarea></label><label class="review-wide">Next-round commitment<textarea class="form-input" data-review-commitment maxlength="240" rows="2" placeholder="One specific action you will repeat on the course">${esc(review?.commitment || '')}</textarea></label></div><div class="round-review-actions"><button type="button" class="btn btn-secondary" onclick="Scoring.saveRoundReviewFromForm(this)">Save Review</button><button type="button" class="btn btn-primary" onclick="Scoring.addReviewToPractice(this)">${review?.addedToPlanAt ? 'Update Practice Priority' : 'Add Priority to Practice'}</button>${review?.addedToPlanAt ? '<span>Connected to this week’s plan</span>' : ''}</div></section>`;
    },

    deleteRound(roundId) {
        if (!confirm('Delete this round from your history? This cannot be undone.')) return;
        GolfData.deleteRound(roundId);
        this.render('progress');
    },

    bindProgressEvents() {
        // Currently no special bindings; table buttons use inline onclick
    },

    /* ══════════════════════════════════════════════════════
       💡  INSIGHTS — Personalized Suggestions Engine
       ══════════════════════════════════════════════════════ */
    renderInsights() {
        const playerName = document.getElementById('playerName')?.textContent || 'Golfer';
        const rounds = GolfData.getPlayerRounds(playerName);
        const allRounds = GolfData.roundHistory;
        const goal = this.getGoalPlan();

        if (allRounds.length === 0) {
            return `
                <div class="caddie-panel">
                    <h2>Insights & Coaching</h2>
                    <div class="empty-state mt-3">
                        <span class="empty-state-code">COACH</span>
                        <h3>No Data Yet</h3>
                        <p>Save at least one round from the <strong>Scorecard</strong> tab to unlock personalized insights and improvement suggestions.</p>
                        <div class="goal-starter"><strong>${esc(goal.title)}</strong><span>${esc(goal.start)}</span></div>
                    </div>
                    ${this.renderPracticePlan()}
                    ${this.renderPracticeJournal()}
                </div>`;
        }

        // Generate insights from the player's data
        const insights = this._generateInsights(playerName, rounds, allRounds);
        const insightLabels = { highlight: 'PROFILE', success: 'STRENGTH', warning: 'FOCUS', important: 'PRIORITY', info: 'GUIDANCE' };

        return `
            <div class="caddie-panel">
                <h2>Insights & Coaching</h2>
                <p class="panel-desc">Personalized analysis and suggestions based on your ${rounds.length} saved round${rounds.length !== 1 ? 's' : ''}. Play more rounds for deeper insights!</p>
                ${this.renderPracticePlan()}
                ${this.renderPracticeJournal()}
                ${this.renderPerformanceLab(rounds)}

                <div class="insights-container">
                    ${insights.map(ins => `
                        <div class="insight-card insight-${ins.type}">
                            <div class="insight-marker">${ins.code || insightLabels[ins.type] || 'ANALYSIS'}</div>
                            <div class="insight-body">
                                <h4>${ins.title}</h4>
                                <p>${ins.text}</p>
                                ${ins.tip ? `<div class="insight-tip"><strong>Recommended work</strong>${ins.tip}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                ${rounds.length < 3 ? `
                <div class="progress-tip mt-3">
                    <strong>More data improves coaching.</strong> You have ${rounds.length} round${rounds.length !== 1 ? 's' : ''}. After 3+ rounds, you'll unlock trend analysis, consistency metrics, and detailed improvement plans.
                </div>` : ''}
            </div>`;
    },

    getGoalPlan(goalId = globalThis.CourseCompassStore?.playerProfile?.improvementGoal) {
        const plans = {
            'break-100': { title: 'Goal: Break 100', start: 'Prioritize playable tee shots, avoid penalty strokes, and aim for bogey or better on every hole.', practice: 'Spend half of practice inside 100 yards and track penalties each round.' },
            'break-90': { title: 'Goal: Break 90', start: 'Build nine reliable bogey-or-better holes and eliminate doubles caused by recovery mistakes.', practice: 'Practice approach shots from your most common remaining distance and three-foot putts.' },
            'break-80': { title: 'Goal: Break 80', start: 'Raise greens-in-regulation and conversion rates while protecting the card after misses.', practice: 'Track approach proximity, up-and-down attempts, and three-putts by round.' },
            'reduce-penalties': { title: 'Goal: Reduce Penalties', start: 'Choose tee clubs and targets that keep your normal dispersion away from boundaries and water.', practice: 'Record every penalty and the decision that preceded it, then rehearse the safer alternative.' },
            putting: { title: 'Goal: Improve Putting', start: 'Track total putts, three-putts, and first-putt distance instead of total putts alone.', practice: 'Alternate start-line practice inside six feet with speed control from 25–40 feet.' },
            approach: { title: 'Goal: Improve Approach Play', start: 'Use center-green targets and compare results by distance band and club.', practice: 'Build a carry chart, then practice random targets from 80–175 yards.' },
            consistency: { title: 'Goal: Build Consistency', start: 'Use the same pre-shot decision sequence and favor stock shots under pressure.', practice: 'Log dispersion for core clubs and repeat a nine-shot skills test weekly.' },
            competition: { title: 'Goal: Prepare for Competition', start: 'Create a course plan, define conservative misses, and rehearse the opening holes before the event.', practice: 'Play scored simulations with a full routine, consequence targets, and post-round review.' }
        };
        return plans[goalId] || plans.consistency;
    },

    practiceTasks(goalId = globalThis.CourseCompassStore?.playerProfile?.improvementGoal) {
        const tasks = {
            'break-100': ['20 chips to a three-foot circle', '15 playable tee shots with one trusted club', 'Complete one round tracking every penalty'],
            'break-90': ['Make 30 putts from three feet', 'Hit 20 random approaches from 80–140 yards', 'Play nine holes with no attempted recovery hero shots'],
            'break-80': ['Complete a 30-ball approach proximity test', 'Convert 10 of 20 up-and-down attempts', 'Play one pressure nine with full pre-shot routine'],
            'reduce-penalties': ['Map the safe side of every tee shot on one course', 'Hit 20 tee shots inside a fairway-width target', 'Review each penalty and write the safer decision'],
            putting: ['Make 40 putts from three to six feet', 'Finish 20 lag putts inside a three-foot circle', 'Track first-putt distance for one round'],
            approach: ['Calibrate three approach clubs', 'Hit 24 random targets across three distance bands', 'Track green result and miss side for one round'],
            consistency: ['Complete the nine-shot skills test', 'Log nine representative club carries', 'Play nine holes using the same pre-shot routine'],
            competition: ['Write a conservative plan for all 18 holes', 'Play a scored pressure simulation', 'Complete equipment, weather, and arrival checklist']
        };
        return tasks[goalId] || tasks.consistency;
    },

    getPracticePlan() {
        const now = new Date();
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
        const weekOf = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
        const goal = globalThis.CourseCompassStore?.playerProfile?.improvementGoal || 'consistency';
        const saved = globalThis.CourseCompassStore?.getJSON?.(CourseCompassStore.keys.practicePlan, null);
        if (saved?.weekOf === weekOf && saved?.goal === goal && Array.isArray(saved.tasks)) return saved;
        const plan = { version: 1, weekOf, goal, tasks: this.practiceTasks(goal).map((label, index) => ({ id: `task-${index + 1}`, label, completed: false })), updatedAt: new Date().toISOString() };
        globalThis.CourseCompassStore?.setJSON?.(CourseCompassStore.keys.practicePlan, plan);
        return plan;
    },

    togglePracticeTask(taskId) {
        const plan = this.getPracticePlan();
        plan.tasks = plan.tasks.map(task => task.id === taskId ? { ...task, completed: !task.completed } : task);
        plan.updatedAt = new Date().toISOString();
        CourseCompassStore.setJSON(CourseCompassStore.keys.practicePlan, plan);
        this.render('insights');
    },

    renderPracticePlan() {
        const plan = this.getPracticePlan();
        const completed = plan.tasks.filter(task => task.completed).length;
        return `<section class="weekly-practice"><header><div><span class="eyebrow">Week of ${esc(plan.weekOf)}</span><h3>Weekly Practice Plan</h3></div><strong>${completed}/${plan.tasks.length}</strong></header><div class="practice-progress"><span style="width:${Math.round(completed / Math.max(1, plan.tasks.length) * 100)}%"></span></div><div class="practice-task-list">${plan.tasks.map(task => `<label class="practice-task ${task.completed ? 'complete' : ''}"><input type="checkbox" ${task.completed ? 'checked' : ''} onchange="Scoring.togglePracticeTask('${task.id}')"><span>${esc(task.label)}</span></label>`).join('')}</div></section>`;
    },

    getPracticeSessions() {
        const sessions = globalThis.CourseCompassStore?.getJSON?.(CourseCompassStore.keys.practiceSessions, []);
        if (!Array.isArray(sessions)) return [];
        return sessions.filter(session => session && typeof session.id === 'string' && !Number.isNaN(Date.parse(session.at)) && Number(session.duration) >= 5 && Number(session.duration) <= 300)
            .map(session => ({
                id: session.id,
                at: new Date(session.at).toISOString(),
                goal: String(session.goal || 'consistency').slice(0, 40),
                taskId: String(session.taskId || '').slice(0, 40),
                focus: String(session.focus || 'General practice').slice(0, 120),
                duration: Math.round(Number(session.duration)),
                rating: Math.min(5, Math.max(1, Math.round(Number(session.rating) || 3))),
                notes: String(session.notes || '').slice(0, 240)
            })).sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 100);
    },

    addPracticeSession(input = {}) {
        const duration = Math.round(Number(input.duration));
        const rating = Math.round(Number(input.rating));
        const focus = String(input.focus || '').trim().slice(0, 120);
        if (!focus || !Number.isFinite(duration) || duration < 5 || duration > 300 || !Number.isFinite(rating) || rating < 1 || rating > 5) return false;
        const plan = this.getPracticePlan();
        const task = plan.tasks.find(item => item.id === input.taskId);
        const session = {
            id: globalThis.CourseCompassStore?.makeId?.('practice') || `practice-${Date.now()}`,
            at: new Date().toISOString(),
            goal: plan.goal,
            taskId: task?.id || '',
            focus,
            duration,
            rating,
            notes: String(input.notes || '').trim().slice(0, 240)
        };
        CourseCompassStore.setJSON(CourseCompassStore.keys.practiceSessions, [session, ...this.getPracticeSessions()].slice(0, 100));
        if (task && !task.completed) {
            plan.tasks = plan.tasks.map(item => item.id === task.id ? { ...item, completed: true } : item);
            plan.updatedAt = session.at;
            CourseCompassStore.setJSON(CourseCompassStore.keys.practicePlan, plan);
        }
        return session;
    },

    recordPracticeSession() {
        const taskId = document.getElementById('practiceTask')?.value || '';
        const plan = this.getPracticePlan();
        const task = plan.tasks.find(item => item.id === taskId);
        const session = this.addPracticeSession({
            taskId,
            focus: task?.label || document.getElementById('practiceFocus')?.value,
            duration: document.getElementById('practiceDuration')?.value,
            rating: document.getElementById('practiceRating')?.value,
            notes: document.getElementById('practiceNotes')?.value
        });
        if (!session) {
            globalThis.App?.setDataCenterMessage?.('Enter a practice focus, 5–300 minutes, and a session rating.', 'error');
            return false;
        }
        this.render('insights');
        return true;
    },

    deletePracticeSession(sessionId) {
        if (!confirm('Remove this practice session?')) return;
        const sessions = this.getPracticeSessions().filter(session => session.id !== sessionId);
        CourseCompassStore.setJSON(CourseCompassStore.keys.practiceSessions, sessions);
        this.render('insights');
    },

    practiceStreak(sessions = this.getPracticeSessions()) {
        const key = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        const days = new Set(sessions.map(session => key(new Date(session.at))));
        const cursor = new Date();
        if (!days.has(key(cursor))) cursor.setDate(cursor.getDate() - 1);
        let streak = 0;
        while (days.has(key(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1); }
        return streak;
    },

    renderPracticeJournal() {
        const sessions = this.getPracticeSessions();
        const plan = this.getPracticePlan();
        const sevenDaysAgo = Date.now() - 7 * 86400000;
        const recentWeek = sessions.filter(session => Date.parse(session.at) >= sevenDaysAgo);
        const minutes = recentWeek.reduce((sum, session) => sum + session.duration, 0);
        const taskOptions = plan.tasks.map(task => `<option value="${task.id}">${task.completed ? 'Completed: ' : ''}${esc(task.label)}</option>`).join('');
        const history = sessions.slice(0, 5).map(session => `<article class="practice-entry"><div><strong>${esc(session.focus)}</strong><small>${new Date(session.at).toLocaleDateString()} · ${session.duration} min · ${session.rating}/5</small>${session.notes ? `<p>${esc(session.notes)}</p>` : ''}</div><button type="button" class="btn btn-secondary" onclick="Scoring.deletePracticeSession('${session.id}')" aria-label="Remove practice session">Remove</button></article>`).join('');
        return `<section class="practice-journal"><header><div><span class="eyebrow">Training record</span><h3>Practice Journal</h3></div><div class="practice-metrics"><span><strong>${minutes}</strong> min / 7 days</span><span><strong>${this.practiceStreak(sessions)}</strong> day streak</span></div></header><div class="practice-entry-form"><label>Weekly task<select class="form-select" id="practiceTask"><option value="">Custom focus</option>${taskOptions}</select></label><label>Custom focus<input class="form-input" id="practiceFocus" maxlength="120" placeholder="What did you work on?"></label><label>Minutes<input class="form-input" id="practiceDuration" type="number" min="5" max="300" value="30"></label><label>Session quality<select class="form-select" id="practiceRating"><option value="1">1 · Difficult</option><option value="2">2</option><option value="3" selected>3 · Productive</option><option value="4">4</option><option value="5">5 · Excellent</option></select></label><label class="practice-notes">Notes<input class="form-input" id="practiceNotes" maxlength="240" placeholder="One takeaway for the next session"></label><button type="button" class="btn btn-primary" onclick="Scoring.recordPracticeSession()">Log Session</button></div>${history ? `<div class="practice-history"><h4>Recent sessions</h4>${history}</div>` : '<p class="practice-empty">Log a completed session to build a training history and streak.</p>'}</section>`;
    },

    performanceShots(rounds = [], club = 'all') {
        return rounds.flatMap(round => Object.values(round.shotsByHole || {}).flatMap(list => Array.isArray(list) ? list : []))
            .filter(shot => shot && Number(shot.carry || shot.total) > 0 && Number.isFinite(Number(shot.offline)))
            .map(shot => ({ carry: Number(shot.carry || shot.total), offline: Number(shot.offline), club: String(shot.club || 'Club') }))
            .filter(shot => club === 'all' || shot.club === club).slice(-120);
    },

    setPerformanceClub(club) {
        this.performanceClub = String(club || 'all').slice(0, 80);
        this.render('insights');
    },

    renderPerformanceLab(rounds = []) {
        const allShots = this.performanceShots(rounds);
        const clubs = [...new Set(allShots.map(shot => shot.club))].sort();
        if (this.performanceClub !== 'all' && !clubs.includes(this.performanceClub)) this.performanceClub = 'all';
        const shots = this.performanceShots(rounds, this.performanceClub);
        if (!shots.length) return `<section class="performance-lab empty"><span class="eyebrow">Performance lab</span><h3>Miss patterns unlock with tracked shots</h3><p>Record carry and offline result in the scorecard or GPS shot tracker. Five or more shots make the directional pattern substantially more useful.</p></section>`;
        const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
        const points = shots.map(shot => {
            const x = clamp(160 + shot.offline * 3.2, 18, 302);
            const y = clamp(216 - shot.carry * .72, 18, 216);
            const side = shot.offline < -4 ? 'left' : shot.offline > 4 ? 'right' : 'center';
            return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" class="miss-${side}"><title>${esc(shot.club)} · ${Math.round(shot.carry)} yd · ${Math.abs(Math.round(shot.offline))} yd ${side}</title></circle>`;
        }).join('');
        const left = shots.filter(shot => shot.offline < -4).length, right = shots.filter(shot => shot.offline > 4).length, center = shots.length - left - right;
        const bands = [{ label: 'Under 80 yd', min: 0, max: 79 }, { label: '80–124 yd', min: 80, max: 124 }, { label: '125–174 yd', min: 125, max: 174 }, { label: '175+ yd', min: 175, max: Infinity }]
            .map(band => {
                const values = shots.filter(shot => shot.carry >= band.min && shot.carry <= band.max);
                const dispersion = values.length ? Math.round(values.reduce((sum, shot) => sum + Math.abs(shot.offline), 0) / values.length) : null;
                const tendency = !values.length ? 'No data' : values.filter(shot => shot.offline < -4).length > values.filter(shot => shot.offline > 4).length ? 'Left tendency' : values.filter(shot => shot.offline > 4).length > values.filter(shot => shot.offline < -4).length ? 'Right tendency' : 'Balanced';
                return `<tr><th>${band.label}</th><td>${values.length}</td><td>${dispersion === null ? '—' : `±${dispersion} yd`}</td><td>${tendency}</td></tr>`;
            }).join('');
        const confidence = shots.length >= 25 ? 'Strong sample' : shots.length >= 10 ? 'Developing sample' : 'Early sample';
        return `<section class="performance-lab"><header><div><span class="eyebrow">Performance lab</span><h3>Directional Miss Pattern</h3></div><div class="performance-controls"><label>Club<select class="form-select" onchange="Scoring.setPerformanceClub(this.value)"><option value="all">All clubs</option>${clubs.map(club => `<option value="${esc(club)}" ${this.performanceClub === club ? 'selected' : ''}>${esc(club)}</option>`).join('')}</select></label><strong>${shots.length} shots · ${confidence}</strong></div></header><div class="performance-grid"><div><svg class="miss-heatmap" viewBox="0 0 320 240" role="img" aria-label="Shot miss pattern: ${left} left, ${center} center, and ${right} right"><rect width="320" height="240" rx="16"/><path d="M160 12V228"/><path d="M55 12V228M265 12V228" class="guide"/><text x="38" y="230">LEFT</text><text x="142" y="230">TARGET</text><text x="270" y="230">RIGHT</text>${points}</svg><div class="miss-legend"><span>${left} left</span><span>${center} center</span><span>${right} right</span></div></div><div class="performance-bands"><h4>Shot-distance bands</h4><table><thead><tr><th>Carry band</th><th>Shots</th><th>Avg. offline</th><th>Pattern</th></tr></thead><tbody>${bands}</tbody></table><p>${confidence}. Use at least 25 representative shots before treating a pattern as dependable. Offline dispersion is not proximity to the hole; it measures finish relative to the intended line.</p></div></div></section>`;
    },

    _generateInsights(playerName, rounds, allRounds) {
        const goal = this.getGoalPlan();
        const insights = [{ type: 'important', code: 'YOUR GOAL', title: goal.title, text: goal.start, tip: goal.practice }];

        // Use all rounds if the player has no personal rounds
        const data = rounds.length >= 1 ? rounds : [];
        if (data.length === 0) {
            // Provide generic insights from allRounds
            insights.push({
                type: 'info', icon: '📋', title: 'Getting Started',
                text: `We found ${allRounds.length} saved round(s) but none under the name "${esc(playerName)}". Make sure the player name on your scorecard matches your profile name (shown in the top-right corner).`,
                tip: 'Set your name by clicking your name badge in the top bar, then use that same name when filling in the scorecard.'
            });
            return insights;
        }

        const scores = data.map(r => r.totalScore);
        const toPars = data.map(r => r.toPar);
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const avgToPar = toPars.reduce((a, b) => a + b, 0) / toPars.length;

        // Totals across all rounds
        let totEagles = 0, totBirdies = 0, totPars = 0, totBogeys = 0, totDoubles = 0, totHoles = 0;
        let fairwaysHit = 0, fairwaysTracked = 0, gir = 0, girTracked = 0;
        let totalPutts = 0, puttsHoles = 0, totalPenalties = 0, statsRounds = 0;
        data.forEach(r => {
            totEagles += r.eagles || 0;
            totBirdies += r.birdies || 0;
            totPars += r.pars || 0;
            totBogeys += r.bogeys || 0;
            totDoubles += r.doubles || 0;
            totHoles += r.holesPlayed || 18;
            fairwaysHit += r.fairwaysHit || 0;
            fairwaysTracked += r.fairwaysTracked || 0;
            gir += r.gir || 0;
            girTracked += r.girTracked || 0;
            totalPutts += r.putts || 0;
            puttsHoles += r.puttsHoles || 0;
            totalPenalties += r.penalties || 0;
            if (r.fairwaysTracked || r.girTracked || r.puttsHoles || r.penalties) statsRounds++;
        });

        // === 1. Overall Skill Assessment ===
        let skillLevel, skillIcon;
        if (avgToPar <= 0) { skillLevel = 'Scratch or Better'; skillIcon = '🏆'; }
        else if (avgToPar <= 5) { skillLevel = 'Low Handicapper'; skillIcon = '⭐'; }
        else if (avgToPar <= 12) { skillLevel = 'Mid Handicapper'; skillIcon = '🎯'; }
        else if (avgToPar <= 20) { skillLevel = 'High Handicapper'; skillIcon = '📈'; }
        else { skillLevel = 'Beginner'; skillIcon = '🌱'; }

        insights.push({
            type: 'highlight', icon: skillIcon, title: `Skill Level: ${skillLevel}`,
            text: `Based on ${data.length} round${data.length !== 1 ? 's' : ''}, your average score is <strong>${avgScore.toFixed(1)}</strong> (${avgToPar > 0 ? '+' : ''}${avgToPar.toFixed(1)} to par). ${
                avgToPar <= 0 ? "You're playing at or below par — outstanding!" :
                avgToPar <= 5 ? "You're a skilled golfer. Fine-tuning your weaknesses can get you to scratch." :
                avgToPar <= 12 ? "You're solidly intermediate. Targeted practice on your weak areas will drop strokes fast." :
                avgToPar <= 20 ? "You're making good progress. Focus on consistency and course management." :
                "Every round is a learning opportunity. Focus on fundamentals and enjoy the journey!"
            }`,
            tip: null
        });

        // === 2. Biggest Scoring Leak ===
        const bogeyPct = ((totBogeys + totDoubles) / totHoles * 100);
        const doublePct = (totDoubles / totHoles * 100);
        if (doublePct > 15) {
            insights.push({
                type: 'warning', icon: '🚨', title: 'Double Bogeys Are Your #1 Leak',
                text: `You're making double bogey or worse on <strong>${doublePct.toFixed(0)}%</strong> of holes (${totDoubles} out of ${totHoles}). Eliminating these big numbers is the fastest way to lower your score — often worth 5-10 strokes per round.`,
                tip: 'When in trouble, play the safe shot back to the fairway. Avoid hero shots from bad lies. A bogey is always better than a double. Practice "damage control" mentality.'
            });
        } else if (bogeyPct > 40) {
            insights.push({
                type: 'warning', icon: '⚠️', title: 'Too Many Bogeys',
                text: `${bogeyPct.toFixed(0)}% of your holes result in bogey or worse. Converting just a few of these to pars each round would significantly improve your scoring.`,
                tip: 'Focus your practice on approach shots (100-150 yards) and lag putting. These are the two skills that most often convert bogeys into pars for recreational golfers.'
            });
        }

        // === Advanced-stat coaching ===
        if (fairwaysTracked >= 5) {
            const fairwayPct = fairwaysHit / fairwaysTracked * 100;
            insights.push(fairwayPct < 40 ? {
                type: 'warning', icon: '🎯', title: 'Tee Accuracy Opportunity',
                text: `You hit <strong>${fairwayPct.toFixed(0)}%</strong> of tracked fairways (${fairwaysHit}/${fairwaysTracked}). More playable tee shots will reduce recovery shots and penalties.`,
                tip: 'Choose the longest club you can keep in play, and aim toward the side that leaves your preferred approach angle. A 3-wood or hybrid in the fairway often beats a driver in trouble.'
            } : {
                type: 'success', icon: '🎯', title: 'Reliable Tee Accuracy',
                text: `You hit <strong>${fairwayPct.toFixed(0)}%</strong> of tracked fairways (${fairwaysHit}/${fairwaysTracked}). That is a dependable foundation for lower scores.`,
                tip: null
            });
        }

        if (girTracked >= 5) {
            const girPct = gir / girTracked * 100;
            insights.push(girPct < 35 ? {
                type: 'important', icon: '🟢', title: 'Greens in Regulation Need Attention',
                text: `You hit <strong>${girPct.toFixed(0)}%</strong> of tracked greens in regulation (${gir}/${girTracked}). Approach accuracy is currently limiting your par opportunities.`,
                tip: 'Aim for the center of the green, use one more club when between distances, and prioritize solid contact over attacking tucked pins.'
            } : {
                type: 'success', icon: '🟢', title: 'Strong Green-Hitting',
                text: `You hit <strong>${girPct.toFixed(0)}%</strong> of tracked greens in regulation (${gir}/${girTracked}), creating consistent par and birdie chances.`,
                tip: null
            });
        }

        if (puttsHoles >= 9) {
            const puttsPerHole = totalPutts / puttsHoles;
            if (puttsPerHole > 2.05) {
                insights.push({
                    type: 'warning', icon: '⛳', title: 'Putting Is Costing Strokes',
                    text: `You average <strong>${puttsPerHole.toFixed(2)} putts per tracked hole</strong> (${totalPutts} putts across ${puttsHoles} holes).`,
                    tip: 'Prioritize speed control from 20-40 feet and confidence inside 5 feet. Reducing three-putts is the fastest route to a lower putting average.'
                });
            } else if (puttsPerHole <= 1.8) {
                insights.push({
                    type: 'success', icon: '⛳', title: 'Putting Strength',
                    text: `You average <strong>${puttsPerHole.toFixed(2)} putts per tracked hole</strong>. Your putting is actively supporting your scoring.`,
                    tip: null
                });
            }
        }

        if (statsRounds && totalPenalties / statsRounds > 2) {
            insights.push({
                type: 'warning', icon: '⚠️', title: 'Penalty Strokes Are Adding Up',
                text: `You average <strong>${(totalPenalties / statsRounds).toFixed(1)} penalty strokes</strong> across rounds with advanced stats.`,
                tip: 'Identify the holes and clubs producing penalties. Favor a conservative target or shorter club whenever one miss brings a penalty area or out-of-bounds into play.'
            });
        }

        // === 3. Par Performance Breakdown ===
        if (data.length >= 1 && data[0].scores) {
            // Analyze which hole pars the player struggles on most
            let par3scores = [], par4scores = [], par5scores = [];
            data.forEach(r => {
                if (!r.scores) return;
                // Try to find course hole data
                const course = GolfData.allCourses.find(c => c.id === r.courseId);
                if (!course || !course.holes.length) return;
                course.holes.forEach(h => {
                    const s = r.scores[h.hole];
                    if (s !== null && s !== undefined) {
                        const diff = s - h.par;
                        if (h.par === 3) par3scores.push(diff);
                        else if (h.par === 4) par4scores.push(diff);
                        else if (h.par >= 5) par5scores.push(diff);
                    }
                });
            });

            if (par3scores.length + par4scores.length + par5scores.length > 0) {
                const avg3 = par3scores.length ? (par3scores.reduce((a,b) => a+b, 0) / par3scores.length) : null;
                const avg4 = par4scores.length ? (par4scores.reduce((a,b) => a+b, 0) / par4scores.length) : null;
                const avg5 = par5scores.length ? (par5scores.reduce((a,b) => a+b, 0) / par5scores.length) : null;
                
                const weakest = [
                    avg3 !== null ? { type: 'Par 3s', avg: avg3 } : null,
                    avg4 !== null ? { type: 'Par 4s', avg: avg4 } : null,
                    avg5 !== null ? { type: 'Par 5s', avg: avg5 } : null,
                ].filter(Boolean).sort((a,b) => b.avg - a.avg)[0];

                if (weakest && weakest.avg > 0.8) {
                    const tips = {
                        'Par 3s': 'Work on iron accuracy. On par 3s, club selection is everything — take one extra club and aim for the center of the green, not the pin. Many amateurs under-club on par 3s.',
                        'Par 4s': 'Focus on fairway accuracy off the tee and approach shots. Even if you miss the green, getting up-and-down from the fringe is a learnable skill that saves strokes on par 4s.',
                        'Par 5s': 'Par 5s are your best birdie opportunities. Focus on smart layup positions that give you a comfortable wedge distance in. Don\'t try to reach every par 5 in two.'
                    };
                    insights.push({
                        type: 'important', icon: '🎯', title: `Weakest Hole Type: ${weakest.type}`,
                        text: `You average <strong>+${weakest.avg.toFixed(1)}</strong> over par on ${weakest.type} (based on ${weakest.type === 'Par 3s' ? par3scores.length : weakest.type === 'Par 4s' ? par4scores.length : par5scores.length} holes). This is your biggest opportunity for improvement.`,
                        tip: tips[weakest.type]
                    });
                }

                // Also show if they're notably good at something
                const strongest = [
                    avg3 !== null ? { type: 'Par 3s', avg: avg3, count: par3scores.length } : null,
                    avg4 !== null ? { type: 'Par 4s', avg: avg4, count: par4scores.length } : null,
                    avg5 !== null ? { type: 'Par 5s', avg: avg5, count: par5scores.length } : null,
                ].filter(Boolean).sort((a,b) => a.avg - b.avg)[0];

                if (strongest && strongest.avg <= 0.3 && strongest.count >= 3) {
                    insights.push({
                        type: 'success', icon: '💪', title: `Strength: ${strongest.type}`,
                        text: `You average just <strong>+${strongest.avg.toFixed(1)}</strong> on ${strongest.type} over ${strongest.count} holes — that's great! Keep doing what you're doing here.`,
                        tip: null
                    });
                }
            }
        }

        // === 4. Consistency Analysis ===
        if (scores.length >= 3) {
            const stdDev = Math.sqrt(scores.reduce((s, x) => s + (x - avgScore) ** 2, 0) / scores.length);
            if (stdDev > 6) {
                insights.push({
                    type: 'warning', icon: '📉', title: 'Inconsistent Scoring',
                    text: `Your scores vary by about <strong>±${stdDev.toFixed(1)} strokes</strong> from round to round. This suggests inconsistency — some rounds are much better than others.`,
                    tip: 'Build a reliable pre-shot routine you use on every shot. Inconsistency often comes from mental lapses or trying different things each round. Stick to one swing thought and one course strategy.'
                });
            } else if (stdDev <= 3) {
                insights.push({
                    type: 'success', icon: '🎯', title: 'Very Consistent!',
                    text: `Your scores vary by only <strong>±${stdDev.toFixed(1)} strokes</strong> — that's great consistency. You know your game and play predictably.`,
                    tip: null
                });
            }
        }

        // === 5. Front 9 vs Back 9 ===
        const fronts = data.filter(r => r.front9 > 0).map(r => r.front9);
        const backs = data.filter(r => r.back9 > 0).map(r => r.back9);
        if (fronts.length >= 2 && backs.length >= 2) {
            const avgFront = fronts.reduce((a,b) => a+b, 0) / fronts.length;
            const avgBack = backs.reduce((a,b) => a+b, 0) / backs.length;
            const diff = avgBack - avgFront;
            if (diff > 2) {
                insights.push({
                    type: 'important', icon: '🔋', title: 'Back 9 Fade',
                    text: `Your back 9 average (<strong>${avgBack.toFixed(1)}</strong>) is <strong>${diff.toFixed(1)} strokes higher</strong> than your front 9 (<strong>${avgFront.toFixed(1)}</strong>). You're fading late in the round.`,
                    tip: 'This often indicates fatigue or loss of focus. Stay hydrated, eat a snack at the turn, and do a quick mental reset on hole 10. Consider walking fitness or stamina training.'
                });
            } else if (diff < -2) {
                insights.push({
                    type: 'success', icon: '🔥', title: 'Strong Finisher',
                    text: `You play better on the back 9 (<strong>${avgBack.toFixed(1)}</strong>) than the front 9 (<strong>${avgFront.toFixed(1)}</strong>) by <strong>${Math.abs(diff).toFixed(1)} strokes</strong>. You warm up and get better as the round goes on.`,
                    tip: 'Try a longer warm-up session before your round to start stronger on the front 9. 10-15 minutes of putting and short game can make a big difference.'
                });
            }
        }

        // === 6. Trend Direction (improvement / regression) ===
        if (scores.length >= 3) {
            // Simple linear regression
            const n = scores.length;
            const xMean = (n - 1) / 2;
            const yMean = avgScore;
            let num = 0, den = 0;
            for (let i = 0; i < n; i++) {
                num += (i - xMean) * (scores[i] - yMean);
                den += (i - xMean) ** 2;
            }
            const slope = den !== 0 ? num / den : 0;

            if (slope < -0.5) {
                insights.push({
                    type: 'success', icon: '📈', title: 'Scores Are Improving!',
                    text: `Your scores are trending <strong>downward</strong> by about <strong>${Math.abs(slope).toFixed(1)} strokes per round</strong>. Whatever you're practicing is working — keep it up!`,
                    tip: 'Keep a practice journal. Write down what you worked on before each round and note which areas felt better. This reinforces the connection between practice and results.'
                });
            } else if (slope > 0.5) {
                insights.push({
                    type: 'warning', icon: '📉', title: 'Scores Are Rising',
                    text: `Your scores have been trending <strong>upward</strong> by about <strong>${slope.toFixed(1)} strokes per round</strong>. This might be a temporary slump or a sign that something needs adjustment.`,
                    tip: 'Go back to basics: grip, alignment, posture. Sometimes scores rise because we unconsciously drift from fundamentals. A single lesson or video review of your swing can reset things quickly.'
                });
            }
        }

        // === 7. Birdie Frequency ===
        if (totHoles >= 18) {
            const birdieRate = totBirdies / totHoles * 18;
            if (birdieRate < 0.5 && avgToPar > 5) {
                insights.push({
                    type: 'info', icon: '🐦', title: 'Birdie Opportunities',
                    text: `You're averaging only <strong>${birdieRate.toFixed(1)} birdies per 18 holes</strong>. For your level, focus on making more pars first — birdies will come naturally as your game tightens.`,
                    tip: 'On every hole, aim for the fat part of the green. "Pin-seeking" is for single-digit handicappers. Hitting more greens in regulation is the #1 predictor of lower scores.'
                });
            } else if (birdieRate >= 3) {
                insights.push({
                    type: 'success', icon: '🐦', title: 'Birdie Machine!',
                    text: `You're averaging <strong>${birdieRate.toFixed(1)} birdies per 18 holes</strong>. That's excellent! If you can reduce your bogey rate alongside this, you'll see big scoring drops.`,
                    tip: null
                });
            }
        }

        // === 8. Putting & Short Game (general advice based on scoring pattern) ===
        if (totHoles >= 18) {
            const parRate = totPars / totHoles * 100;
            if (parRate < 30 && avgToPar > 10) {
                insights.push({
                    type: 'important', icon: '⛳', title: 'Short Game Focus Needed',
                    text: `With a par rate of only <strong>${parRate.toFixed(0)}%</strong>, your short game and putting are likely costing you the most strokes. Studies show 60-65% of all shots in golf are inside 100 yards.`,
                    tip: 'Spend 60% of your practice time on putting and chipping. A 15-minute putting drill before each round can save 3-5 strokes: practice 3-footers (make 10 in a row) and lag putts from 30+ feet (get within 3 feet).'
                });
            }
        }

        // === 9. Course-Specific Patterns ===
        const courseCounts = {};
        data.forEach(r => { courseCounts[r.courseName] = (courseCounts[r.courseName] || 0) + 1; });
        const mostPlayed = Object.entries(courseCounts).sort((a,b) => b[1] - a[1])[0];
        if (mostPlayed && mostPlayed[1] >= 3) {
            const courseRounds = data.filter(r => r.courseName === mostPlayed[0]);
            const courseScores = courseRounds.map(r => r.totalScore);
            const firstHalf = courseScores.slice(0, Math.floor(courseScores.length / 2));
            const secondHalf = courseScores.slice(Math.floor(courseScores.length / 2));
            const firstAvg = firstHalf.reduce((a,b) => a+b, 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((a,b) => a+b, 0) / secondHalf.length;

            if (secondAvg < firstAvg - 1) {
                insights.push({
                    type: 'success', icon: '🏟️', title: `Course Mastery: ${mostPlayed[0]}`,
                    text: `You've played ${mostPlayed[0]} <strong>${mostPlayed[1]} times</strong> and your scores there have improved by <strong>${(firstAvg - secondAvg).toFixed(1)} strokes</strong>. Familiarity breeds better course management!`,
                    tip: null
                });
            }
        }

        // === 10. General Growth Encouragement ===
        if (data.length < 5) {
            insights.push({
                type: 'info', icon: '📊', title: 'Keep Building Your History',
                text: `You have ${data.length} round${data.length !== 1 ? 's' : ''} saved. As you log more rounds, your insights will become more specific and actionable. Aim for 5+ rounds to unlock full trend analysis.`,
                tip: 'After every round, save your scorecard here. Even partial rounds (9 holes) are valuable data for tracking improvement.'
            });
        }

        insights.push(...this._generateShotInsights(data));
        return insights;
    },

    _generateShotInsights(rounds) {
        const shots = rounds.flatMap(round => Object.values(round.shotsByHole || {}).flatMap(list => Array.isArray(list) ? list : [])).filter(shot => shot && Number(shot.total) > 0);
        if (!shots.length) return [];
        const results = [];
        const gpsShots = shots.filter(shot => shot.measuredBy === 'gps');
        const totalOnly = gpsShots.filter(shot => shot.carry === null || shot.carry === '' || shot.carry === undefined || !Number.isFinite(Number(shot.carry)));
        const left = shots.filter(shot => Number(shot.offline) <= -5).length;
        const right = shots.filter(shot => Number(shot.offline) >= 5).length;
        const trouble = shots.filter(shot => ['rough', 'bunker', 'water'].includes(shot.outcome)).length;
        const dominantMiss = left > right ? { side: 'left', count: left } : { side: 'right', count: right };
        if (dominantMiss.count >= 3 && dominantMiss.count / shots.length >= .35) {
            results.push({
                type: 'warning', code: 'SHOT PATTERN', title: `Recurring ${dominantMiss.side}-side miss`,
                text: `<strong>${dominantMiss.count} of ${shots.length}</strong> tracked shots finished at least five yards ${dominantMiss.side} of the intended line.`,
                tip: `Use the practice range to verify face control and starting direction. On the course, choose targets that leave room for the established ${dominantMiss.side}-side pattern.`
            });
        }
        if (trouble >= 3 && trouble / shots.length >= .3) {
            results.push({
                type: 'important', code: 'COURSE MGMT', title: 'Too many shots are finishing in recovery positions',
                text: `<strong>${trouble} of ${shots.length}</strong> tracked outcomes finished in rough, bunkers, or penalty areas.`,
                tip: 'Use a club and target that remove the nearest severe hazard from play. A longer approach from the fairway is usually preferable to a short recovery shot.'
            });
        }
        const byClub = new Map();
        shots.forEach(shot => {
            const key = String(shot.club || 'Unknown');
            if (!byClub.has(key)) byClub.set(key, []);
            byClub.get(key).push(shot);
        });
        const club = [...byClub.entries()].filter(([, list]) => list.length >= 3).map(([name, list]) => ({
            name, count: list.length,
            average: Math.round(list.reduce((sum, shot) => sum + Number(shot.total), 0) / list.length),
            dispersion: Math.round(list.reduce((sum, shot) => sum + Math.abs(Number(shot.offline) || 0), 0) / list.length)
        })).sort((a, b) => b.dispersion - a.dispersion)[0];
        if (club) {
            results.push({
                type: club.dispersion >= 18 ? 'warning' : 'success', code: 'CLUB DATA', title: `${club.name} performance profile`,
                text: `Across <strong>${club.count} tracked shots</strong>, ${esc(club.name)} averages <strong>${club.average} total yards</strong> with ${club.dispersion} yards of average offline dispersion.`,
                tip: club.dispersion >= 18 ? 'Prioritize a predictable start line and balanced finish before trying to add speed.' : null
            });
        }
        if (totalOnly.length) {
            results.push({
                type: 'info', code: 'DATA QUALITY', title: 'Carry calibration remains protected',
                text: `${totalOnly.length} GPS shot${totalOnly.length === 1 ? '' : 's'} supplied total distance without a confirmed carry. Those shots remain in replay but do not alter learned carry numbers.`,
                tip: null
            });
        }
        return results;
    },

    /* ── Handicap Calculator ────────────────────────────── */
    renderHandicap() {
        return `
            <div class="caddie-panel">
                <h2>Handicap Index Calculator</h2>
                <p class="panel-desc">Calculate your USGA/WHS (World Handicap System) Handicap Index. Enter your most recent rounds below.</p>
                
                <div style="margin-bottom: 20px; padding: 16px; background: var(--bg-secondary); border-radius: var(--radius-md);">
                    <h4 style="margin-bottom: 8px;">How the Handicap System Works</h4>
                    <p style="font-size: 0.9rem; color: var(--text-secondary); line-height: 1.6;">
                        Your <strong>Handicap Index</strong> represents your potential ability as a golfer. It's calculated using the 
                        <strong>World Handicap System (WHS)</strong> formula:<br><br>
                        <code style="background: var(--bg-tertiary); padding: 4px 8px; border-radius: 4px; font-family: 'JetBrains Mono', monospace;">
                        Score Differential = (113 ÷ Slope Rating) × (Adjusted Gross Score − Course Rating)
                        </code><br><br>
                        Your Handicap Index = Average of the best 8 out of your last 20 differentials<br>
                        If you have fewer than 20 rounds, the WHS initial-index table uses fewer differentials and may apply an adjustment.
                    </p>
                </div>
                
                <div class="handicap-form">
                    <h3 style="margin-bottom: 16px;">Enter Your Rounds</h3>
                    <div style="display: grid; grid-template-columns: auto 1fr 1fr 1fr auto; gap: 8px; margin-bottom: 8px; font-size: 0.8rem; font-weight: 700; color: var(--text-muted);">
                        <span style="width: 30px;"></span>
                        <span>Score</span>
                        <span>Course Rating</span>
                        <span>Slope Rating</span>
                        <span style="width: 30px;"></span>
                    </div>
                    <div id="roundEntries"></div>
                    <div style="display: flex; gap: 12px; margin-top: 16px;">
                        <button class="btn btn-ghost" onclick="Scoring.addRound()">+ Add Round</button>
                        <button class="btn btn-primary" onclick="Scoring.calcHandicap()">Calculate Handicap</button>
                        <button class="btn btn-ghost" onclick="Scoring.clearRounds()">Clear All</button>
                    </div>
                </div>
                
                <div id="handicapResult"></div>
                
                <div style="margin-top: 24px; padding: 16px; background: var(--bg-secondary); border-radius: var(--radius-md);">
                    <h4 style="margin-bottom: 8px;">Handicap Quick Reference</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-top: 12px;">
                        <div style="padding: 12px; background: var(--bg-card); border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-weight: 900; font-size: 1.2rem; color: var(--green-600);">0</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Scratch Golfer — shoots par</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-card); border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-weight: 900; font-size: 1.2rem; color: var(--green-600);">5-9</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Very Good — single digit!</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-card); border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-weight: 900; font-size: 1.2rem; color: var(--green-600);">10-18</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Solid — above average</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-card); border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-weight: 900; font-size: 1.2rem; color: var(--green-600);">19-28</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Average recreational golfer</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-card); border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-weight: 900; font-size: 1.2rem; color: var(--green-600);">29-36</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Beginner — great room to improve!</div>
                        </div>
                        <div style="padding: 12px; background: var(--bg-card); border-radius: var(--radius-sm); text-align: center;">
                            <div style="font-weight: 900; font-size: 1.2rem; color: var(--gold-500);">+1 to +5</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary);">Plus handicap — better than scratch!</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    addRound() {
        this.handicapRounds.push({ score: '', rating: '72.0', slope: '113' });
        this.renderRounds();
    },

    removeRound(idx) {
        this.handicapRounds.splice(idx, 1);
        this.renderRounds();
    },

    clearRounds() {
        this.handicapRounds = [];
        this.renderRounds();
        document.getElementById('handicapResult').innerHTML = '';
    },

    renderRounds() {
        const container = document.getElementById('roundEntries');
        container.innerHTML = this.handicapRounds.map((r, i) => `
            <div class="round-entry">
                <div class="round-num">${i + 1}</div>
                <input type="number" class="form-input" placeholder="Score" value="${r.score}" min="55" max="150"
                    onchange="Scoring.handicapRounds[${i}].score = this.value">
                <input type="number" class="form-input" placeholder="72.0" value="${r.rating}" step="0.1" min="60" max="80"
                    onchange="Scoring.handicapRounds[${i}].rating = this.value">
                <input type="number" class="form-input" placeholder="113" value="${r.slope}" min="55" max="155"
                    onchange="Scoring.handicapRounds[${i}].slope = this.value">
                <button class="remove-round" onclick="Scoring.removeRound(${i})">×</button>
            </div>
        `).join('');
    },

    calculateHandicap(entries) {
        const rounds = entries
            .filter(r => r.score !== '' && r.rating !== '' && r.slope !== '')
            .map(r => ({
                score: Number(r.score),
                rating: Number(r.rating),
                slope: Number(r.slope)
            }))
            .filter(r => Number.isFinite(r.score) && Number.isFinite(r.rating) && Number.isFinite(r.slope) && r.slope > 0)
            .slice(-20);

        if (rounds.length < 3) return null;

        const differentials = rounds.map(r => {
            const differential = (113 / r.slope) * (r.score - r.rating);
            return Math.round(differential * 10) / 10;
        });

        const indexed = differentials.map((value, index) => ({ value, index }))
            .sort((a, b) => a.value - b.value);
        const count = rounds.length;
        let numToUse;
        let adjustment = 0;

        if (count === 3) { numToUse = 1; adjustment = -2; }
        else if (count === 4) { numToUse = 1; adjustment = -1; }
        else if (count === 5) numToUse = 1;
        else if (count === 6) { numToUse = 2; adjustment = -1; }
        else if (count <= 8) numToUse = 2;
        else if (count <= 11) numToUse = 3;
        else if (count <= 14) numToUse = 4;
        else if (count <= 16) numToUse = 5;
        else if (count <= 18) numToUse = 6;
        else if (count === 19) numToUse = 7;
        else numToUse = 8;

        const selected = indexed.slice(0, numToUse);
        const avgDiff = selected.reduce((sum, item) => sum + item.value, 0) / numToUse;
        const handicapIndex = Math.round((avgDiff + adjustment) * 10) / 10;

        return {
            rounds,
            differentials,
            numToUse,
            adjustment,
            avgDiff,
            handicapIndex,
            usedIndices: new Set(selected.map(item => item.index))
        };
    },

    renderShotReplay(round, player) {
        const entries = Object.entries(player.shotsByHole || {}).map(([hole, shots]) => ({ hole: Number(hole), shots: Array.isArray(shots) ? shots : [] })).filter(entry => entry.shots.length).sort((a, b) => a.hole - b.hole);
        if (!entries.length) return '';
        const course = round.courseSnapshot?.holes?.length ? round.courseSnapshot : GolfData.allCourses.find(item => item.id === round.courseId);
        const totalShots = entries.reduce((sum, entry) => sum + entry.shots.length, 0);
        return `<details class="shot-replay" open>
            <summary><span>Shot map & replay</span><small>${totalShots} tracked shot${totalShots === 1 ? '' : 's'} across ${entries.length} hole${entries.length === 1 ? '' : 's'}</small></summary>
            <div class="shot-replay-grid">${entries.map(entry => this.renderReplayHole(entry.hole, entry.shots, course)).join('')}</div>
        </details>`;
    },

    renderReplayHole(holeNumber, shots, course) {
        const hole = course?.holes?.find(item => Number(item.hole) === Number(holeNumber)) || {};
        const path = Array.isArray(hole.mapGeometry?.path) ? hole.mapGeometry.path.map(point => this.normalizeGpsPoint(point)).filter(Boolean) : [];
        const targets = [hole.coordinates?.tee, hole.coordinates?.greenFront, hole.coordinates?.greenCenter || hole.coordinates?.green, hole.coordinates?.greenBack].map(point => this.normalizeGpsPoint(point)).filter(Boolean);
        const shotPoints = shots.flatMap(shot => [this.normalizeGpsPoint(shot.start), this.normalizeGpsPoint(shot.end)]).filter(Boolean);
        const points = [...path, ...targets, ...shotPoints];
        const shotRows = shots.map((shot, index) => {
            const finish = shot.offline < -2 ? `${Math.abs(Math.round(shot.offline))} yd left` : shot.offline > 2 ? `${Math.round(shot.offline)} yd right` : 'center line';
            const hasCarry = shot.carry !== null && shot.carry !== '' && shot.carry !== undefined && Number.isFinite(Number(shot.carry));
            return `<li><b>${index + 1}</b><span><strong>${esc(shot.club)}</strong><small>${hasCarry ? `${Math.round(Number(shot.carry))} carry · ` : ''}${Math.round(Number(shot.total) || 0)} total · ${esc(shot.outcome || shot.quality || 'recorded')}</small></span><em>${finish}</em></li>`;
        }).join('');
        if (points.length < 2) return `<article class="replay-hole"><header><div><span>Hole</span><strong>${holeNumber}</strong></div><small>Location path unavailable</small></header><ol class="replay-shot-list">${shotRows}</ol></article>`;
        const lats = points.map(point => point.lat), lons = points.map(point => point.lon);
        const minLat = Math.min(...lats), maxLat = Math.max(...lats), minLon = Math.min(...lons), maxLon = Math.max(...lons);
        const latPad = Math.max((maxLat - minLat) * .12, .00008), lonPad = Math.max((maxLon - minLon) * .12, .00008);
        const bounds = { minLat: minLat - latPad, maxLat: maxLat + latPad, minLon: minLon - lonPad, maxLon: maxLon + lonPad };
        const project = point => ({ x: 24 + ((point.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 472, y: 18 + ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * 204 });
        const courseLine = path.length >= 2 ? `<polyline points="${path.map(point => { const p = project(point); return `${p.x},${p.y}`; }).join(' ')}" fill="none" stroke="rgba(255,255,255,.30)" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>` : '';
        const targetMarks = targets.map((point, index) => { const p = project(point); return `<circle cx="${p.x}" cy="${p.y}" r="${index === 0 ? 6 : 8}" fill="${index === 0 ? '#d4b46a' : '#f7f5ef'}" stroke="#0d3b2e" stroke-width="3"/>`; }).join('');
        const shotLines = shots.map((shot, index) => {
            const start = this.normalizeGpsPoint(shot.start), end = this.normalizeGpsPoint(shot.end);
            if (!start || !end) return '';
            const a = project(start), b = project(end);
            return `<g><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#d4b46a" stroke-width="4" stroke-linecap="round"/><circle cx="${b.x}" cy="${b.y}" r="9" fill="#f7f5ef" stroke="#d4b46a" stroke-width="3"/><text x="${b.x}" y="${b.y + 4}" text-anchor="middle">${index + 1}</text></g>`;
        }).join('');
        return `<article class="replay-hole"><header><div><span>Hole</span><strong>${holeNumber}</strong></div><small>Par ${Number(hole.par) || '—'} · ${Number(hole.yards) || '—'} yards</small></header><svg class="shot-replay-map" viewBox="0 0 520 240" role="img" aria-label="Shot replay for hole ${holeNumber}"><rect width="520" height="240" rx="16" fill="#123f32"/><path d="M0 202 C120 150 180 220 300 144 S430 38 520 62" fill="none" stroke="rgba(255,255,255,.055)" stroke-width="105"/>${courseLine}${targetMarks}${shotLines}</svg><ol class="replay-shot-list">${shotRows}</ol></article>`;
    },

    calcHandicap() {
        const result = this.calculateHandicap(this.handicapRounds);

        if (!result) {
            document.getElementById('handicapResult').innerHTML = `
                <div class="result-box"><h3>Need at least 3 rounds to calculate</h3>
                <p class="result-detail">Enter at least 3 rounds with score, course rating, and slope rating.</p></div>`;
            return;
        }

        const { rounds, differentials, numToUse, adjustment, avgDiff, handicapIndex, usedIndices } = result;

        document.getElementById('handicapResult').innerHTML = `
            <div class="handicap-result">
                <h3 style="margin-bottom: 16px;">Your Handicap Index</h3>
                <div class="handicap-number">${handicapIndex.toFixed(1)}</div>
                <p style="margin-top: 12px; color: var(--text-secondary);">
                    Based on ${rounds.length} rounds (using best ${numToUse} differential${numToUse > 1 ? 's' : ''})
                </p>
                <div style="margin-top: 20px; text-align: left; max-width: 500px; margin-left: auto; margin-right: auto;">
                    <h4 style="margin-bottom: 8px;">Differential Breakdown</h4>
                    <table style="width: 100%; font-size: 0.85rem;">
                        <tr style="font-weight: 700; border-bottom: 2px solid var(--border-color);">
                            <td style="padding: 6px;">Round</td>
                            <td>Score</td>
                            <td>Rating/Slope</td>
                            <td>Differential</td>
                            <td>Used?</td>
                        </tr>
                        ${(() => {
                            return rounds.map((r, i) => {
                                const isUsed = usedIndices.has(i);
                                return `<tr style="border-bottom: 1px solid var(--border-color); ${isUsed ? 'background: rgba(92,160,50,0.1);' : ''}">
                                <td style="padding: 6px;">${i + 1}</td>
                                <td>${r.score}</td>
                                <td>${r.rating} / ${r.slope}</td>
                                <td style="font-weight: 700;">${differentials[i].toFixed(1)}</td>
                                <td>${isUsed ? '✅' : ''}</td>
                            </tr>`;
                            }).join('');
                        })()}
                    </table>
                </div>
                <p style="margin-top: 16px; font-size: 0.85rem; color: var(--text-muted);">
                    Average of best ${numToUse}: ${avgDiff.toFixed(1)}${adjustment ? ` ${adjustment < 0 ? '−' : '+'} ${Math.abs(adjustment).toFixed(1)} adjustment` : ''} = <strong>${handicapIndex.toFixed(1)}</strong>
                </p>
                <p style="margin-top: 8px; font-size: 0.78rem; color: var(--text-muted);">Estimate follows the WHS initial Handicap Index table and uses the most recent 20 entries. PCC, exceptional-score reductions, and caps require an authorized handicap service.</p>
            </div>
        `;
    },

    bindHandicapEvents() {
        if (this.handicapRounds.length === 0) {
            // Pre-load 5 empty rounds
            for (let i = 0; i < 5; i++) {
                this.handicapRounds.push({ score: '', rating: '72.0', slope: '113' });
            }
        }
        this.renderRounds();
    },

    /* ── Scoring Terms ──────────────────────────────────── */
    renderTerms() {
        return `
            <div class="caddie-panel">
                <h2>Golf Scoring Terms</h2>
                <p class="panel-desc">Every scoring term in golf, explained so simply that anyone can understand.</p>
                
                <div class="scoring-terms-grid">
                    ${GolfData.scoringTerms.map(term => `
                        <div class="term-card" style="border-top: 4px solid ${term.color};">
                            <div class="term-score" style="color: ${term.color};">
                                ${term.emoji} ${typeof term.score === 'number' ? (term.score > 0 ? `+${term.score}` : term.score === 0 ? 'E' : term.score) : term.score}
                            </div>
                            <div class="term-name">${term.name}</div>
                            <div class="term-desc">${term.description}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div style="margin-top: 32px;">
                    <h3 style="margin-bottom: 16px;">Understanding Par</h3>
                    <div class="card">
                        <p style="color: var(--text-secondary); line-height: 1.8;">
                            <strong>Par</strong> is the expected number of strokes for a hole. It's calculated based on the distance 
                            from the tee to the green, plus <strong>2 putts</strong>. Here's how it breaks down:<br><br>
                            <strong>Par 3</strong> (under ~250 yards): 1 shot to reach the green + 2 putts = 3 strokes<br>
                            <strong>Par 4</strong> (250-470 yards): 1 tee shot + 1 approach shot + 2 putts = 4 strokes<br>
                            <strong>Par 5</strong> (471+ yards): 1 tee shot + 2 approach shots + 2 putts = 5 strokes<br>
                            <strong>Par 6</strong> (rare, 650+ yards): exists but very uncommon<br><br>
                            A standard 18-hole course has a total par of <strong>70–72</strong>, typically with:
                            4 par-3 holes, 10 par-4 holes, and 4 par-5 holes (for a par 72).
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 24px;">
                    <h3 style="margin-bottom: 16px;">Scoring Formats</h3>
                    <div style="display: grid; gap: 16px;">
                        <div class="card">
                            <h4 style="color: var(--green-600);">Stroke Play (Medal Play)</h4>
                            <p style="color: var(--text-secondary);">The most common format. Total up ALL your strokes over 18 holes. Lowest total wins. This is how most professional tournaments work. If you shoot 72 and your opponent shoots 74, you win by 2 strokes.</p>
                        </div>
                        <div class="card">
                            <h4 style="color: var(--green-600);">Match Play</h4>
                            <p style="color: var(--text-secondary);">You compete hole-by-hole against another player. Win the hole by taking fewer strokes. Most holes won = match winner. You can be "3 up with 4 to play" meaning you're ahead by 3 holes with only 4 remaining.</p>
                        </div>
                        <div class="card">
                            <h4 style="color: var(--green-600);">Stableford</h4>
                            <p style="color: var(--text-secondary);">A points-based system where HIGHER is better. Points: Double Bogey+ = 0, Bogey = 1, Par = 2, Birdie = 3, Eagle = 4, Albatross = 5. This rewards aggressive play — there's no extra penalty for big numbers!</p>
                        </div>
                        <div class="card">
                            <h4 style="color: var(--green-600);">Scramble (Team)</h4>
                            <p style="color: var(--text-secondary);">A team format (usually 4 players). Everyone tees off, pick the best shot, everyone plays from that spot. Repeat until holed. Fun, low-pressure, and great for groups of mixed skill levels!</p>
                        </div>
                        <div class="card">
                            <h4 style="color: var(--green-600);">Best Ball (Four-Ball)</h4>
                            <p style="color: var(--text-secondary);">A team format where each player plays their own ball the entire hole. The team's score is the LOWEST individual score on each hole. Everyone plays, and the best score counts.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};
