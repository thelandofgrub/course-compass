/* =========================================================
   CourseCompass — Virtual Caddie Module
   Club selection, distance calculator, grass analyzer,
   weather impact advisor, course strategy, shot advisor
   ========================================================= */

const Caddie = {

    currentTool: 'club-selector',
    conditionStorageKey: 'coursecompass-playing-conditions',
    conditions: {
        distance: '', elevation: 0, windSpeed: 0, windDirection: 'none',
        crosswindDirection: 'cross-l', temperature: 72, altitude: 0
    },

    init() {
        this.loadConditions();
        this.bindTabs();
        this.render('club-selector');
    },

    getExperienceProfile() {
        return globalThis.CourseCompassStore?.experienceProfile || { id: 'developing', label: 'Developing', skill: 'intermediate', strategy: 'balanced', detail: 'guided' };
    },

    getDistanceUnit() {
        return globalThis.CourseCompassStore?.playerProfile?.distanceUnit === 'meters' ? 'meters' : 'yards';
    },

    displayDistanceValue(yards) {
        return Math.round(Number(yards) * (this.getDistanceUnit() === 'meters' ? 0.9144 : 1));
    },

    inputDistanceToYards(value) {
        return Math.round(Number(value) * (this.getDistanceUnit() === 'meters' ? 1.09361 : 1));
    },

    formatDistance(yards) {
        return `${this.displayDistanceValue(yards)} ${this.getDistanceUnit() === 'meters' ? 'm' : 'yd'}`;
    },

    clampNumber(value, minimum, maximum, fallback = 0) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
    },

    loadConditions() {
        try {
            const saved = JSON.parse(globalThis.sessionStorage?.getItem(this.conditionStorageKey) || 'null');
            if (!saved || typeof saved !== 'object') return;
            this.conditions = {
                distance: saved.distance === '' ? '' : this.clampNumber(saved.distance, 1, 600, ''),
                elevation: this.clampNumber(saved.elevation, -200, 200, 0),
                windSpeed: this.clampNumber(saved.windSpeed, 0, 50, 0),
                windDirection: ['none', 'head', 'tail', 'cross-l', 'cross-r'].includes(saved.windDirection) ? saved.windDirection : 'none',
                crosswindDirection: ['cross-l', 'cross-r'].includes(saved.crosswindDirection) ? saved.crosswindDirection : 'cross-l',
                temperature: this.clampNumber(saved.temperature, 0, 120, 72),
                altitude: this.clampNumber(saved.altitude, 0, 12000, 0)
            };
        } catch { /* Keep safe defaults when session data is unavailable. */ }
    },

    saveConditions() {
        try { globalThis.sessionStorage?.setItem(this.conditionStorageKey, JSON.stringify(this.conditions)); } catch { /* Optional session convenience only. */ }
    },

    calculateShotPlan(input = {}) {
        const distance = this.clampNumber(input.distance ?? this.conditions.distance, 1, 600, 0);
        const elevation = this.clampNumber(input.elevation ?? this.conditions.elevation, -200, 200, 0);
        const windSpeed = this.clampNumber(input.windSpeed ?? this.conditions.windSpeed, 0, 50, 0);
        const windDirection = ['none', 'head', 'tail', 'cross-l', 'cross-r'].includes(input.windDirection)
            ? input.windDirection : this.conditions.windDirection;
        const temperature = this.clampNumber(input.temperature ?? this.conditions.temperature, 0, 120, 72);
        const altitude = this.clampNumber(input.altitude ?? this.conditions.altitude, 0, 12000, 0);
        const lie = input.lie || 'fairway';
        let adjusted = distance;
        let drift = 0;
        let aimDirection = '';
        const factors = [];

        if (elevation !== 0) {
            const amount = Math.round(elevation / 3);
            adjusted += amount;
            factors.push(`Elevation ${elevation > 0 ? '(uphill)' : '(downhill)'}: ${amount > 0 ? '+' : ''}${amount} yds`);
        }
        if (windSpeed > 0 && windDirection !== 'none') {
            if (windDirection === 'head') {
                const amount = Math.round(distance * windSpeed * 0.01);
                adjusted += amount;
                factors.push(`Headwind ${windSpeed} mph: +${amount} yds`);
            } else if (windDirection === 'tail') {
                const amount = Math.round(distance * windSpeed * 0.005);
                adjusted -= amount;
                factors.push(`Tailwind ${windSpeed} mph: -${amount} yds`);
            } else {
                drift = Math.round(windSpeed * 1.2);
                aimDirection = windDirection === 'cross-l' ? 'left' : 'right';
                factors.push(`Crosswind ${windSpeed} mph: aim about ${drift} yds ${aimDirection}`);
            }
        }
        if (temperature !== 72) {
            const amount = Math.round((temperature - 72) * 0.2);
            adjusted -= amount;
            factors.push(`Temperature ${temperature}°F: ${amount > 0 ? '-' : '+'}${Math.abs(amount)} yds`);
        }
        if (altitude > 500) {
            const amount = Math.round(distance * (altitude / 1000) * 0.02);
            adjusted -= amount;
            factors.push(`Altitude ${altitude} ft: -${amount} yds`);
        }

        const lieAdjustments = {
            rough: [1.08, '+8% from rough'],
            'deep-rough': [1.20, '+20% from deep rough'],
            uphill: [1.10, '+10% for uphill lie'],
            downhill: [0.92, '-8% for downhill lie'],
            'bunker-fairway': [1.10, '+10% from fairway bunker']
        };
        if (lieAdjustments[lie]) {
            const [multiplier, label] = lieAdjustments[lie];
            adjusted *= multiplier;
            factors.push(label);
        }

        const effectiveDistance = Math.max(1, Math.min(700, Math.round(adjusted)));
        return { distance, effectiveDistance, difference: effectiveDistance - distance, factors, drift, aimDirection };
    },

    clubWindToConditions(value) {
        const mapping = {
            none: { windSpeed: 0, windDirection: 'none' },
            'headwind-light': { windSpeed: 8, windDirection: 'head' },
            'headwind-moderate': { windSpeed: 12, windDirection: 'head' },
            'headwind-strong': { windSpeed: 20, windDirection: 'head' },
            'tailwind-light': { windSpeed: 8, windDirection: 'tail' },
            'tailwind-moderate': { windSpeed: 12, windDirection: 'tail' },
            'tailwind-strong': { windSpeed: 20, windDirection: 'tail' },
            crosswind: { windSpeed: this.conditions.windSpeed > 0 ? this.conditions.windSpeed : 10, windDirection: this.conditions.crosswindDirection }
        };
        return mapping[value] || mapping.none;
    },

    conditionsToClubWind() {
        const { windSpeed, windDirection } = this.conditions;
        if (windSpeed <= 0 || windDirection === 'none') return 'none';
        if (windDirection === 'head') return windSpeed <= 10 ? 'headwind-light' : windSpeed <= 14 ? 'headwind-moderate' : 'headwind-strong';
        if (windDirection === 'tail') return windSpeed <= 10 ? 'tailwind-light' : windSpeed <= 14 ? 'tailwind-moderate' : 'tailwind-strong';
        return 'crosswind';
    },

    clubAltitudeToFeet(value) {
        return value === 'high' ? 6000 : value === 'mid' ? 4000 : 0;
    },

    feetToClubAltitude(value = this.conditions.altitude) {
        return value >= 5000 ? 'high' : value >= 2000 ? 'mid' : 'sea';
    },

    bindTabs() {
        document.querySelectorAll('.caddie-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.caddie-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentTool = tab.dataset.caddie;
                this.render(this.currentTool);
            });
        });
    },

    render(tool) {
        const container = document.getElementById('caddieContent');
        if (!container) return;
        switch (tool) {
            case 'club-selector':    container.innerHTML = this.renderClubSelector(); break;
            case 'distance-calc':    container.innerHTML = this.renderDistanceCalc(); break;
            case 'grass-analyzer':   container.innerHTML = this.renderGrassAnalyzer(); break;
            case 'weather-advisor':  container.innerHTML = this.renderWeatherAdvisor(); break;
            case 'course-strategy':  container.innerHTML = this.renderCourseStrategy(); break;
            case 'shot-advisor':     container.innerHTML = this.renderShotAdvisor(); break;
        }
        this.bindEvents(tool);
    },

    /* ── Club Selector ──────────────────────────────────── */
    getDefaultBag(skill = 'intermediate', reference = 'neutral') {
        const profile = globalThis.CourseCompassStore?.playerProfile || {};
        const driver = (GolfData.clubs || []).find(club => club.name === 'Driver');
        const neutralDriver = Math.round(((Number(driver?.avgDistanceMale?.[skill]) || 0) + (Number(driver?.avgDistanceFemale?.[skill]) || 0)) / 2) || 200;
        const scale = reference === 'neutral' && Number(profile.driverCarry) ? Number(profile.driverCarry) / neutralDriver : 1;
        const dispersionByType = { wood: 24, hybrid: 18, iron: 15, wedge: 12 };
        const clubs = {};
        GolfData.clubs.filter(club => club.type !== 'putter').forEach(club => {
            const male = Number(club.avgDistanceMale?.[skill]);
            const female = Number(club.avgDistanceFemale?.[skill]);
            const referenceCarry = reference === 'female' ? female : reference === 'male' ? male : Math.round((male + female) / 2);
            const carry = Math.round(referenceCarry * scale);
            if (!carry) return;
            clubs[club.name] = {
                enabled: true,
                carry,
                total: carry + (club.type === 'wood' ? 12 : club.type === 'hybrid' ? 7 : club.type === 'iron' ? 5 : 2),
                dispersion: dispersionByType[club.type] || 15
            };
        });
        return { version: 1, clubs, baselineSource: Number(profile.driverCarry) && reference === 'neutral' ? 'driver-carry' : reference === 'neutral' ? 'proficiency-average' : `${reference}-legacy-table` };
    },

    calculateLearnedClubStats(shots, clubName) {
        const eligible = (Array.isArray(shots) ? shots : [])
            .filter(shot => shot.club === clubName && shot.quality !== 'mishit' && shot.lie !== 'rough')
            .slice(-20);
        if (eligible.length < 3) return null;

        const median = values => {
            const sorted = [...values].sort((a, b) => a - b);
            const middle = Math.floor(sorted.length / 2);
            return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
        };
        const carryMedian = median(eligible.map(shot => Number(shot.carry)));
        const mad = median(eligible.map(shot => Math.abs(Number(shot.carry) - carryMedian)));
        const outlierLimit = Math.max(12, mad * 2.5);
        const accepted = eligible.filter(shot => Math.abs(Number(shot.carry) - carryMedian) <= outlierLimit);
        if (accepted.length < 3) return null;

        const average = key => Math.round(accepted.reduce((sum, shot) => sum + Number(shot[key]), 0) / accepted.length);
        const offline = accepted.map(shot => Math.abs(Number(shot.offline))).sort((a, b) => a - b);
        const percentileIndex = Math.min(offline.length - 1, Math.ceil(offline.length * 0.8) - 1);
        return {
            carry: average('carry'),
            total: average('total'),
            dispersion: Math.max(1, Math.round(offline[percentileIndex] || 1)),
            sampleCount: accepted.length,
            excludedCount: eligible.length - accepted.length,
            confidence: accepted.length >= 8 ? 'reliable' : 'developing'
        };
    },

    getActiveBag(skill, reference = 'neutral') {
        const base = GolfData.clubProfile || this.getDefaultBag(skill, reference);
        const baseSource = GolfData.clubProfile ? 'profile' : base.baselineSource === 'driver-carry' ? 'baseline' : 'estimate';
        const clubs = {};
        Object.entries(base.clubs).forEach(([name, values]) => { clubs[name] = { ...values, source: values.source || baseSource }; });
        const shots = GolfData.clubShotHistory || [];
        Object.keys(clubs).forEach(name => {
            const learned = this.calculateLearnedClubStats(shots, name);
            if (learned) clubs[name] = { ...clubs[name], ...learned, source: 'learned' };
        });
        return { version: 1, clubs };
    },

    renderBagEditor(skill = 'intermediate', reference = 'neutral') {
        const unit = this.getDistanceUnit() === 'meters' ? 'm' : 'yd';
        const saved = GolfData.clubProfile;
        const defaults = this.getDefaultBag(skill, reference);
        const bag = saved || defaults;
        const rows = GolfData.clubs.filter(club => club.type !== 'putter').map((club, index) => {
            const values = bag.clubs[club.name] || defaults.clubs[club.name];
            return `
                <div class="bag-row" data-club-index="${index}">
                    <label class="bag-club-toggle">
                        <input type="checkbox" class="bag-enabled" ${values.enabled !== false ? 'checked' : ''}>
                        <span>${club.emoji} ${club.name}</span>
                    </label>
                    <label>Carry ${unit}<input type="number" class="form-input bag-carry" min="1" max="${unit === 'm' ? '366' : '400'}" value="${this.displayDistanceValue(values.carry)}"></label>
                    <label>Total ${unit}<input type="number" class="form-input bag-total" min="1" max="${unit === 'm' ? '411' : '450'}" value="${this.displayDistanceValue(values.total)}"></label>
                    <label>Dispersion +/- ${unit}<input type="number" class="form-input bag-dispersion" min="1" max="${unit === 'm' ? '91' : '100'}" value="${this.displayDistanceValue(values.dispersion)}"></label>
                </div>`;
        }).join('');

        return `
            <details class="personal-bag" ${saved ? 'open' : ''}>
                <summary><strong>My Bag</strong> <span class="bag-status ${saved ? 'active' : ''}">${saved ? 'Personal distances active' : defaults.baselineSource === 'driver-carry' ? 'Scaled from your driver carry' : 'Using proficiency estimates'}</span></summary>
                <p class="text-sm bag-help">Enter your normal carry, expected total distance, and typical left/right dispersion in ${this.getDistanceUnit()}. Uncheck clubs you do not carry.</p>
                <div class="bag-table">
                    <div class="bag-row bag-header"><span>Club</span><span>Carry</span><span>Total</span><span>Dispersion</span></div>
                    ${rows}
                </div>
                <div class="bag-actions">
                    <button type="button" class="btn btn-primary" onclick="Caddie.savePersonalBag()">Save My Bag</button>
                    <button type="button" class="btn btn-secondary" onclick="Caddie.loadBagDefaults()">Load Selected Defaults</button>
                    ${saved ? '<button type="button" class="btn btn-secondary" onclick="Caddie.clearPersonalBag()">Clear Personal Bag</button>' : ''}
                </div>
                <div id="bagMessage" class="text-sm" aria-live="polite"></div>
            </details>`;
    },

    renderShotLearning() {
        const unit = this.getDistanceUnit() === 'meters' ? 'meters' : 'yards';
        const shortUnit = unit === 'meters' ? 'm' : 'yd';
        const shots = GolfData.clubShotHistory || [];
        const clubs = GolfData.clubs.filter(club => club.type !== 'putter');
        const learned = clubs.map(club => ({ club, stats: this.calculateLearnedClubStats(shots, club.name) }))
            .filter(item => item.stats);
        const clubOptions = clubs.map(club => `<option value="${club.name}">${club.name}</option>`).join('');
        const summary = learned.length ? learned.map(({ club, stats }) => `
            <div class="learned-club-card">
                <strong>${club.emoji} ${club.name}</strong>
                <span>${this.formatDistance(stats.carry)} carry / ${this.formatDistance(stats.total)} total</span>
                <span>+/-${this.formatDistance(stats.dispersion)} · ${stats.sampleCount} shots · ${stats.confidence}</span>
            </div>`).join('') : '<p class="text-sm learning-empty">Log three solid or normal shots for a club to unlock learned distances.</p>';
        const recent = shots.slice(-10).reverse().map(shot => {
            const direction = shot.offline < 0 ? `${this.formatDistance(Math.abs(shot.offline))} L` : shot.offline > 0 ? `${this.formatDistance(shot.offline)} R` : 'center';
            const context = shot.source === 'round' && shot.courseName
                ? `${esc(shot.courseName)}${shot.hole ? ` · Hole ${shot.hole}` : ''}`
                : (shot.date ? shot.date.slice(0, 10) : 'Saved shot');
            return `
                <div class="shot-history-row">
                    <span><strong>${shot.club}</strong><small>${context}</small></span>
                    <span>${this.formatDistance(shot.carry)} carry / ${this.formatDistance(shot.total)} total</span>
                    <span>${direction} · ${shot.lie} · ${shot.quality}</span>
                    <button type="button" class="btn-danger-sm" onclick="Caddie.deleteLoggedShot('${shot.id}')" aria-label="Delete ${shot.club} shot">Delete</button>
                </div>`;
        }).join('');

        return `
            <details class="shot-learning" ${shots.length ? 'open' : ''}>
                <summary><strong>Shot Learning</strong> <span class="bag-status ${learned.length ? 'active' : ''}">${shots.length} logged · ${learned.length} learned clubs</span></summary>
                <p class="text-sm bag-help">Log measured shots from the range or course. Mishits and rough shots stay in history but do not change your baseline. The most recent 20 eligible shots are used, with distance outliers removed.</p>
                <div class="shot-log-form">
                    <label>Club<select class="form-select" id="shotClub">${clubOptions}</select></label>
                    <label>Carry ${unit}<input type="number" class="form-input" id="shotCarry" min="1" max="${shortUnit === 'm' ? '366' : '400'}" placeholder="e.g., ${shortUnit === 'm' ? '140' : '153'}"></label>
                    <label>Total ${unit}<input type="number" class="form-input" id="shotTotal" min="1" max="${shortUnit === 'm' ? '411' : '450'}" placeholder="e.g., ${shortUnit === 'm' ? '144' : '158'}"></label>
                    <label>Finish<select class="form-select" id="shotDirection"><option value="0">Center</option><option value="-1">Left</option><option value="1">Right</option></select></label>
                    <label>Offline ${unit}<input type="number" class="form-input" id="shotOffline" min="0" max="${shortUnit === 'm' ? '91' : '100'}" value="0"></label>
                    <label>Lie<select class="form-select" id="shotLie"><option value="range">Range</option><option value="fairway">Fairway</option><option value="tee">Tee</option><option value="rough">Rough</option></select></label>
                    <label>Strike<select class="form-select" id="shotQuality"><option value="normal">Normal</option><option value="solid">Solid</option><option value="mishit">Mishit</option></select></label>
                </div>
                <button type="button" class="btn btn-primary" onclick="Caddie.logClubShot()">Log Shot</button>
                <div id="shotMessage" class="text-sm" aria-live="polite"></div>
                <h4 class="learning-heading">Learned Distances</h4>
                <div class="learned-club-grid">${summary}</div>
                ${learned.length ? '<button type="button" class="btn btn-secondary mt-3" onclick="Caddie.applyLearnedBag()">Apply Learned Values to My Bag</button>' : ''}
                ${recent ? `<h4 class="learning-heading">Recent Shots</h4><div class="shot-history">${recent}</div>` : ''}
                ${shots.length ? '<button type="button" class="btn btn-secondary mt-3" onclick="Caddie.clearLoggedShots()">Clear Shot History</button>' : ''}
            </details>`;
    },

    calibrationClubs() {
        const clubs = GolfData.clubs.filter(club => club.type !== 'putter');
        return [clubs.find(club => /^driver$/i.test(club.name)), clubs.find(club => /^7[- ]?iron/i.test(club.name)), clubs.find(club => /pitching wedge/i.test(club.name))].filter(Boolean).map(club => club.name);
    },

    getCalibrationSession() {
        const saved = globalThis.CourseCompassStore?.getJSON?.(CourseCompassStore.keys.calibrationSession, null);
        const clubs = this.calibrationClubs();
        if (!saved || !Array.isArray(saved.clubs) || !saved.clubs.every(name => clubs.includes(name))) return null;
        return { ...saved, currentIndex: Math.max(0, Math.min(clubs.length, Number(saved.currentIndex) || 0)), samples: saved.samples && typeof saved.samples === 'object' ? saved.samples : {} };
    },

    startCalibration() {
        const clubs = this.calibrationClubs();
        if (!clubs.length) return;
        CourseCompassStore.setJSON(CourseCompassStore.keys.calibrationSession, { version: 1, clubs, currentIndex: 0, samples: {}, startedAt: new Date().toISOString(), completedAt: '' }, { silent: true });
        this.render('club-selector');
    },

    cancelCalibration() {
        CourseCompassStore.remove(CourseCompassStore.keys.calibrationSession, { silent: true });
        this.render('club-selector');
    },

    recordCalibrationShot() {
        const session = this.getCalibrationSession();
        const club = session?.clubs?.[session.currentIndex];
        const carry = this.inputDistanceToYards(document.getElementById('calibrationCarry')?.value);
        const offline = this.inputDistanceToYards(document.getElementById('calibrationOffline')?.value || 0);
        if (!club || !Number.isFinite(carry) || carry < 20 || carry > 400 || !Number.isFinite(offline) || offline < 0 || offline > 100) {
            const message = document.getElementById('calibrationMessage');
            if (message) message.textContent = 'Enter a realistic carry and offline distance.';
            return false;
        }
        GolfData.addClubShot({ club, carry, total: Math.min(450, carry + (/driver|wood/i.test(club) ? 12 : 4)), offline, lie: 'range', quality: 'normal', source: 'calibration' });
        session.samples[club] = (Number(session.samples[club]) || 0) + 1;
        if (session.samples[club] >= 3) session.currentIndex += 1;
        if (session.currentIndex >= session.clubs.length) session.completedAt = new Date().toISOString();
        CourseCompassStore.setJSON(CourseCompassStore.keys.calibrationSession, session, { silent: true });
        if (session.completedAt) this.applyLearnedBag();
        else this.render('club-selector');
        return true;
    },

    renderCalibrationGuide() {
        const session = this.getCalibrationSession();
        if (!session) return `<section class="calibration-guide"><div><span class="eyebrow">Guided setup</span><h3>Calibrate three anchor clubs</h3><p>Record three representative carries with Driver, 7-Iron, and Pitching Wedge. CourseCompass rejects mishits from normal learning and uses these anchors to improve My Bag.</p></div><button type="button" class="btn btn-primary" onclick="Caddie.startCalibration()">Start Calibration</button></section>`;
        const completed = Boolean(session.completedAt);
        const club = session.clubs[session.currentIndex];
        const completedShots = Object.values(session.samples).reduce((sum, value) => sum + Math.min(3, Number(value) || 0), 0);
        if (completed) return `<section class="calibration-guide complete"><div><span class="eyebrow">Calibration complete</span><h3>Anchor-club baseline saved</h3><p>Nine representative shots were added to Shot Learning and applied to My Bag. Continue logging shots to refine the remaining clubs.</p></div><button type="button" class="btn btn-secondary" onclick="Caddie.cancelCalibration()">Close</button></section>`;
        return `<section class="calibration-guide active"><header><div><span class="eyebrow">Guided calibration</span><h3>${esc(club)} · Shot ${(Number(session.samples[club]) || 0) + 1} of 3</h3></div><strong>${completedShots}/9</strong></header><div class="calibration-progress"><span style="width:${Math.round(completedShots / 9 * 100)}%"></span></div><p>Use a normal, playable swing. Skip obvious mishits instead of entering them.</p><div class="calibration-inputs"><label>Carry (${this.getDistanceUnit()})<input class="form-input" id="calibrationCarry" type="number" min="20" max="${this.getDistanceUnit() === 'meters' ? 366 : 400}"></label><label>Offline (${this.getDistanceUnit()})<input class="form-input" id="calibrationOffline" type="number" min="0" max="${this.getDistanceUnit() === 'meters' ? 91 : 100}" value="0"></label><button type="button" class="btn btn-primary" onclick="Caddie.recordCalibrationShot()">Accept Shot</button><button type="button" class="btn btn-ghost" onclick="Caddie.cancelCalibration()">Cancel</button></div><div id="calibrationMessage" class="text-sm" aria-live="polite"></div></section>`;
    },

    renderClubSelector() {
        const experience = this.getExperienceProfile();
        const distanceUnit = this.getDistanceUnit();
        const baseline = globalThis.CourseCompassStore?.playerProfile?.driverCarry;
        return `
            <div class="caddie-panel">
                <h2>Smart Club Selector</h2>
                <p class="panel-desc">Tell me your situation and I'll build a recommendation for the shot. <span class="experience-chip">${experience.label} guidance</span></p>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Distance to Target (${distanceUnit})</label>
                        <input type="number" class="form-input" id="csDistance" placeholder="e.g., ${distanceUnit === 'meters' ? '137' : '150'}" min="1" max="${distanceUnit === 'meters' ? '549' : '600'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Your Skill Level</label>
                        <select class="form-select" id="csSkill">
                            <option value="beginner" ${experience.skill === 'beginner' ? 'selected' : ''}>Beginner</option>
                            <option value="intermediate" ${experience.skill === 'intermediate' ? 'selected' : ''}>Intermediate</option>
                            <option value="advanced" ${experience.skill === 'advanced' ? 'selected' : ''}>Advanced</option>
                            <option value="pro" ${experience.skill === 'pro' ? 'selected' : ''}>Professional</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Starting Distance Baseline</label>
                        <input type="hidden" id="csGender" value="neutral">
                        <div class="profile-baseline-readout"><strong>${baseline ? this.formatDistance(baseline) + ' driver carry' : experience.label + ' proficiency estimate'}</strong><span>My Bag and learned shots override this baseline.</span></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Lie / Situation</label>
                        <select class="form-select" id="csLie">
                            <option value="fairway">Fairway (clean lie)</option>
                            <option value="rough">Rough</option>
                            <option value="deep-rough">Deep Rough</option>
                            <option value="bunker-fairway">Fairway Bunker</option>
                            <option value="bunker-green">Greenside Bunker</option>
                            <option value="tee">Tee Box</option>
                            <option value="uphill">Uphill Lie</option>
                            <option value="downhill">Downhill Lie</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Wind Condition</label>
                        <select class="form-select" id="csWind">
                            <option value="none">No Wind</option>
                            <option value="headwind-light">Light Headwind (1-10 mph)</option>
                            <option value="headwind-moderate">Moderate Headwind (11-14 mph)</option>
                            <option value="headwind-strong">Strong Headwind (15+ mph)</option>
                            <option value="tailwind-light">Light Tailwind (1-10 mph)</option>
                            <option value="tailwind-moderate">Moderate Tailwind (11-14 mph)</option>
                            <option value="tailwind-strong">Strong Tailwind (15+ mph)</option>
                            <option value="crosswind">Crosswind</option>
                        </select>
                        <label class="condition-subfield hidden" id="csCrossDirGroup">Crosswind direction
                            <select class="form-select" id="csCrossDir">
                                <option value="cross-l">Left to right</option>
                                <option value="cross-r">Right to left</option>
                            </select>
                        </label>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Altitude</label>
                        <select class="form-select" id="csAlt">
                            <option value="sea">Sea Level (0-1,000 ft)</option>
                            <option value="mid">Mid Altitude (3,000-5,000 ft)</option>
                            <option value="high">High Altitude (5,000+ ft)</option>
                        </select>
                    </div>
                </div>
                <p class="condition-sync-note">Distance, wind, and altitude stay synchronized with the Distance Calculator.</p>
                <div class="form-group mt-3">
                    <label class="form-label">Recommendation Style</label>
                    <select class="form-select" id="csStrategy">
                        <option value="balanced" ${experience.strategy === 'balanced' ? 'selected' : ''}>Balanced</option>
                        <option value="conservative" ${experience.strategy === 'conservative' ? 'selected' : ''}>Conservative (favor more carry and tighter dispersion)</option>
                        <option value="aggressive">Aggressive (favor the closest number)</option>
                    </select>
                </div>
                ${this.renderCalibrationGuide()}
                ${this.renderBagEditor(experience.skill, 'neutral')}
                ${this.renderShotLearning()}
                <button class="btn btn-primary btn-lg btn-block" onclick="Caddie.calculateClub()">Recommend Club</button>

                <div id="clubResult" class="mt-3"></div>
                
                <h3 class="mt-4" style="margin-bottom: 12px;">Full Club Distance Chart</h3>
                <p class="text-sm" style="color: var(--text-secondary); margin-bottom: 16px;">Personal distances are used when My Bag is saved; otherwise the selected skill-level estimates are shown.</p>
                <div class="club-grid" id="clubChart"></div>
            </div>
        `;
    },

    calculateClub() {
        const displayDistance = parseInt(document.getElementById('csDistance').value);
        const distance = this.inputDistanceToYards(displayDistance);
        const skill = document.getElementById('csSkill').value;
        const gender = document.getElementById('csGender').value;
        const lie = document.getElementById('csLie').value;
        const wind = document.getElementById('csWind').value;
        const alt = document.getElementById('csAlt').value;
        const strategy = document.getElementById('csStrategy')?.value || 'balanced';

        if (!displayDistance || distance < 1) {
            document.getElementById('clubResult').innerHTML = `
                <div class="result-box"><h3>Please enter a valid distance</h3></div>`;
            return;
        }

        const shotPlan = this.calculateShotPlan({ distance, lie });
        const effectiveDistance = shotPlan.effectiveDistance;
        const adjustments = shotPlan.factors;

        // Special cases
        if (lie === 'bunker-green') {
            document.getElementById('clubResult').innerHTML = `
                <div class="result-box">
                    <h3>Greenside Bunker Recommendation</h3>
                    <div class="result-primary">Sand Wedge (54°-56°)</div>
                    <div class="result-detail">
                        <p><strong>For most greenside bunker shots, your Sand Wedge is the go-to club.</strong></p>
                        <ul>
                            <li>Open the face before gripping</li>
                            <li>Aim 2 inches behind the ball</li>
                            <li>Hit the sand, not the ball — let the sand carry it out</li>
                            <li>For a short bunker shot (under 10 yards): use your Lob Wedge with a very open face</li>
                            <li>For a longer bunker shot (30+ yards): use a Gap Wedge with a square face</li>
                        </ul>
                    </div>
                </div>`;
            return;
        }

        // Learned shot data overlays the saved bag; skill-level values remain the fallback.
        const personalBag = this.getActiveBag(skill, gender);
        const top3 = this.getClubRecommendations({
            effectiveDistance, skill, gender, lie, strategy, bag: personalBag
        }).slice(0, 3);
        const bestClub = top3[0];

        if (!bestClub) {
            document.getElementById('clubResult').innerHTML = `
                <div class="result-box"><h3>No eligible clubs</h3><p>Enable at least one suitable club in My Bag, then save it.</p></div>`;
            return;
        }

        let advice = '';
        const handedness = globalThis.CourseCompassStore?.playerProfile?.handedness || 'right';
        const drawSide = handedness === 'left' ? 'right' : 'left';
        const fadeSide = handedness === 'left' ? 'left' : 'right';
        if (lie === 'rough') advice = 'From the rough, the grass may grab your club. Grip slightly firmer and swing through aggressively.';
        if (lie === 'deep-rough') advice = 'In deep rough, consider just getting back to the fairway. Use a high-lofted club and don\'t try to be a hero.';
        if (lie === 'uphill') advice = `The ball will fly higher than normal from an uphill lie. A draw tendency curves ${drawSide} for your ${handedness}-handed setup.`;
        if (lie === 'downhill') advice = `The ball will fly lower from a downhill lie. A fade tendency curves ${fadeSide} for your ${handedness}-handed setup.`;
        if (wind.includes('headwind')) advice += ' Into the wind, swing smooth — don\'t swing harder! A harder swing creates more spin which makes the ball balloon up.';

        document.getElementById('clubResult').innerHTML = `
            <div class="result-box">
                <h3>Club Recommendation</h3>
                <div class="result-primary">${bestClub.club.emoji} ${bestClub.club.name}</div>
                <div class="result-detail">
                    <p><strong>Your distance:</strong> ${this.formatDistance(distance)} | <strong>Plays like:</strong> ${this.formatDistance(effectiveDistance)}</p>
                    <p><strong>${bestClub.source === 'learned' ? `Learned from ${bestClub.sampleCount} shots` : GolfData.clubProfile ? 'Your saved carry' : bestClub.source === 'baseline' ? 'Scaled from your driver carry' : 'Estimated carry'}:</strong> ${this.formatDistance(bestClub.carry)} | <strong>Expected total:</strong> ${this.formatDistance(bestClub.total)}</p>
                    <p><strong>Typical dispersion:</strong> +/-${this.formatDistance(bestClub.dispersion)} | <strong>Style:</strong> ${strategy}</p>
                    ${adjustments.length > 0 ? `<p><strong>Adjustments:</strong> ${adjustments.join(', ')}</p>` : ''}
                    ${advice ? `<p><strong>Caddie Tip:</strong> ${advice}</p>` : ''}
                    <p style="margin-top: 12px;"><strong>Alternatives:</strong></p>
                    <ul>
                        ${top3.slice(1).map(r => `<li>${r.club.emoji} ${r.club.name} (${this.formatDistance(r.carry)} carry / ${this.formatDistance(r.total)} total, +/-${this.formatDistance(r.dispersion)}) — ${r.carry > effectiveDistance ? 'take a controlled swing' : 'requires a committed swing'}</li>`).join('')}
                    </ul>
                    <p style="margin-top: 8px; font-style: italic;">"${bestClub.club.tips}"</p>
                </div>
            </div>`;

        // Also render the club chart
        this.renderClubChart(skill, gender);
    },

    getClubRecommendations({ effectiveDistance, skill = 'intermediate', gender = 'male', lie = 'fairway', strategy = 'balanced', bag = null }) {
        const sourceBag = bag || this.getDefaultBag(skill, gender);
        const restrictedTypes = lie === 'deep-rough' || lie === 'bunker-fairway' ? new Set(['wood']) : new Set();

        return GolfData.clubs
            .filter(club => club.type !== 'putter' && !(club.name === 'Driver' && lie !== 'tee') && !restrictedTypes.has(club.type))
            .map(club => {
                const values = sourceBag.clubs?.[club.name];
                if (!values || values.enabled === false) return null;
                const carry = Number(values.carry);
                if (!Number.isFinite(carry) || carry < 1) return null;
                const total = Number.isFinite(Number(values.total)) ? Number(values.total) : carry;
                const dispersion = Number.isFinite(Number(values.dispersion)) ? Number(values.dispersion) : 15;
                const distanceGap = Math.abs(carry - effectiveDistance);
                let score = distanceGap + (dispersion * 0.08);
                if (strategy === 'conservative') {
                    score = distanceGap + (dispersion * 0.25) + (carry < effectiveDistance ? 6 : 0);
                } else if (strategy === 'aggressive') {
                    score = distanceGap + (dispersion * 0.02);
                }
                return { club, carry, total, dispersion, distanceGap, score, source: values.source || 'profile', sampleCount: values.sampleCount || 0 };
            })
            .filter(Boolean)
            .sort((a, b) => a.score - b.score || a.distanceGap - b.distanceGap);
    },

    logClubShot() {
        const club = document.getElementById('shotClub')?.value;
        const carry = this.inputDistanceToYards(document.getElementById('shotCarry')?.value);
        const totalInput = document.getElementById('shotTotal')?.value;
        const total = totalInput === '' ? carry : this.inputDistanceToYards(totalInput);
        const offlineMagnitude = this.inputDistanceToYards(document.getElementById('shotOffline')?.value);
        const direction = Number(document.getElementById('shotDirection')?.value);
        const lie = document.getElementById('shotLie')?.value;
        const quality = document.getElementById('shotQuality')?.value;
        const validClub = GolfData.clubs.some(item => item.name === club && item.type !== 'putter');

        if (!validClub || !Number.isFinite(carry) || carry < 1 || carry > 400 ||
            !Number.isFinite(total) || total < carry || total > 450 ||
            !Number.isFinite(offlineMagnitude) || offlineMagnitude < 0 || offlineMagnitude > 100) {
            const message = document.getElementById('shotMessage');
            if (message) message.textContent = `Enter a valid carry, a total at least as long as carry, and no more than ${this.formatDistance(100)} offline.`;
            return false;
        }

        GolfData.addClubShot({
            club,
            carry: Math.round(carry),
            total: Math.round(total),
            offline: Math.round(offlineMagnitude * direction),
            lie,
            quality
        });
        this.render('club-selector');
        const message = document.getElementById('shotMessage');
        if (message) message.textContent = `${club} shot logged. Three eligible shots unlock a learned distance.`;
        return true;
    },

    deleteLoggedShot(id) {
        GolfData.deleteClubShot(id);
        this.render('club-selector');
    },

    clearLoggedShots() {
        if (!confirm('Clear all logged club shots? Learned values already applied to My Bag will remain.')) return;
        GolfData.clearClubShotHistory();
        this.render('club-selector');
    },

    applyLearnedBag() {
        const skill = document.getElementById('csSkill')?.value || 'intermediate';
        const gender = document.getElementById('csGender')?.value || 'male';
        const base = GolfData.clubProfile || this.getDefaultBag(skill, gender);
        const clubs = {};
        Object.entries(base.clubs).forEach(([name, values]) => {
            const stats = this.calculateLearnedClubStats(GolfData.clubShotHistory, name);
            clubs[name] = stats
                ? { enabled: values.enabled !== false, carry: stats.carry, total: stats.total, dispersion: stats.dispersion }
                : { enabled: values.enabled !== false, carry: values.carry, total: values.total, dispersion: values.dispersion };
        });
        GolfData.clubProfile = { version: 1, clubs };
        this.render('club-selector');
        const message = document.getElementById('bagMessage');
        if (message) message.textContent = 'Learned distances have been copied into My Bag.';
    },

    savePersonalBag() {
        const rows = [...document.querySelectorAll('.bag-row[data-club-index]')];
        const availableClubs = GolfData.clubs.filter(club => club.type !== 'putter');
        const clubs = {};
        let invalid = false;

        rows.forEach(row => {
            const club = availableClubs[Number(row.dataset.clubIndex)];
            const carry = this.inputDistanceToYards(row.querySelector('.bag-carry')?.value);
            const total = this.inputDistanceToYards(row.querySelector('.bag-total')?.value);
            const dispersion = this.inputDistanceToYards(row.querySelector('.bag-dispersion')?.value);
            if (!club || !Number.isFinite(carry) || carry < 1 || carry > 400 ||
                !Number.isFinite(total) || total < carry || total > 450 ||
                !Number.isFinite(dispersion) || dispersion < 1 || dispersion > 100) {
                invalid = true;
                return;
            }
            clubs[club.name] = {
                enabled: row.querySelector('.bag-enabled')?.checked !== false,
                carry: Math.round(carry),
                total: Math.round(total),
                dispersion: Math.round(dispersion)
            };
        });

        const message = document.getElementById('bagMessage');
        if (invalid || !Object.values(clubs).some(club => club.enabled)) {
            if (message) message.textContent = invalid
                ? 'Check that every total is at least its carry and all distances are within the displayed limits.'
                : 'Enable at least one club before saving.';
            return false;
        }

        GolfData.clubProfile = { version: 1, clubs };
        if (message) message.textContent = 'Personal bag saved. New recommendations now use these distances.';
        const status = document.querySelector('.bag-status');
        if (status) {
            status.textContent = 'Personal distances active';
            status.classList.add('active');
        }
        this.renderClubChart(document.getElementById('csSkill')?.value, document.getElementById('csGender')?.value);
        return true;
    },

    loadBagDefaults() {
        const skill = document.getElementById('csSkill')?.value || 'intermediate';
        const gender = document.getElementById('csGender')?.value || 'male';
        const defaults = this.getDefaultBag(skill, gender);
        const availableClubs = GolfData.clubs.filter(club => club.type !== 'putter');
        document.querySelectorAll('.bag-row[data-club-index]').forEach(row => {
            const club = availableClubs[Number(row.dataset.clubIndex)];
            const values = defaults.clubs[club?.name];
            if (!values) return;
            row.querySelector('.bag-enabled').checked = true;
            row.querySelector('.bag-carry').value = this.displayDistanceValue(values.carry);
            row.querySelector('.bag-total').value = this.displayDistanceValue(values.total);
            row.querySelector('.bag-dispersion').value = this.displayDistanceValue(values.dispersion);
        });
        const message = document.getElementById('bagMessage');
        if (message) message.textContent = 'Selected defaults loaded. Review them, then choose Save My Bag.';
    },

    clearPersonalBag() {
        if (!confirm('Clear your saved personal club distances?')) return;
        GolfData.clearClubProfile();
        this.render('club-selector');
    },

    renderClubChart(skill = 'intermediate', gender = 'male') {
        const container = document.getElementById('clubChart');
        if (!container) return;
        const activeBag = this.getActiveBag(skill, gender);
        const hasProfile = Boolean(GolfData.clubProfile);

        container.innerHTML = GolfData.clubs.filter(c => c.type !== 'putter').map(club => {
            const personal = activeBag.clubs?.[club.name];
            const dist = personal?.carry;
            return `
                <div class="club-card ${personal?.enabled === false ? 'disabled' : ''}">
                    <div class="club-symbol" aria-hidden="true">${this.getClubSymbol(club)}</div>
                    <div class="club-name">${club.name}</div>
                    <div class="club-range">${this.formatDistance(dist)} carry${personal ? ` / ${this.formatDistance(personal.total)} total<br>+/-${this.formatDistance(personal.dispersion)}` : ''}</div>
                    <div class="club-badge">${personal?.enabled === false ? 'Not in bag' : personal?.source === 'learned' ? `Learned · ${personal.sampleCount}` : hasProfile ? 'My Bag' : 'Estimate'}</div>
                </div>
            `;
        }).join('');
    },

    getClubSymbol(club) {
        const name = String(club?.name || 'Club');
        if (/^driver$/i.test(name)) return 'D';
        const numbered = name.match(/^(\d+)\s*[- ]?(wood|hybrid|iron)/i);
        if (numbered) return `${numbered[1]}${numbered[2][0].toUpperCase() === 'I' ? 'i' : numbered[2][0].toUpperCase()}`;
        if (/pitching/i.test(name)) return 'PW';
        if (/gap/i.test(name)) return 'GW';
        if (/sand/i.test(name)) return 'SW';
        if (/lob/i.test(name)) return 'LW';
        if (/putter/i.test(name)) return 'P';
        return name.slice(0, 2).toUpperCase();
    },

    /* ── Distance Calculator ────────────────────────────── */
    renderDistanceCalc() {
        const distanceUnit = this.getDistanceUnit();
        return `
            <div class="caddie-panel">
                <h2>Adjusted Distance Calculator</h2>
                <p class="panel-desc">Calculate the "plays like" distance factoring in elevation, wind, temperature, and altitude.</p>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Actual Distance to Target (${distanceUnit})</label>
                        <input type="number" class="form-input" id="dcDistance" placeholder="e.g., ${distanceUnit === 'meters' ? '137' : '150'}" min="1" max="${distanceUnit === 'meters' ? '549' : '600'}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Elevation Change (feet)</label>
                        <input type="number" class="form-input" id="dcElevation" placeholder="+ uphill / - downhill" min="-200" max="200" value="0">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Wind Speed (mph)</label>
                        <input type="number" class="form-input" id="dcWind" placeholder="e.g., 10" min="0" max="50" value="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Wind Direction</label>
                        <select class="form-select" id="dcWindDir">
                            <option value="none">No Wind</option>
                            <option value="head">Headwind (into you)</option>
                            <option value="tail">Tailwind (with you)</option>
                            <option value="cross-l">Crosswind (left to right)</option>
                            <option value="cross-r">Crosswind (right to left)</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Temperature (°F)</label>
                        <input type="number" class="form-input" id="dcTemp" placeholder="e.g., 72" min="0" max="120" value="72">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Altitude (feet above sea level)</label>
                        <input type="number" class="form-input" id="dcAltitude" placeholder="e.g., 0" min="0" max="12000" value="0">
                    </div>
                </div>
                <p class="condition-sync-note">Changes here update the Club Selector’s matching wind category and altitude range.</p>
                <button class="btn btn-primary btn-lg btn-block" onclick="Caddie.calcDistance()">Calculate Adjusted Distance</button>
                <div id="distResult" class="mt-3"></div>
            </div>
        `;
    },

    calcDistance() {
        const displayedDistance = parseFloat(document.getElementById('dcDistance').value) || 0;
        const distance = this.inputDistanceToYards(displayedDistance);
        const elevation = parseFloat(document.getElementById('dcElevation').value) || 0;
        const windSpeed = parseFloat(document.getElementById('dcWind').value) || 0;
        const windDir = document.getElementById('dcWindDir').value;
        const temp = parseFloat(document.getElementById('dcTemp').value) || 72;
        const altitude = parseFloat(document.getElementById('dcAltitude').value) || 0;

        if (displayedDistance < 1 || distance < 1) {
            document.getElementById('distResult').innerHTML = `<div class="result-box"><h3>Please enter a valid distance</h3></div>`;
            return;
        }

        const shotPlan = this.calculateShotPlan({
            distance, elevation, windSpeed, windDirection: windDir, temperature: temp, altitude
        });
        const adjusted = shotPlan.effectiveDistance;
        const factors = shotPlan.factors;
        const diff = shotPlan.difference;

        document.getElementById('distResult').innerHTML = `
            <div class="result-box">
                <h3>Adjusted Distance Analysis</h3>
                <div class="result-primary">${this.formatDistance(adjusted)}</div>
                <div class="result-detail">
                    <p><strong>Actual distance:</strong> ${this.formatDistance(distance)}</p>
                    <p><strong>Adjusted ("plays like"):</strong> ${this.formatDistance(adjusted)} (${diff >= 0 ? '+' : ''}${this.formatDistance(Math.abs(diff))})</p>
                    ${shotPlan.drift ? `<p><strong>Crosswind aim:</strong> ${this.formatDistance(shotPlan.drift)} ${shotPlan.aimDirection} of target</p>` : ''}
                    <hr style="margin: 12px 0; border-color: var(--border-color);">
                    <p><strong>Factor Breakdown:</strong></p>
                    <ul>${factors.length ? factors.map(f => `<li>${f}</li>`).join('') : '<li>Neutral conditions — no adjustment.</li>'}</ul>
                    <p style="margin-top: 12px;"><strong>Tip:</strong> ${adjusted > distance ?
                        'The shot plays LONGER than measured. Club up — use a stronger club than your yardage chart suggests.' :
                        adjusted < distance ? 'The shot plays SHORTER than measured. Club down — use a weaker club than your yardage chart suggests.' :
                        'Conditions are neutral. Play the measured yardage.'}</p>
                </div>
            </div>`;
        return;

        /* Legacy calculation retained below for reference; the shared engine above is authoritative.
        // Elevation: approximately 1 yard per 3 feet of elevation change
        if (elevation !== 0) {
            const elevAdj = Math.round(elevation / 3);
            adjusted += elevAdj;
            factors.push(`Elevation ${elevation > 0 ? '(uphill)' : '(downhill)'}: ${elevAdj > 0 ? '+' : ''}${elevAdj} yds`);
        }

        // Wind: roughly 1% per mph for headwind, 0.5% per mph for tailwind
        if (windSpeed > 0 && windDir !== 'none') {
            let windAdj = 0;
            if (windDir === 'head') {
                windAdj = Math.round(distance * (windSpeed * 0.01));
                adjusted += windAdj;
                factors.push(`Headwind ${windSpeed} mph: +${windAdj} yds (plays longer)`);
            } else if (windDir === 'tail') {
                windAdj = Math.round(distance * (windSpeed * 0.005));
                adjusted -= windAdj;
                factors.push(`Tailwind ${windSpeed} mph: -${windAdj} yds (plays shorter)`);
            } else {
                const drift = Math.round(windSpeed * 1.2);
                factors.push(`Crosswind ${windSpeed} mph: aim ~${drift} yds ${windDir === 'cross-l' ? 'left' : 'right'} of target`);
            }
        }

        // Temperature: approximately 2 yards per 10 degrees from 72°F baseline
        if (temp !== 72) {
            const tempDiff = temp - 72;
            const tempAdj = Math.round(tempDiff * 0.2);
            adjusted -= tempAdj;
            factors.push(`Temperature ${temp}°F: ${tempAdj > 0 ? '-' : '+'}${Math.abs(tempAdj)} yds ${temp > 72 ? '(warm = farther)' : '(cold = shorter)'}`);
        }

        // Altitude: approximately 2% per 1000 feet
        if (altitude > 500) {
            const altPct = (altitude / 1000) * 0.02;
            const altAdj = Math.round(distance * altPct);
            adjusted -= altAdj;
            factors.push(`Altitude ${altitude} ft: -${altAdj} yds (ball flies farther, need less club)`);
        }

        adjusted = Math.round(adjusted);
        const diff = adjusted - distance;

        document.getElementById('distResult').innerHTML = `
            <div class="result-box">
                <h3>Adjusted Distance Analysis</h3>
                <div class="result-primary">${adjusted} yards</div>
                <div class="result-detail">
                    <p><strong>Actual distance:</strong> ${distance} yards</p>
                    <p><strong>Adjusted ("plays like"):</strong> ${adjusted} yards (${diff >= 0 ? '+' : ''}${diff} yards)</p>
                    <hr style="margin: 12px 0; border-color: var(--border-color);">
                    <p><strong>Factor Breakdown:</strong></p>
                    <ul>${factors.map(f => `<li>${f}</li>`).join('')}</ul>
                    <p style="margin-top: 12px;"><strong>Tip:</strong> ${adjusted > distance ? 
                        'The shot plays LONGER than measured. Club up — use a stronger club than your yardage chart suggests.' :
                        adjusted < distance ? 'The shot plays SHORTER than measured. Club down — use a weaker club than your yardage chart suggests.' :
                        'No significant adjustments needed. Trust your standard yardage.'
                    }</p>
                </div>
            </div>
        `;
        */
    },

    /* ── Grass Analyzer ─────────────────────────────────── */
    renderGrassAnalyzer() {
        return `
            <div class="caddie-panel">
                <h2>Lie & Turf Analysis</h2>
                <p class="panel-desc">Understanding the grass you're playing on is crucial for predicting how the ball will behave on fairways, in the rough, on the green, and in bunkers.</p>
                
                <div class="form-group">
                    <label class="form-label">Select grass type to analyze (or scroll to browse all)</label>
                    <select class="form-select" id="grassSelect" onchange="Caddie.highlightGrass()">
                        <option value="">— Browse all grass types below —</option>
                        ${GolfData.grassTypes.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}
                    </select>
                </div>
                
                <div class="grass-grid" id="grassGrid">
                    ${GolfData.grassTypes.map(grass => `
                        <div class="grass-card" id="grass-${grass.name.replace(/\s+/g, '-')}">
                            <h3>${grass.name} <span class="grass-badge">${grass.climate}</span></h3>
                            <p><em>${grass.appearance}</em></p>
                            <dl class="grass-detail">
                                <dt>On the Fairway</dt>
                                <dd>${grass.onFairway}</dd>
                                <dt>In the Rough</dt>
                                <dd>${grass.inRough}</dd>
                                <dt>On the Green</dt>
                                <dd>${grass.onGreen}</dd>
                                <dt>In/Around Bunkers</dt>
                                <dd>${grass.inBunker}</dd>
                                <dt>Pro Tip</dt>
                                <dd><strong>${grass.proTip}</strong></dd>
                                <dt>Common Courses</dt>
                                <dd>${grass.commonCourses}</dd>
                            </dl>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    highlightGrass() {
        const selected = document.getElementById('grassSelect').value;
        document.querySelectorAll('.grass-card').forEach(card => {
            card.style.border = '1px solid var(--border-color)';
            card.style.boxShadow = 'none';
        });
        if (selected) {
            const card = document.getElementById(`grass-${selected.replace(/\s+/g, '-')}`);
            if (card) {
                card.style.border = '2px solid var(--green-500)';
                card.style.boxShadow = '0 0 0 3px rgba(92,160,50,0.2)';
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    },

    /* ── Weather Advisor ────────────────────────────────── */
    renderWeatherAdvisor() {
        const weather = GolfData.weather;
        return `
            <div class="caddie-panel">
                <h2>Weather Impact</h2>
                <p class="panel-desc">How weather conditions affect your golf game — and what to do about it.</p>
                
                <div class="weather-grid">
                    ${Object.values(weather).map(w => `
                        <div class="weather-card">
                            <h3>${w.title}</h3>
                            <p>${w.overview}</p>
                            <div class="impact-meter">
                                <div class="impact-fill" style="width: ${w.impactLevel}%; background: ${w.impactColor};"></div>
                            </div>
                            <p class="text-sm mt-1" style="color: var(--text-muted);">Impact Level: ${w.impactLevel}%</p>
                            <div style="margin-top: 16px;">
                                ${w.details.map(d => `
                                    <div style="margin-bottom: 12px; padding: 10px; background: var(--bg-secondary); border-radius: var(--radius-sm);">
                                        <p style="font-weight: 700; font-size: 0.85rem; color: var(--green-600);">${d.condition}</p>
                                        <p style="font-size: 0.85rem; margin-top: 4px;">${d.effect}</p>
                                        <p style="font-size: 0.85rem; margin-top: 4px; color: var(--green-700);"><strong>Advice:</strong> ${d.advice}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    /* ── Course Strategy ────────────────────────────────── */

    // State for course viewer
    _courseState: {
        selectedCourseId: null,
        viewMode: 'full',       // 'full', 'hole', 'discover', 'open-import', or 'builder'
        currentHole: 1,
        geoDetected: false,
        geoMessage: '',
        discoveredCourses: [],   // Overpass API results
        discoverLoading: false,
        userLat: null,
        userLon: null,
        openSearchQuery: '',
        openSearchResults: [],
        openSearchLoading: false,
        openSearchError: '',
        openPreview: null,
        openPreviewLoading: false,
        openSelectedTeeId: '',
        builderCourseId: null,
        enrichLoading: false,
        enrichMessage: ''
    },

    renderCourseStrategy() {
        const courses = GolfData.allCourses;  // built-in + custom
        const customIds = new Set(GolfData.customCourses.map(c => c.id));
        const state = this._courseState;
        if (!state.selectedCourseId) state.selectedCourseId = GolfData.selectedCourseId || courses[0].id;
        const course = courses.find(c => c.id === state.selectedCourseId) || courses[0];
        state.selectedCourseId = course.id;
        GolfData.selectedCourseId = course.id;
        const holeCount = course.holes ? course.holes.length : 0;
        const front9 = holeCount ? course.holes.filter(h => h.hole <= 9) : [];
        const back9 = holeCount ? course.holes.filter(h => h.hole > 9) : [];
        const front9Par = front9.reduce((s, h) => s + h.par, 0);
        const back9Par = back9.reduce((s, h) => s + h.par, 0);
        const totalPar = front9Par + back9Par;
        const totalYards = holeCount ? course.holes.reduce((s, h) => s + h.yards, 0) : 0;

        // Group dropdown into sections
        const builtInCourses = GolfData.courses;
        const userCourses = GolfData.customCourses;

        return `
            <div class="caddie-panel">
                <h2>Course Strategy</h2>
                <p class="panel-desc">Select a course, import open scorecard data, discover nearby courses via GPS, or add your own course.</p>

                <!-- Course selection controls -->
                <div class="course-selector-bar">
                    <div class="form-group" style="flex:1; min-width:220px;">
                        <label class="form-label">Select Course</label>
                        <select class="form-select" id="courseSelect">
                            <optgroup label="Featured Courses (${builtInCourses.length})">
                                ${builtInCourses.map(c => `<option value="${esc(c.id)}" ${c.id === course.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
                            </optgroup>
                            ${userCourses.length ? `<optgroup label="My Courses (${userCourses.length})">
                                ${userCourses.map(c => `<option value="${esc(c.id)}" ${c.id === course.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}
                            </optgroup>` : ''}
                        </select>
                    </div>
                    <div class="form-group" style="flex:0 0 auto;">
                        <label class="form-label">Location</label>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-primary" id="geoDetectBtn" title="Match to nearest listed course">Nearest Listed</button>
                            <button class="btn btn-accent" id="discoverCoursesBtn" title="Find nearby golf courses via OpenStreetMap">Discover</button>
                        </div>
                    </div>
                    <div class="form-group" style="flex:0 0 auto;">
                        <label class="form-label">Actions</label>
                        <div style="display:flex; gap:6px;">
                            <button class="btn btn-accent" id="openCourseImportBtn">Open Data</button>
                            <button class="btn btn-outline" id="addCourseBtn">Add Course</button>
                            ${customIds.has(course.id) ? `<button class="btn btn-outline" id="enrichCourseBtn" title="Add free OpenStreetMap hole geometry and USGS elevation" ${state.enrichLoading || !Number.isFinite(Number(course.lat)) || !Number.isFinite(Number(course.lon)) ? 'disabled' : ''}>${state.enrichLoading ? 'Enriching…' : 'Enrich'}</button><button class="btn btn-outline" id="editCourseBtn" title="Edit this saved course">Edit</button><button class="btn btn-danger-sm" id="removeCourseBtn" title="Remove this saved course" aria-label="Remove course">Remove</button>` : ''}
                        </div>
                    </div>
                    <div class="form-group" style="flex:0 0 auto;">
                        <label class="form-label">View Mode</label>
                        <div class="view-mode-toggle">
                            <button class="view-mode-btn ${state.viewMode === 'full' ? 'active' : ''}" data-mode="full">Full</button>
                            <button class="view-mode-btn ${state.viewMode === 'hole' ? 'active' : ''}" data-mode="hole">Hole</button>
                        </div>
                    </div>
                </div>

                <div id="geoMessage" class="geo-message ${state.geoMessage ? 'show' : ''}">${esc(state.geoMessage)}</div>
                ${state.enrichMessage ? `<div class="course-enrich-status ${state.enrichLoading ? 'is-loading' : ''}" role="status">${esc(state.enrichMessage)}</div>` : ''}

                <!-- Course header info -->
                <div class="course-header-card">
                    <div class="course-header-top">
                        <div>
                            <h3 class="course-header-name">${esc(course.name)} ${customIds.has(course.id) ? `<span class="badge-custom">${course.source?.provider ? 'Open Data' : 'Custom'}</span>` : ''}</h3>
                            <p class="course-header-loc">${esc(course.location)} &nbsp;|&nbsp; ${esc(course.grass || 'Grass not listed')} &nbsp;|&nbsp; ${esc(course.style || 'Style not listed')}</p>
                        </div>
                    </div>
                    ${holeCount ? `<div class="event-info mb-3" style="margin-top:16px;">
                        <div class="event-info-card">
                            <div class="event-label">Total Par</div>
                            <div class="event-value">${totalPar}</div>
                        </div>
                        <div class="event-info-card">
                            <div class="event-label">Total Yards</div>
                            <div class="event-value">${totalYards.toLocaleString()}</div>
                        </div>
                        <div class="event-info-card">
                            <div class="event-label">Rating / Slope</div>
                            <div class="event-value">${course.rating || '—'} / ${course.slope || '—'}</div>
                        </div>
                        <div class="event-info-card">
                            <div class="event-label">Holes</div>
                            <div class="event-value">${holeCount}</div>
                        </div>
                    </div>` : `<p class="text-sm mt-2" style="color:var(--text-secondary);">This is a verified identity/catalog entry only. Its previous unproven scorecard was removed. Use <strong>Open Data</strong>, <strong>Discover</strong>, or <strong>Add Course</strong> when a licensed scorecard is available.</p>`}
                    ${this.renderCourseProvenance(course)}
                </div>

                <!-- Dynamic content area -->
                <div id="courseViewArea">
                    ${state.viewMode === 'discover' ? this.renderDiscoverPanel() :
                      state.viewMode === 'open-import' ? this.renderOpenCourseImport() :
                      state.viewMode === 'builder' ? this.renderCourseBuilder() :
                      holeCount ? (state.viewMode === 'full' ? this.renderFullCourseView(course, front9, back9) : this.renderHoleByHoleView(course)) :
                      this.renderNoCourseDataMsg()}
                </div>
            </div>
        `;
    },

    renderCourseProvenance(course) {
        const source = course?.source;
        const completeness = this.getCourseCompleteness(course);
        const coverage = this.getCourseCoverage(course);
        if (!source?.provider) return `<div class="course-provenance"><span class="source-badge">Bundled</span><div><strong>CourseCompass reference course</strong><small>${completeness}% completeness · ${coverage.mapped}/${coverage.total} mapped holes · reference data</small></div><button class="btn btn-sm btn-outline" type="button" onclick="Caddie.reportCourseIssue('${esc(course.id)}')">Report data</button></div>`;
        const checked = source.lastCheckedAt || source.importedAt || source.fetchedAt;
        const checkedLabel = checked ? new Date(checked).toLocaleDateString() : 'Unknown';
        const sourceUrl = this.safeExternalUrl(source.url || 'https://courses.opengolfapi.org/');
        const isOpenData = /^ODbL/i.test(source.license || '');
        return `<div class="course-provenance">
            <span class="source-badge">${isOpenData ? 'Open data' : 'Verified reference'}</span>
            <div><strong>${esc(source.provider)}</strong><small>${completeness}% completeness · ${coverage.mapped}/${coverage.total} mapped holes · ${esc(source.license || 'license not stated')} · checked ${esc(checkedLabel)}${source.userCorrectedAt ? ' · manually corrected' : ''}</small></div>
            ${sourceUrl ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noopener">Source ↗</a>` : ''}
            <button class="btn btn-sm btn-outline" type="button" onclick="Caddie.reportCourseIssue('${esc(course.id)}')">Report data</button>
            <p>${esc(source.attribution || '© OpenStreetMap contributors (ODbL 1.0) via OpenGolfAPI')}${source.geometryProvider ? ` · Hole geometry: ${esc(source.geometryProvider)}` : ''}${source.elevationProvider ? ` · Elevation: ${esc(source.elevationProvider)}` : ''}</p>
        </div>`;
    },

    getCourseCompleteness(course) {
        if (!course) return 0;
        const holes = Array.isArray(course.holes) ? course.holes : [];
        const coreHoles = holes.filter(hole => Number(hole?.par) >= 2 && Number(hole?.yards) > 0).length;
        const mappedHoles = holes.filter(hole => hole?.coordinates?.green || hole?.coordinates?.greenCenter || hole?.mapGeometry?.path?.length >= 2).length;
        let points = 0;
        if (course.name) points += 10;
        if (course.location) points += 10;
        if (Number.isFinite(Number(course.lat)) && Number.isFinite(Number(course.lon))) points += 15;
        if (course.rating && course.slope) points += 10;
        if (course.grass) points += 5;
        if (course.style) points += 5;
        points += Math.min(30, coreHoles / 18 * 30);
        points += Math.min(15, mappedHoles / 18 * 15);
        return Math.round(Math.min(100, points));
    },

    getCourseCoverage(course) {
        const holes = Array.isArray(course?.holes) ? course.holes : [];
        const mapped = holes.filter(hole => hole?.mapGeometry?.path?.length >= 2).length;
        const targets = holes.filter(hole => hole?.coordinates?.green || hole?.coordinates?.greenCenter || hole?.mapGeometry?.path?.length >= 2).length;
        return { total: holes.length, mapped, targets, missing: Math.max(0, holes.length - targets), status: mapped === holes.length && holes.length ? 'Mapped' : targets === holes.length && holes.length ? 'Targeted' : 'Partial' };
    },

    reportCourseIssue(courseId) {
        const course = GolfData.allCourses.find(item => item.id === courseId);
        if (!course) return;
        const hole = Number(prompt('Which hole has inaccurate data? Enter 0 for a course-wide issue.', this._courseState.currentHole || 0));
        if (!Number.isFinite(hole) || hole < 0 || hole > 18) return;
        const issue = String(prompt('Briefly describe the incorrect information:', '') || '').trim().slice(0, 500);
        if (!issue) return;
        const report = { format: 'coursecompass-course-correction', version: 1, createdAt: new Date().toISOString(), course: { id: course.id, name: course.name, location: course.location }, hole, issue, source: course.source || { provider: 'CourseCompass bundled data' } };
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `coursecompass-correction-${String(course.id || 'course').replace(/[^a-z0-9-]/gi, '-')}-${hole || 'all'}.json`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        this._courseState.geoMessage = 'Correction report exported. Keep it with the course record or share it with the course-data maintainer.';
        this.refreshCourseStrategy();
    },

    safeExternalUrl(value) {
        try {
            const url = new URL(String(value || ''));
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        } catch (_) { return ''; }
    },

    normalizeOpenGolfCourse(raw = {}) {
        const number = (...values) => {
            for (const value of values) {
                if (value === null || value === undefined || value === '') continue;
                const parsed = Number(value);
                if (Number.isFinite(parsed)) return parsed;
            }
            return 0;
        };
        const text = (...values) => String(values.find(value => value !== null && value !== undefined && value !== '') || '').slice(0, 300);
        return {
            id: text(raw.id, raw.course_id, raw.uuid),
            name: text(raw.course_name, raw.name),
            city: text(raw.city), state: text(raw.state, raw.region), country: text(raw.country, 'US'),
            address: text(raw.address, raw.street_address), postalCode: text(raw.postal_code, raw.zip),
            latitude: number(raw.latitude, raw.lat), longitude: number(raw.longitude, raw.lon, raw.lng),
            courseType: text(raw.course_type, raw.type), holesCount: number(raw.holes, raw.hole_count),
            parTotal: number(raw.par_total, raw.par), phone: text(raw.phone),
            website: this.safeExternalUrl(raw.website || raw.url), yearBuilt: number(raw.year_built, raw.opened),
            architect: text(raw.architect, raw.designer),
            scorecard: Array.isArray(raw.scorecard) ? raw.scorecard.slice(0, 36) : [],
            raw
        };
    },

    normalizeOpenGolfTee(raw = {}, index = 0) {
        const number = (...values) => {
            for (const value of values) {
                if (value === null || value === undefined || value === '') continue;
                const parsed = Number(value);
                if (Number.isFinite(parsed)) return parsed;
            }
            return 0;
        };
        const name = String(raw.tee_name || raw.name || raw.color || `Tee ${index + 1}`).slice(0, 80);
        return {
            id: String(raw.id || raw.tee_id || name).slice(0, 100),
            name,
            color: String(raw.color || raw.tee_color || '').slice(0, 40),
            gender: String(raw.gender || raw.sex || '').slice(0, 20),
            rating: number(raw.course_rating, raw.rating),
            slope: number(raw.slope_rating, raw.slope),
            totalYardage: number(raw.total_yardage, raw.total_yards, raw.yardage, raw.length),
            raw
        };
    },

    selectPreferredTee(tees = []) {
        const available = tees.filter(tee => Number(tee.totalYardage) > 0).sort((a, b) => Number(a.totalYardage) - Number(b.totalYardage));
        if (!available.length) return tees[0] || null;
        const profile = globalThis.CourseCompassStore?.playerProfile || {};
        const preference = profile.preferredTee || 'auto';
        if (preference === 'forward') return available[0];
        if (preference === 'middle') return available[Math.floor((available.length - 1) / 2)];
        if (preference === 'back') return available[Math.max(0, available.length - 2)];
        if (preference === 'championship') return available[available.length - 1];
        const target = Number(profile.driverCarry) ? Number(profile.driverCarry) * 28 : ({ beginner: 4800, developing: 5600, advanced: 6400, competitive: 7000 }[profile.experience] || 5600);
        return available.reduce((best, tee) => Math.abs(Number(tee.totalYardage) - target) < Math.abs(Number(best.totalYardage) - target) ? tee : best, available[0]);
    },

    normalizeOpenGolfHole(raw = {}, index = 0) {
        const number = (...values) => {
            for (const value of values) {
                if (value === null || value === undefined || value === '') continue;
                const parsed = Number(value);
                if (Number.isFinite(parsed)) return parsed;
            }
            return 0;
        };
        return {
            hole: number(raw.hole_number, raw.hole, index + 1),
            par: number(raw.par),
            strokeIndex: number(raw.handicap_index, raw.stroke_index, raw.handicap),
            yardages: raw.yardages ?? raw.tee_yardages ?? raw.yards ?? null,
            raw
        };
    },

    renderOpenCourseImport() {
        const state = this._courseState;
        const results = state.openSearchResults || [];
        const preview = state.openPreview;
        const resultHtml = results.length ? `<div class="open-course-results">
            ${results.map(course => {
                const location = [course.city, course.state, course.country].filter(Boolean).join(', ');
                const saved = GolfData.customCourses.some(item => item.source?.providerId === course.id);
                return `<article class="open-course-result">
                    <div><strong>${esc(course.name || 'Unnamed course')}</strong><span>${esc(location || 'Location unavailable')} · ${course.holesCount || '?'} holes${course.parTotal ? ` · Par ${course.parTotal}` : ''}</span></div>
                    <button type="button" class="btn btn-sm ${saved ? 'btn-outline' : 'btn-primary'} open-preview-btn" data-course-id="${esc(course.id)}">${saved ? 'Review update' : 'Preview'}</button>
                </article>`;
            }).join('')}
        </div>` : (!state.openSearchLoading && state.openSearchQuery ? '<div class="open-course-empty">No matching courses were returned. Try a shorter course name or include the city.</div>' : '');

        return `<section class="open-course-import">
            <div class="open-import-heading"><div><span class="eyebrow">Free · cached offline</span><h3>Open Course Import</h3><p>Search community-maintained course and scorecard data without a paid API key.</p></div><button type="button" class="btn btn-outline" id="openImportBackBtn">← Course Strategy</button></div>
            <form class="open-search-form" id="openCourseSearchForm">
                <label class="sr-only" for="openCourseSearch">Course name or city</label>
                <input class="form-input" id="openCourseSearch" minlength="2" maxlength="80" required value="${esc(state.openSearchQuery)}" placeholder="Course name, e.g. Pebble Beach">
                <button class="btn btn-primary" type="submit" ${state.openSearchLoading ? 'disabled' : ''}>${state.openSearchLoading ? 'Searching…' : 'Search Open Data'}</button>
            </form>
            ${state.openSearchError ? `<div class="open-import-alert">${esc(state.openSearchError)}</div>` : ''}
            ${state.openSearchLoading ? '<div class="open-import-loading"><div class="discover-spinner"></div><span>Searching OpenGolfAPI…</span></div>' : resultHtml}
            ${state.openPreviewLoading ? '<div class="open-import-loading"><div class="discover-spinner"></div><span>Loading scorecard and tees…</span></div>' : preview ? this.renderOpenCoursePreview(preview) : ''}
            <footer class="open-data-attribution">Course data: © OpenStreetMap contributors (ODbL 1.0) via OpenGolfAPI. Imported records remain available offline and can be corrected in CourseCompass.</footer>
        </section>`;
    },

    renderOpenCoursePreview(preview) {
        const course = preview.course;
        const tees = preview.tees || [];
        const holes = preview.holes || [];
        const selectedTee = tees.find(tee => tee.id === this._courseState.openSelectedTeeId) || tees[0] || null;
        const preferredTee = this.selectPreferredTee(tees);
        const yardageCoverage = holes.filter(hole => this.resolveOpenHoleYardage(hole, selectedTee) > 0).length;
        const location = [course.city, course.state, course.country].filter(Boolean).join(', ');
        return `<article class="open-course-preview">
            <header><div><span class="source-badge">OpenGolfAPI</span><h3>${esc(course.name)}</h3><p>${esc(location || course.address || 'Location unavailable')}</p></div><div class="open-coverage"><strong>${holes.length}</strong><span>holes found</span></div></header>
            <div class="open-preview-facts">
                <span><strong>${course.parTotal || holes.reduce((sum, hole) => sum + (hole.par || 0), 0) || '—'}</strong> Par</span>
                <span><strong>${tees.length}</strong> Tee sets</span>
                <span><strong>${yardageCoverage}/${holes.length || 0}</strong> Yardages</span>
                <span><strong>${course.yearBuilt || '—'}</strong> Opened</span>
            </div>
            ${tees.length ? `<label class="open-tee-select">Tee set to import
                <select class="form-select" id="openTeeSelect">${tees.map(tee => `<option value="${esc(tee.id)}" ${tee.id === selectedTee?.id ? 'selected' : ''}>${esc(tee.name)}${tee.gender ? ` · ${esc(tee.gender)}` : ''}${tee.totalYardage ? ` · ${tee.totalYardage.toLocaleString()} yds` : ''}${tee.rating ? ` · ${tee.rating}/${tee.slope || '—'}` : ''}</option>`).join('')}</select>
            </label>${preferredTee ? `<p class="open-preview-note">Profile fit: ${esc(preferredTee.name)}${preferredTee.totalYardage ? ` · ${preferredTee.totalYardage.toLocaleString()} yards` : ''}. You can choose another tee before importing.</p>` : ''}` : '<p class="open-preview-note">No tee-specific rating set was returned. Hole pars will still be imported.</p>'}
            <div class="open-preview-meta">
                ${course.courseType ? `<span>${esc(course.courseType)}</span>` : ''}
                ${course.architect ? `<span>${esc(course.architect)}</span>` : ''}
                ${course.website ? `<a href="${esc(course.website)}" target="_blank" rel="noopener">Official website ↗</a>` : ''}
            </div>
            <div class="open-preview-actions"><button type="button" class="btn btn-primary" id="importOpenCourseBtn">${GolfData.customCourses.some(item => item.source?.providerId === course.id) ? 'Update Saved Course' : 'Import Course'}</button><span>Imports once, then works offline. You can edit any field afterward.</span></div>
        </article>`;
    },

    async fetchOpenGolfJson(url) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
            if (!response.ok) throw new Error(`OpenGolfAPI returned ${response.status}.`);
            return await response.json();
        } finally { clearTimeout(timeout); }
    },

    async searchOpenCourses(query) {
        const state = this._courseState;
        const cleaned = String(query || '').trim().slice(0, 80);
        if (cleaned.length < 2) return;
        state.openSearchQuery = cleaned;
        state.openSearchLoading = true;
        state.openSearchError = '';
        state.openSearchResults = [];
        state.openPreview = null;
        this.refreshCourseStrategy();
        try {
            const payload = await this.fetchOpenGolfJson(`https://api.opengolfapi.org/v1/courses/search?q=${encodeURIComponent(cleaned)}&limit=20`);
            state.openSearchResults = (Array.isArray(payload?.courses) ? payload.courses : Array.isArray(payload) ? payload : [])
                .map(course => this.normalizeOpenGolfCourse(course)).filter(course => course.id && course.name).slice(0, 20);
        } catch (_) {
            state.openSearchError = 'Open course search is temporarily unavailable. Existing imported courses and the manual builder still work offline.';
        } finally {
            state.openSearchLoading = false;
            this.refreshCourseStrategy();
        }
    },

    async previewOpenCourse(courseId) {
        const state = this._courseState;
        const id = String(courseId || '').slice(0, 120);
        if (!id) return;
        state.openPreviewLoading = true;
        state.openSearchError = '';
        state.openPreview = null;
        this.refreshCourseStrategy();
        const encodedId = encodeURIComponent(id);
        try {
            const [detailResult, teesResult, holesResult] = await Promise.allSettled([
                this.fetchOpenGolfJson(`https://api.opengolfapi.org/v1/courses/${encodedId}`),
                this.fetchOpenGolfJson(`https://api.opengolfapi.org/v1/courses/${encodedId}/tees`),
                this.fetchOpenGolfJson(`https://api.opengolfapi.org/v1/courses/${encodedId}/holes`)
            ]);
            if (detailResult.status !== 'fulfilled') throw new Error('Course details unavailable.');
            const course = this.normalizeOpenGolfCourse(detailResult.value);
            const teesPayload = teesResult.status === 'fulfilled' ? teesResult.value : {};
            const holesPayload = holesResult.status === 'fulfilled' ? holesResult.value : {};
            const tees = (Array.isArray(teesPayload?.tees) ? teesPayload.tees : []).map((tee, index) => this.normalizeOpenGolfTee(tee, index));
            const rawHoles = Array.isArray(holesPayload?.holes) && holesPayload.holes.length ? holesPayload.holes : course.scorecard;
            const holes = rawHoles.map((hole, index) => this.normalizeOpenGolfHole(hole, index)).filter(hole => hole.hole > 0).sort((a, b) => a.hole - b.hole).slice(0, 36);
            state.openPreview = { course, tees, holes };
            state.openSelectedTeeId = this.selectPreferredTee(tees)?.id || tees[0]?.id || '';
        } catch (_) {
            state.openSearchError = 'This course record could not be loaded. Try another result or use the manual course builder.';
        } finally {
            state.openPreviewLoading = false;
            this.refreshCourseStrategy();
        }
    },

    resolveOpenHoleYardage(hole, tee) {
        if (!hole) return 0;
        const direct = Number(hole.raw?.yards ?? hole.raw?.yardage ?? hole.raw?.distance);
        if (Number.isFinite(direct) && direct > 0) return Math.round(direct);
        const yardages = hole.yardages;
        const keys = [tee?.id, tee?.name, tee?.color].filter(Boolean).map(value => String(value).toLowerCase());
        if (Array.isArray(yardages)) {
            const match = yardages.find(item => keys.includes(String(item?.tee_id || item?.tee || item?.name || item?.color || '').toLowerCase())) || yardages[0];
            const value = Number(match?.yards ?? match?.yardage ?? match?.distance ?? match?.value ?? match);
            return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
        }
        if (yardages && typeof yardages === 'object') {
            const entries = Object.entries(yardages);
            const match = entries.find(([key]) => keys.includes(String(key).toLowerCase())) || entries[0];
            const nested = match?.[1];
            const value = Number(nested?.yards ?? nested?.yardage ?? nested?.distance ?? nested?.value ?? nested);
            return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
        }
        const teeHoleYards = tee?.raw?.yardages || tee?.raw?.holes;
        if (Array.isArray(teeHoleYards)) {
            const item = teeHoleYards.find(entry => Number(entry?.hole_number ?? entry?.hole) === Number(hole.hole));
            const value = Number(item?.yards ?? item?.yardage ?? item?.distance ?? item);
            return Number.isFinite(value) && value > 0 ? Math.round(value) : 0;
        }
        return 0;
    },

    buildImportedOpenCourse(preview, selectedTeeId = '') {
        if (!preview?.course?.id) return null;
        const sourceCourse = preview.course;
        const tee = (preview.tees || []).find(item => item.id === selectedTeeId) || preview.tees?.[0] || null;
        const holes = (preview.holes || []).map(item => {
            const par = Math.max(2, Math.min(7, Number(item.par) || 4));
            const yards = Math.max(0, Math.min(900, this.resolveOpenHoleYardage(item, tee)));
            return {
                hole: Number(item.hole), par, yards, strokeIndex: Math.max(0, Math.min(36, Number(item.strokeIndex) || 0)),
                type: `Par ${par}`, fairwayShape: 'straight', elevation: 'flat', hazards: [],
                greenShape: 'oval', greenSlope: 'varies',
                tip: yards ? `Open scorecard data: Hole ${item.hole} is ${yards} yards from the ${tee?.name || 'selected'} tee, Par ${par}.` : `Open scorecard data: Hole ${item.hole}, Par ${par}. Add yardage or strategy details with Edit.`
            };
        }).filter(hole => hole.hole > 0);
        const location = [sourceCourse.city, sourceCourse.state, sourceCourse.country].filter(Boolean).join(', ') || sourceCourse.address || 'Location unavailable';
        const now = new Date().toISOString();
        return {
            id: `open-${String(sourceCourse.id).replace(/[^a-z0-9-]/gi, '-').slice(0, 100)}`,
            name: sourceCourse.name, location, country: sourceCourse.country || '', lat: sourceCourse.latitude, lon: sourceCourse.longitude,
            grass: '', style: sourceCourse.courseType || '', rating: tee?.rating || 0, slope: tee?.slope || 0,
            image: '🌐', holes, tees: (preview.tees || []).map(item => ({ id: item.id, name: item.name, color: item.color, gender: item.gender, rating: item.rating, slope: item.slope, totalYardage: item.totalYardage })),
            selectedTeeId: tee?.id || '', website: sourceCourse.website, phone: sourceCourse.phone,
            address: sourceCourse.address, yearBuilt: sourceCourse.yearBuilt, architect: sourceCourse.architect,
            source: { provider: 'OpenGolfAPI', providerId: sourceCourse.id, license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors (ODbL 1.0) via OpenGolfAPI', url: `https://courses.opengolfapi.org/`, importedAt: now, lastCheckedAt: now }
        };
    },

    importOpenCourse() {
        const preview = this._courseState.openPreview;
        let course = this.buildImportedOpenCourse(preview, this._courseState.openSelectedTeeId);
        if (!course) return;
        const existing = GolfData.customCourses.find(item => item.source?.providerId === course.source.providerId || item.id === course.id);
        if (existing) {
            course.id = existing.id;
            course.source.importedAt = existing.source?.importedAt || course.source.importedAt;
            const preservedHoles = new Map((existing.holes || []).map(hole => [Number(hole.hole), hole]));
            course.holes = course.holes.map(hole => {
                const saved = preservedHoles.get(Number(hole.hole));
                return saved?.mapGeometry ? { ...hole, mapGeometry: saved.mapGeometry, teeElevationFeet: saved.teeElevationFeet, greenElevationFeet: saved.greenElevationFeet, elevationChangeFeet: saved.elevationChangeFeet, elevation: saved.elevation } : hole;
            });
            course.source = { ...course.source, geometryProvider: existing.source?.geometryProvider, geometryCheckedAt: existing.source?.geometryCheckedAt, elevationProvider: existing.source?.elevationProvider, elevationCheckedAt: existing.source?.elevationCheckedAt };
            if (existing.source?.userCorrectedAt) {
                course = {
                    ...course,
                    name: existing.name, location: existing.location, lat: existing.lat, lon: existing.lon,
                    grass: existing.grass, style: existing.style, rating: existing.rating, slope: existing.slope,
                    holes: course.holes.map(hole => preservedHoles.has(Number(hole.hole)) ? { ...hole, ...preservedHoles.get(Number(hole.hole)) } : hole),
                    source: { ...course.source, userCorrectedAt: existing.source.userCorrectedAt }
                };
            }
        }
        GolfData.upsertCustomCourse(course);
        this._courseState.selectedCourseId = course.id;
        GolfData.selectedCourseId = course.id;
        this._courseState.viewMode = 'full';
        this._courseState.currentHole = course.holes[0]?.hole || 1;
        this._courseState.geoMessage = `✅ “${course.name}” ${existing ? 'updated' : 'imported'} and cached for offline use.`;
        this.refreshCourseStrategy();
    },

    parseOsmHoleNumber(tags = {}) {
        for (const candidate of [tags.ref, tags.hole, tags['golf:hole'], tags.name]) {
            const match = String(candidate || '').match(/(?:^|\D)([1-9]|1[0-8])(?:\D|$)/);
            if (match) return Number(match[1]);
        }
        return 0;
    },

    normalizeOsmGeometry(element = {}) {
        return (Array.isArray(element.geometry) ? element.geometry : [])
            .map(point => ({ lat: Number(point.lat), lon: Number(point.lon) }))
            .filter(point => Number.isFinite(point.lat) && Number.isFinite(point.lon))
            .slice(0, 100);
    },

    geometryCenter(points = []) {
        if (!points.length) return null;
        return { lat: points.reduce((sum, point) => sum + point.lat, 0) / points.length, lon: points.reduce((sum, point) => sum + point.lon, 0) / points.length };
    },

    pointDistanceMeters(a, b) {
        if (!a || !b) return Infinity;
        const latScale = 111320;
        const lonScale = latScale * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
        return Math.hypot((a.lat - b.lat) * latScale, (a.lon - b.lon) * lonScale);
    },

    pointToPathDistanceMeters(point, path = []) {
        if (!point || !path.length) return Infinity;
        if (path.length === 1) return this.pointDistanceMeters(point, path[0]);
        const latScale = 111320;
        const lonScale = latScale * Math.cos(Number(point.lat) * Math.PI / 180);
        const p = { x: Number(point.lon) * lonScale, y: Number(point.lat) * latScale };
        let nearest = Infinity;
        for (let index = 1; index < path.length; index++) {
            const a = { x: Number(path[index - 1].lon) * lonScale, y: Number(path[index - 1].lat) * latScale };
            const b = { x: Number(path[index].lon) * lonScale, y: Number(path[index].lat) * latScale };
            const dx = b.x - a.x, dy = b.y - a.y;
            const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
            nearest = Math.min(nearest, Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy)));
        }
        return nearest;
    },

    normalizeOverpassGolf(payload = {}) {
        const elements = Array.isArray(payload.elements) ? payload.elements : [];
        const holes = new Map();
        elements.filter(element => element?.tags?.golf === 'hole').forEach(element => {
            const hole = this.parseOsmHoleNumber(element.tags);
            const path = this.normalizeOsmGeometry(element);
            if (hole && path.length >= 2 && !holes.has(hole)) holes.set(hole, { osmHoleId: Number(element.id) || 0, path, features: [] });
        });
        const featureTypes = { green: 'green', fairway: 'fairway', bunker: 'bunker', water_hazard: 'water', lateral_water_hazard: 'water', tee: 'tee' };
        elements.filter(element => featureTypes[element?.tags?.golf]).forEach(element => {
            const geometry = this.normalizeOsmGeometry(element);
            const center = this.geometryCenter(geometry) || (Number.isFinite(Number(element.center?.lat)) && Number.isFinite(Number(element.center?.lon)) ? { lat: Number(element.center.lat), lon: Number(element.center.lon) } : null);
            if (!center) return;
            let nearest = null, distance = Infinity;
            holes.forEach(value => {
                const candidate = this.pointToPathDistanceMeters(center, value.path);
                if (candidate < distance) { nearest = value; distance = candidate; }
            });
            if (nearest && distance <= 220 && nearest.features.length < 30) nearest.features.push({ type: featureTypes[element.tags.golf], geometry, center });
        });
        return holes;
    },

    normalizeUsgsElevation(payload = {}) {
        const values = [payload.value, payload?.USGS_Elevation_Point_Query_Service?.Elevation_Query?.Elevation, payload?.elevation];
        const value = values.map(Number).find(Number.isFinite);
        return Number.isFinite(value) && value > -2000 && value < 30000 ? value : null;
    },

    async fetchJsonWithTimeout(url, options = {}, timeoutMs = 20000) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            if (!response.ok) throw new Error(`Service returned ${response.status}.`);
            return await response.json();
        } finally { clearTimeout(timeout); }
    },

    async fetchUsgsElevation(point) {
        const url = `https://epqs.nationalmap.gov/v1/json?x=${encodeURIComponent(point.lon)}&y=${encodeURIComponent(point.lat)}&units=Feet&wkid=4326&includeDate=false`;
        return this.normalizeUsgsElevation(await this.fetchJsonWithTimeout(url, { headers: { Accept: 'application/json' } }, 15000));
    },

    async fetchOverpass(query, attempts = 3) {
        let lastError = null;
        const endpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter'].slice(0, Math.max(1, attempts));
        for (const endpoint of endpoints) {
            try {
                return await this.fetchJsonWithTimeout(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', Accept: 'application/json' }, body: `data=${encodeURIComponent(query)}` }, 10000);
            } catch (error) { lastError = error; }
        }
        throw new Error(`Public OpenStreetMap servers are busy or unreachable${lastError?.message?.includes('429') ? ' (rate limited)' : ''}. Please retry in a few minutes.`);
    },

    async mapWithConcurrency(items, limit, worker) {
        const results = new Array(items.length);
        let cursor = 0;
        const run = async () => {
            while (cursor < items.length) {
                const index = cursor++;
                try { results[index] = await worker(items[index], index); } catch (_) { results[index] = null; }
            }
        };
        await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
        return results;
    },

    async enrichSelectedCourse() {
        const state = this._courseState;
        const course = GolfData.customCourses.find(item => item.id === state.selectedCourseId);
        const lat = Number(course?.lat), lon = Number(course?.lon);
        if (!course || !Number.isFinite(lat) || !Number.isFinite(lon) || state.enrichLoading) return;
        state.enrichLoading = true;
        state.enrichMessage = 'Requesting mapped golf features near this course…';
        this.refreshCourseStrategy();
        try {
            const holeQuery = `[out:json][timeout:20];way["golf"="hole"](around:3000,${lat},${lon});out tags geom;`;
            const holePayload = await this.fetchOverpass(holeQuery);
            let featureElements = [];
            try {
                const featureQuery = `[out:json][timeout:20];way["golf"~"^(green|fairway|bunker|water_hazard|lateral_water_hazard|tee)$"](around:3000,${lat},${lon});out tags geom center;`;
                featureElements = (await this.fetchOverpass(featureQuery, 2))?.elements || [];
            } catch (_) { /* Hole paths are still useful when optional feature polygons time out. */ }
            const mapped = this.normalizeOverpassGolf({ elements: [...(holePayload?.elements || []), ...featureElements] });
            if (!mapped.size) throw new Error('No numbered OpenStreetMap hole paths were found near this course.');
            const importedAt = new Date().toISOString();
            let holes = (course.holes || []).map(hole => {
                const geometry = mapped.get(Number(hole.hole));
                return geometry ? { ...hole, mapGeometry: { source: 'OpenStreetMap', ...geometry, importedAt } } : hole;
            });
            const matched = holes.filter(hole => hole.mapGeometry?.importedAt === importedAt);
            let elevationCount = 0;
            const isUS = String(course.country || '').toUpperCase() === 'US' || /,\s*(USA|United States|[A-Z]{2})\s*$/i.test(course.location || '');
            if (isUS && matched.length) {
                state.enrichMessage = `Mapped ${matched.length} holes. Adding tee-to-green elevation…`;
                this.refreshCourseStrategy();
                const elevations = await this.mapWithConcurrency(matched, 4, async hole => {
                    const path = hole.mapGeometry.path;
                    const [tee, green] = await Promise.all([this.fetchUsgsElevation(path[0]), this.fetchUsgsElevation(path[path.length - 1])]);
                    return Number.isFinite(tee) && Number.isFinite(green) ? { hole: Number(hole.hole), tee, green, change: Math.round(green - tee) } : null;
                });
                const byHole = new Map(elevations.filter(Boolean).map(item => [item.hole, item]));
                holes = holes.map(hole => {
                    const value = byHole.get(Number(hole.hole));
                    if (!value) return hole;
                    elevationCount++;
                    const magnitude = Math.abs(value.change);
                    const elevation = magnitude <= 5 ? 'flat' : value.change > 0 ? (magnitude > 30 ? 'steep-uphill' : 'uphill') : (magnitude > 30 ? 'steep-downhill' : 'downhill');
                    return { ...hole, teeElevationFeet: Math.round(value.tee), greenElevationFeet: Math.round(value.green), elevationChangeFeet: value.change, elevation };
                });
            }
            const source = { ...(course.source || {}), geometryProvider: 'OpenStreetMap', geometryCheckedAt: importedAt, attribution: course.source?.attribution || '© OpenStreetMap contributors (ODbL 1.0)' };
            if (elevationCount) { source.elevationProvider = 'USGS 3DEP'; source.elevationCheckedAt = importedAt; }
            GolfData.updateCustomCourse(course.id, { ...course, holes, source });
            state.enrichMessage = `✅ Added mapped geometry for ${matched.length} of ${course.holes.length} holes${elevationCount ? ` and elevation for ${elevationCount}` : ''}. Saved for offline use.`;
        } catch (error) {
            state.enrichMessage = `⚠️ ${error?.message || 'Course enrichment is temporarily unavailable.'}`;
        } finally {
            state.enrichLoading = false;
            this.refreshCourseStrategy();
        }
    },

    refreshCourseStrategy() {
        const container = document.getElementById('caddieContent');
        if (!container) return;
        container.innerHTML = this.renderCourseStrategy();
        this.bindCourseEvents();
    },

    /* ── Message for courses without hole data ────────── */
    renderNoCourseDataMsg() {
        return `<div class="empty-state professional-empty-state mt-3">
            <h3>Licensed hole data is not available</h3>
            <p>The course identity remains as a sourced reference, but CourseCompass will not display the previous unverified scorecard. Use <strong>Open Data</strong>, <strong>Discover</strong>, or <strong>Add Course</strong> when you have a permitted source.</p>
        </div>`;
    },

    /* ── Discover Nearby Courses Panel ────────────────── */
    renderDiscoverPanel() {
        const state = this._courseState;
        const results = state.discoveredCourses;
        const loading = state.discoverLoading;

        let body = '';
        if (loading) {
            body = `<div class="text-center mt-3"><div class="discover-spinner"></div><p class="mt-2">Searching for golf courses near you...</p></div>`;
        } else if (results.length) {
            body = `
                <p class="text-sm mb-2" style="color:var(--text-secondary);">Found <strong>${results.length}</strong> golf course(s) within 25 miles. Click <strong>Add</strong> to save one to your course list.</p>
                <div class="discover-results">
                    ${results.map((r, i) => {
                        const alreadyAdded = GolfData.allCourses.some(c => c.id === r.id);
                        return `
                        <div class="discover-card ${alreadyAdded ? 'added' : ''}">
                            <div class="discover-card-info">
                                <strong>${esc(r.name)}</strong>
                                <span class="text-sm" style="color:var(--text-secondary);">${r.distance} miles away</span>
                            </div>
                            ${alreadyAdded
                                ? `<span class="badge-custom" style="flex-shrink:0;">✓ Added</span>`
                                : `<button class="btn btn-sm btn-outline discover-add-btn" data-idx="${i}">Add</button>`}
                        </div>`;
                    }).join('')}
                </div>`;
        } else {
            body = `<div class="empty-state professional-empty-state mt-3">
                <span class="empty-state-code">SEARCH</span>
                <h3>No Results Yet</h3>
                <p>Select <strong>Discover</strong> above to search for golf courses near your location using OpenStreetMap.</p>
            </div>`;
        }

        return `<div class="discover-panel">${body}
            <div class="mt-3 text-center">
                <button class="btn btn-outline" id="discoverBackBtn">← Back to Course View</button>
            </div>
        </div>`;
    },

    /* ── Course Builder Panel ─────────────────────────── */
    renderCourseBuilder() {
        const editing = GolfData.customCourses.find(course => course.id === this._courseState.builderCourseId) || null;
        const holeMap = new Map((editing?.holes || []).map(hole => [Number(hole.hole), hole]));
        return `
        <div class="course-builder">
            <h3>${editing ? 'Edit Saved Course' : 'Add a Custom Course'}</h3>
            <p class="text-sm mb-2" style="color:var(--text-secondary);">${editing?.source ? 'Correct or supplement the imported record. Source attribution remains attached.' : 'Enter your local course details. Hole data is optional — you can start with basic info and add holes later.'}</p>
            <form id="courseBuilderForm">
                <div class="form-row" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    <div class="form-group"><label class="form-label" for="cb-name">Course Name *</label><input class="form-input" id="cb-name" required value="${esc(editing?.name || '')}" placeholder="e.g., Sunny Acres Golf Club"></div>
                    <div class="form-group"><label class="form-label" for="cb-location">Location *</label><input class="form-input" id="cb-location" required value="${esc(editing?.location || '')}" placeholder="e.g., Springfield, IL"></div>
                    <div class="form-group"><label class="form-label" for="cb-grass">Grass Type</label><input class="form-input" id="cb-grass" value="${esc(editing?.grass || '')}" placeholder="e.g., Bermuda"></div>
                    <div class="form-group"><label class="form-label" for="cb-style">Course Style</label><input class="form-input" id="cb-style" value="${esc(editing?.style || '')}" placeholder="e.g., Parkland, Links"></div>
                    <div class="form-group"><label class="form-label" for="cb-rating">Rating</label><input class="form-input" id="cb-rating" type="number" step="0.1" value="${Number(editing?.rating) || ''}" placeholder="e.g., 72.4"></div>
                    <div class="form-group"><label class="form-label" for="cb-slope">Slope</label><input class="form-input" id="cb-slope" type="number" value="${Number(editing?.slope) || ''}" placeholder="e.g., 131"></div>
                    <div class="form-group"><label class="form-label" for="cb-lat">Latitude</label><input class="form-input" id="cb-lat" type="number" step="any" value="${Number.isFinite(Number(editing?.lat)) ? Number(editing.lat) : ''}" placeholder="Auto from GPS"></div>
                    <div class="form-group"><label class="form-label" for="cb-lon">Longitude</label><input class="form-input" id="cb-lon" type="number" step="any" value="${Number.isFinite(Number(editing?.lon)) ? Number(editing.lon) : ''}" placeholder="Auto from GPS"></div>
                </div>
                <button type="button" class="btn btn-primary mt-2" id="cb-fill-gps">Fill GPS from My Location</button>

                <hr style="border-color:var(--border-color); margin:20px 0;">

                <h4>Hole Data <span class="text-sm" style="font-weight:400; color:var(--text-secondary);">(optional — enter par & yards for each hole)</span></h4>
                <div class="hole-builder-grid mt-2" id="holeBuilderGrid">
                    ${Array.from({length: Math.max(18, editing?.holes?.length || 0)}, (_, i) => {
                        const savedHole = holeMap.get(i + 1) || {};
                        const coordinateValue = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : '';
                        return `
                        <div class="hole-builder-row">
                            <span class="hole-builder-num">${i + 1}</span>
                            <input class="form-input hole-par" aria-label="Hole ${i + 1} par" type="number" min="2" max="7" value="${Number(savedHole.par) || ''}" placeholder="Par" data-hole="${i + 1}">
                            <input class="form-input hole-yards" aria-label="Hole ${i + 1} yards" type="number" min="0" max="900" value="${Number.isFinite(Number(savedHole.yards)) && savedHole.yards !== undefined ? Number(savedHole.yards) : ''}" placeholder="Yards" data-hole="${i + 1}">
                            <select class="form-select hole-shape" aria-label="Hole ${i + 1} shape" data-hole="${i + 1}">
                                <option value="straight" ${savedHole.fairwayShape === 'straight' || !savedHole.fairwayShape ? 'selected' : ''}>Straight</option>
                                <option value="dogleg-left" ${savedHole.fairwayShape === 'dogleg-left' ? 'selected' : ''}>Dogleg Left</option>
                                <option value="dogleg-right" ${savedHole.fairwayShape === 'dogleg-right' ? 'selected' : ''}>Dogleg Right</option>
                            </select>
                            <details class="hole-coordinate-editor">
                                <summary>GPS targets${savedHole.coordinates?.green || savedHole.coordinates?.greenCenter ? ' · green saved' : ''}</summary>
                                <p>Add tee and front/center/back green coordinates. Existing single-green targets are treated as center.</p>
                                <div class="hole-coordinate-grid">
                                    <label>Tee latitude<input class="form-input hole-tee-lat" aria-label="Hole ${i + 1} tee latitude" type="number" min="-90" max="90" step="any" data-hole="${i + 1}" value="${coordinateValue(savedHole.coordinates?.tee?.lat)}"></label>
                                    <label>Tee longitude<input class="form-input hole-tee-lon" aria-label="Hole ${i + 1} tee longitude" type="number" min="-180" max="180" step="any" data-hole="${i + 1}" value="${coordinateValue(savedHole.coordinates?.tee?.lon)}"></label>
                                    <label>Front latitude<input class="form-input hole-green-front-lat" aria-label="Hole ${i + 1} green front latitude" type="number" min="-90" max="90" step="any" data-hole="${i + 1}" value="${coordinateValue(savedHole.coordinates?.greenFront?.lat)}"></label>
                                    <label>Front longitude<input class="form-input hole-green-front-lon" aria-label="Hole ${i + 1} green front longitude" type="number" min="-180" max="180" step="any" data-hole="${i + 1}" value="${coordinateValue(savedHole.coordinates?.greenFront?.lon)}"></label>
                                    <label>Center latitude<input class="form-input hole-green-lat" aria-label="Hole ${i + 1} green center latitude" type="number" min="-90" max="90" step="any" data-hole="${i + 1}" value="${coordinateValue(savedHole.coordinates?.greenCenter?.lat ?? savedHole.coordinates?.green?.lat)}"></label>
                                    <label>Center longitude<input class="form-input hole-green-lon" aria-label="Hole ${i + 1} green center longitude" type="number" min="-180" max="180" step="any" data-hole="${i + 1}" value="${coordinateValue(savedHole.coordinates?.greenCenter?.lon ?? savedHole.coordinates?.green?.lon)}"></label>
                                    <label>Back latitude<input class="form-input hole-green-back-lat" aria-label="Hole ${i + 1} green back latitude" type="number" min="-90" max="90" step="any" data-hole="${i + 1}" value="${coordinateValue(savedHole.coordinates?.greenBack?.lat)}"></label>
                                    <label>Back longitude<input class="form-input hole-green-back-lon" aria-label="Hole ${i + 1} green back longitude" type="number" min="-180" max="180" step="any" data-hole="${i + 1}" value="${coordinateValue(savedHole.coordinates?.greenBack?.lon)}"></label>
                                </div>
                                <div class="hole-coordinate-actions"><button type="button" class="btn btn-sm btn-outline hole-coordinate-gps" data-hole="${i + 1}" data-endpoint="tee">Use location as tee</button><button type="button" class="btn btn-sm btn-outline hole-coordinate-gps" data-hole="${i + 1}" data-endpoint="green-front">Front</button><button type="button" class="btn btn-sm btn-outline hole-coordinate-gps" data-hole="${i + 1}" data-endpoint="green">Center</button><button type="button" class="btn btn-sm btn-outline hole-coordinate-gps" data-hole="${i + 1}" data-endpoint="green-back">Back</button><button type="button" class="btn btn-sm btn-accent hole-visual-target" data-hole="${i + 1}">Visual editor</button></div>
                            </details>
                        </div>
                    `; }).join('')}
                </div>

                <div style="display:flex; gap:12px; margin-top:20px;">
                    <button type="submit" class="btn btn-primary">${editing ? 'Save Corrections' : 'Save Course'}</button>
                    <button type="button" class="btn btn-outline" id="builderBackBtn">Cancel</button>
                </div>
            </form>
            <dialog id="visualTargetDialog" class="visual-target-dialog" aria-label="Visual GPS target editor"></dialog>
        </div>`;
    },

    /* ── Discover Nearby Courses via Overpass API ─────── */
    discoverNearbyCourses() {
        const state = this._courseState;
        const showMsg = (text, type) => {
            state.geoMessage = text;
            const msgEl = document.getElementById('geoMessage');
            if (msgEl) { msgEl.textContent = text; msgEl.className = 'geo-message show ' + type; }
        };

        if (!navigator.geolocation) {
            showMsg('⚠️ Geolocation is not supported by your browser.', 'warn');
            return;
        }

        showMsg('📡 Getting your location...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                state.userLat = lat;
                state.userLon = lon;
                state.discoverLoading = true;
                state.viewMode = 'discover';
                state.discoveredCourses = [];

                // Re-render with loading state
                const container = document.getElementById('caddieContent');
                container.innerHTML = this.renderCourseStrategy();
                this.bindCourseEvents();

                showMsg(`📍 Location: ${lat.toFixed(4)}, ${lon.toFixed(4)} — searching OpenStreetMap...`, 'info');

                // Overpass API: find golf courses within ~25 miles (40 km)
                const radius = 40000; // meters
                const query = `[out:json][timeout:15];(
                    way["leisure"="golf_course"](around:${radius},${lat},${lon});
                    relation["leisure"="golf_course"](around:${radius},${lat},${lon});
                    node["leisure"="golf_course"](around:${radius},${lat},${lon});
                );out center tags;`;

                fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    body: 'data=' + encodeURIComponent(query)
                })
                .then(res => { if (!res.ok) throw new Error('Overpass API error'); return res.json(); })
                .then(data => {
                    const toRad = d => d * Math.PI / 180;
                    const haversine = (lat1, lon1, lat2, lon2) => {
                        const R = 3959;
                        const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
                        const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
                        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                    };

                    const seen = new Set();
                    const results = [];
                    (data.elements || []).forEach(el => {
                        const name = el.tags && el.tags.name;
                        if (!name) return;
                        // Get coordinates
                        let elLat = el.lat || (el.center && el.center.lat);
                        let elLon = el.lon || (el.center && el.center.lon);
                        if (!elLat || !elLon) return;
                        const key = name.toLowerCase().trim();
                        if (seen.has(key)) return;
                        seen.add(key);
                        const dist = haversine(lat, lon, elLat, elLon);
                        const id = 'custom-' + key.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                        results.push({
                            id,
                            name,
                            location: el.tags.addr_city || el.tags['addr:city'] || el.tags['addr:state'] || '',
                            lat: elLat,
                            lon: elLon,
                            distance: Math.round(dist * 10) / 10,
                            holes: parseInt(el.tags.holes) || null,
                            website: el.tags.website || el.tags.url || ''
                        });
                    });

                    results.sort((a, b) => a.distance - b.distance);

                    state.discoveredCourses = results;
                    state.discoverLoading = false;

                    showMsg(results.length
                        ? `✅ Found ${results.length} golf course(s) within 25 miles!`
                        : '⚠️ No golf courses found nearby. Try adding one manually.', results.length ? 'success' : 'warn');

                    const c2 = document.getElementById('caddieContent');
                    c2.innerHTML = this.renderCourseStrategy();
                    this.bindCourseEvents();
                })
                .catch(err => {
                    state.discoverLoading = false;
                    state.viewMode = 'full';
                    showMsg('⚠️ Could not reach OpenStreetMap. Check your connection and try again.', 'warn');
                    const c2 = document.getElementById('caddieContent');
                    c2.innerHTML = this.renderCourseStrategy();
                    this.bindCourseEvents();
                });
            },
            (error) => {
                const msgs = {
                    1: '⚠️ Location permission denied. Please enable location access.',
                    2: '⚠️ Location unavailable. Please try again.',
                    3: '⚠️ Location request timed out. Please try again.'
                };
                showMsg(msgs[error.code] || '⚠️ Could not detect location.', 'warn');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    },

    /* ── Add a discovered course to custom courses ────── */
    addDiscoveredCourse(idx) {
        const r = this._courseState.discoveredCourses[idx];
        if (!r) return;
        const course = {
            id: r.id,
            name: r.name,
            location: r.location || 'Unknown',
            lat: r.lat, lon: r.lon,
            grass: '', style: '', rating: 0, slope: 0,
            image: '📌',
            holes: [],
            _discovered: true
        };
        if (GolfData.addCustomCourse(course)) {
            this._courseState.selectedCourseId = course.id;
            GolfData.selectedCourseId = course.id;
            this._courseState.geoMessage = `✅ "${r.name}" added to your courses!`;
        }
        const container = document.getElementById('caddieContent');
        container.innerHTML = this.renderCourseStrategy();
        this.bindCourseEvents();
    },

    /* ── Save course from builder form ───────────────── */
    saveCourseFromBuilder() {
        const name = document.getElementById('cb-name').value.trim();
        const location = document.getElementById('cb-location').value.trim();
        if (!name || !location) { alert('Course name and location are required.'); return; }

        const editing = GolfData.customCourses.find(course => course.id === this._courseState.builderCourseId) || null;
        const id = editing?.id || ('custom-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'));
        const lat = parseFloat(document.getElementById('cb-lat').value) || 0;
        const lon = parseFloat(document.getElementById('cb-lon').value) || 0;
        const grass = document.getElementById('cb-grass').value.trim();
        const style = document.getElementById('cb-style').value.trim();
        const rating = parseFloat(document.getElementById('cb-rating').value) || 0;
        const slope = parseInt(document.getElementById('cb-slope').value) || 0;

        // Collect hole data
        const holes = [];
        const maxHoles = Math.max(18, document.querySelectorAll('.hole-par').length);
        for (let i = 1; i <= maxHoles; i++) {
            const par = parseInt(document.querySelector(`.hole-par[data-hole="${i}"]`)?.value);
            const yards = parseInt(document.querySelector(`.hole-yards[data-hole="${i}"]`)?.value);
            const shape = document.querySelector(`.hole-shape[data-hole="${i}"]`)?.value || 'straight';
            if (par && Number.isFinite(yards) && yards >= 0) {
                const existingHole = editing?.holes?.find(hole => Number(hole.hole) === i) || {};
                const readCoordinate = className => {
                    const raw = document.querySelector(`.${className}[data-hole="${i}"]`)?.value;
                    return raw === '' || raw === undefined ? null : Number(raw);
                };
                const teeLat = readCoordinate('hole-tee-lat'), teeLon = readCoordinate('hole-tee-lon');
                const greenLat = readCoordinate('hole-green-lat'), greenLon = readCoordinate('hole-green-lon');
                const greenFrontLat = readCoordinate('hole-green-front-lat'), greenFrontLon = readCoordinate('hole-green-front-lon');
                const greenBackLat = readCoordinate('hole-green-back-lat'), greenBackLon = readCoordinate('hole-green-back-lon');
                const validPoint = (pointLat, pointLon) => Number.isFinite(pointLat) && Number.isFinite(pointLon) && Math.abs(pointLat) <= 90 && Math.abs(pointLon) <= 180;
                const coordinates = {};
                if (validPoint(teeLat, teeLon)) coordinates.tee = { lat: teeLat, lon: teeLon };
                if (validPoint(greenLat, greenLon)) {
                    coordinates.green = { lat: greenLat, lon: greenLon };
                    coordinates.greenCenter = { lat: greenLat, lon: greenLon };
                }
                if (validPoint(greenFrontLat, greenFrontLon)) coordinates.greenFront = { lat: greenFrontLat, lon: greenFrontLon };
                if (validPoint(greenBackLat, greenBackLon)) coordinates.greenBack = { lat: greenBackLat, lon: greenBackLon };
                const updatedHole = {
                    ...existingHole,
                    hole: i, par, yards,
                    type: par === 3 ? 'Par 3' : par === 5 ? 'Par 5' : 'Par 4',
                    fairwayShape: shape,
                    elevation: existingHole.elevation || 'flat',
                    hazards: Array.isArray(existingHole.hazards) ? existingHole.hazards : [],
                    greenShape: existingHole.greenShape || 'oval',
                    greenSlope: existingHole.greenSlope || 'back-to-front',
                    tip: existingHole.tip || `Hole ${i} — ${yards} yards, Par ${par}.`
                };
                if (Object.keys(coordinates).length) updatedHole.coordinates = coordinates;
                else delete updatedHole.coordinates;
                holes.push(updatedHole);
            }
        }

        const course = { ...editing, id, name, location, lat, lon, grass, style, rating, slope, image: editing?.image || '📌', holes };
        if (course.source) course.source = { ...course.source, userCorrectedAt: new Date().toISOString() };

        if (editing ? GolfData.updateCustomCourse(id, course) : GolfData.addCustomCourse(course)) {
            this._courseState.selectedCourseId = id;
            GolfData.selectedCourseId = id;
            this._courseState.viewMode = 'full';
            this._courseState.builderCourseId = null;
            this._courseState.geoMessage = `✅ "${name}" ${editing ? 'updated' : 'saved'} in your courses!`;
            const container = document.getElementById('caddieContent');
            container.innerHTML = this.renderCourseStrategy();
            this.bindCourseEvents();
        } else {
            alert('A course with this name already exists.');
        }
    },

    /* ── Full Course View ─────────────────────────────── */
    renderFullCourseView(course, front9, back9) {
        return `
            <h3 style="margin-bottom: 16px;">Front Nine (Holes 1–9)</h3>
            <div class="course-layout mb-3">
                ${front9.map(h => this.renderHoleCard(h)).join('')}
            </div>
            <h3 style="margin-bottom: 16px;">Back Nine (Holes 10–18)</h3>
            <div class="course-layout">
                ${back9.map(h => this.renderHoleCard(h)).join('')}
            </div>
        `;
    },

    /* ── Hole-by-Hole View ────────────────────────────── */
    renderHoleByHoleView(course) {
        const holes = [...(course.holes || [])].sort((a, b) => a.hole - b.hole);
        if (holes.length === 0) return this.renderNoCourseDataMsg();

        let currentIndex = holes.findIndex(h => h.hole === this._courseState.currentHole);
        if (currentIndex < 0) currentIndex = 0;
        const hole = holes[currentIndex];
        this._courseState.currentHole = hole.hole;
        const prev = currentIndex > 0;
        const next = currentIndex < holes.length - 1;
        return `
            <div class="hole-navigator">
                <button class="btn btn-sm ${prev ? 'btn-outline' : 'btn-disabled'}" id="holePrev" ${!prev ? 'disabled' : ''}>◀ Prev</button>
                <div class="hole-nav-selector">
                    ${holes.map(h => `
                        <button class="hole-dot ${h.hole === this._courseState.currentHole ? 'active' : ''}"
                                data-hole="${h.hole}" title="Hole ${h.hole}">${h.hole}</button>
                    `).join('')}
                </div>
                <button class="btn btn-sm ${next ? 'btn-outline' : 'btn-disabled'}" id="holeNext" ${!next ? 'disabled' : ''}>Next ▶</button>
            </div>
            <div class="hole-detail-view">
                ${this.renderHoleDiagram(hole)}
            </div>
        `;
    },

    /* ── SVG Hole Diagram ─────────────────────────────── */
    renderHoleDiagram(hole, options = {}) {
        const parColor = hole.par === 3 ? '#10b981' : hole.par === 4 ? '#3b82f6' : '#d4a017';
        const holeMap = this.renderHoleMap(hole, options.mapContext);
        const hasElevationChange = hole.elevationChangeFeet !== null && hole.elevationChangeFeet !== undefined && hole.elevationChangeFeet !== '' && Number.isFinite(Number(hole.elevationChangeFeet));
        const hasElevationEndpoints = hole.teeElevationFeet !== null && hole.teeElevationFeet !== undefined && hole.greenElevationFeet !== null && hole.greenElevationFeet !== undefined && Number.isFinite(Number(hole.teeElevationFeet)) && Number.isFinite(Number(hole.greenElevationFeet));
        const hazardIcons = (hole.hazards || []).map(h =>
            `<span class="hazard-tag">${h.type.replace(/-/g,' ')} (${h.pos.replace(/-/g,' ')})</span>`
        ).join('');

        return `
            <div class="hole-diagram-container">
                <div class="hole-diagram-left">
                    <div class="hole-diagram-header">
                        <span class="hole-diagram-num">Hole ${hole.hole}</span>
                        <span class="hole-par-badge" style="background:${parColor};">Par ${hole.par}</span>
                        <span class="hole-yards-badge">${hole.yards} yds</span>
                        <span class="hole-type-badge">${hole.type}</span>
                    </div>
                    <div class="hole-svg-wrapper">
                        ${holeMap}
                    </div>
                </div>
                <div class="hole-diagram-right">
                    <div class="hole-info-section">
                        <h4>Strategy Tip</h4>
                        <p>${hole.tip}</p>
                    </div>
                    ${hole.hazards && hole.hazards.length ? `
                    <div class="hole-info-section">
                        <h4>Hazards</h4>
                        <div class="hazard-tags">${hazardIcons}</div>
                    </div>` : ''}
                    ${hole.greenShape ? `
                    <div class="hole-info-section">
                        <h4>Green Info</h4>
                        <p><strong>Shape:</strong> ${hole.greenShape.replace(/-/g,' ')} &nbsp;|&nbsp; <strong>Slope:</strong> ${(hole.greenSlope || 'varies').replace(/-/g,' ')}</p>
                    </div>` : ''}
                    ${options.afterGreenHtml || ''}
                    ${hasElevationChange || (hole.elevation && hole.elevation !== 'flat') ? `
                    <div class="hole-info-section">
                        <h4>Elevation</h4>
                        <p>${hasElevationChange ? `<strong>${Number(hole.elevationChangeFeet) > 0 ? '+' : ''}${Math.round(Number(hole.elevationChangeFeet))} ft</strong> tee to green${hasElevationEndpoints ? ` · ${Math.round(Number(hole.teeElevationFeet))} → ${Math.round(Number(hole.greenElevationFeet))} ft` : ''}` : hole.elevation.replace(/-/g,' ')}</p>
                    </div>` : ''}
                </div>
            </div>
        `;
    },

    /* ── Generate SVG for a hole ──────────────────────── */
    renderHoleMap(hole, mapContext = null) {
        const courseMap = this.generateHoleSVG(hole);
        if (!hole?.mapGeometry?.path?.length || hole.mapGeometry.path.length < 2) {
            return `<div class="hole-map-shell is-course-only">${courseMap}</div>`;
        }
        const savedLayer = (() => {
            try { return globalThis.localStorage?.getItem('coursecompass-hole-map-layer'); } catch (_) { return ''; }
        })();
        const activeLayer = savedLayer === 'course' ? 'course' : 'aerial';
        return `<div class="hole-map-shell" data-hole-map data-active-layer="${activeLayer}">
            <div class="hole-map-toolbar" role="group" aria-label="Hole map layer">
                <button type="button" class="hole-map-layer-btn ${activeLayer === 'aerial' ? 'active' : ''}" data-map-layer="aerial" aria-pressed="${activeLayer === 'aerial'}" onclick="Caddie.setHoleMapLayer(this, 'aerial')">Aerial</button>
                <button type="button" class="hole-map-layer-btn ${activeLayer === 'course' ? 'active' : ''}" data-map-layer="course" aria-pressed="${activeLayer === 'course'}" onclick="Caddie.setHoleMapLayer(this, 'course')">Course</button>
                <button type="button" class="hole-map-layer-btn" onclick="Caddie.toggleAerialOrientation(this)">Orient hole</button>
                ${mapContext?.editable ? '<button type="button" class="hole-map-layer-btn" onclick="Scoring.openCurrentCourseEditor()">Edit targets</button>' : ''}
            </div>
            <div class="hole-map-panel hole-map-aerial" data-map-panel="aerial" ${activeLayer !== 'aerial' ? 'hidden' : ''}>${this.generateAerialHoleMap(hole, mapContext)}</div>
            <div class="hole-map-panel" data-map-panel="course" ${activeLayer !== 'course' ? 'hidden' : ''}>${courseMap}</div>
            <p class="hole-map-status" data-map-status aria-live="polite">Live tiles require a connection. Course view remains available offline.</p>
        </div>`;
    },

    setHoleMapLayer(button, layer) {
        const shell = button?.closest?.('[data-hole-map]');
        if (!shell || !['aerial', 'course'].includes(layer)) return;
        shell.dataset.activeLayer = layer;
        shell.querySelectorAll('[data-map-layer]').forEach(item => {
            const active = item.dataset.mapLayer === layer;
            item.classList.toggle('active', active);
            item.setAttribute('aria-pressed', String(active));
        });
        shell.querySelectorAll('[data-map-panel]').forEach(panel => { panel.hidden = panel.dataset.mapPanel !== layer; });
        try { globalThis.localStorage?.setItem('coursecompass-hole-map-layer', layer); } catch (_) { /* Optional preference only. */ }
    },

    toggleAerialOrientation(button) {
        const shell = button?.closest?.('[data-hole-map]');
        const canvas = shell?.querySelector('.aerial-map-canvas');
        const rotator = canvas?.querySelector('.aerial-map-rotator');
        if (!canvas || !rotator) return;
        const holeUp = canvas.dataset.orientation !== 'hole';
        canvas.dataset.orientation = holeUp ? 'hole' : 'north';
        rotator.style.transform = holeUp ? `rotate(${Number(canvas.dataset.holeRotation) || 0}deg)` : 'none';
        button.textContent = holeUp ? 'North up' : 'Orient hole';
    },

    handleAerialTileError(image) {
        const shell = image?.closest?.('[data-hole-map]');
        if (!shell || image.dataset.failed) return;
        image.dataset.failed = 'true';
        const failures = Number(shell.dataset.tileFailures || 0) + 1;
        shell.dataset.tileFailures = String(failures);
        if (failures < 2) return;
        const status = shell.querySelector('[data-map-status]');
        if (status) status.textContent = 'Aerial imagery is unavailable here. Showing the offline course map.';
        const courseButton = shell.querySelector('[data-map-layer="course"]');
        if (courseButton) this.setHoleMapLayer(courseButton, 'course');
    },

    webMercatorPixel(point, zoom = 16) {
        const lat = Math.max(-85.05112878, Math.min(85.05112878, Number(point.lat)));
        const lon = Number(point.lon);
        const scale = 256 * (2 ** zoom);
        const sin = Math.sin(lat * Math.PI / 180);
        return {
            x: ((lon + 180) / 360) * scale,
            y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale
        };
    },

    projectAerialMapPoint(point, center, zoom = 16, width = 220, height = 440) {
        if (!point || !Number.isFinite(Number(center?.x)) || !Number.isFinite(Number(center?.y))) return null;
        const pixel = this.webMercatorPixel(point, zoom);
        if (!Number.isFinite(pixel.x) || !Number.isFinite(pixel.y)) return null;
        return { x: width / 2 + pixel.x - Number(center.x), y: height / 2 + pixel.y - Number(center.y) };
    },

    inverseWebMercatorPixel(pixel, zoom = 16) {
        const scale = 256 * (2 ** zoom);
        const lon = pixel.x / scale * 360 - 180;
        const n = Math.PI - 2 * Math.PI * pixel.y / scale;
        const lat = 180 / Math.PI * Math.atan(Math.sinh(n));
        return { lat, lon };
    },

    chooseAerialTarget(event, canvas) {
        if (!canvas || typeof Scoring === 'undefined' || Scoring.currentTool !== 'on-course') return;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        let x = (event.clientX - rect.left) * 220 / rect.width;
        let y = (event.clientY - rect.top) * 440 / rect.height;
        if (canvas.dataset.orientation === 'hole') {
            const radians = -(Number(canvas.dataset.holeRotation) || 0) * Math.PI / 180;
            const dx = x - 110, dy = y - 220;
            x = 110 + dx * Math.cos(radians) - dy * Math.sin(radians);
            y = 220 + dx * Math.sin(radians) + dy * Math.cos(radians);
        }
        const center = { x: Number(canvas.dataset.mapCenterX), y: Number(canvas.dataset.mapCenterY) };
        const zoom = Number(canvas.dataset.mapZoom) || 16;
        const world = { x: center.x - 110 + x, y: center.y - 220 + y };
        Scoring.setAerialTarget(this.inverseWebMercatorPixel(world, zoom));
    },

    updateAerialMapLive(context = {}) {
        if (typeof document === 'undefined') return;
        document.querySelectorAll('.aerial-map-canvas[data-map-center-x]').forEach(canvas => {
            const center = { x: Number(canvas.dataset.mapCenterX), y: Number(canvas.dataset.mapCenterY) };
            const zoom = Number(canvas.dataset.mapZoom) || 16;
            const project = point => this.projectAerialMapPoint(point, center, zoom);
            const player = project(context.position);
            const marker = canvas.querySelector('[data-map-player]');
            if (marker) {
                const visible = player && player.x >= -20 && player.x <= 240 && player.y >= -20 && player.y <= 460;
                marker.hidden = !visible;
                if (visible) {
                    marker.style.left = `${player.x.toFixed(1)}px`;
                    marker.style.top = `${player.y.toFixed(1)}px`;
                    marker.dataset.quality = Number(context.accuracy) <= 15 ? 'excellent' : Number(context.accuracy) <= 40 ? 'good' : 'approximate';
                }
            }
            const shotLine = canvas.querySelector('[data-map-shot-line]');
            const shotStart = project(context.shotStart);
            if (shotLine) {
                const visible = Boolean(player && shotStart);
                shotLine.hidden = !visible;
                if (visible) {
                    shotLine.setAttribute('x1', shotStart.x.toFixed(1));
                    shotLine.setAttribute('y1', shotStart.y.toFixed(1));
                    shotLine.setAttribute('x2', player.x.toFixed(1));
                    shotLine.setAttribute('y2', player.y.toFixed(1));
                }
            }
            const targetPoint = project(context.mapTarget);
            const targetMarker = canvas.querySelector('[data-map-selected-target]');
            if (targetMarker) {
                targetMarker.hidden = !targetPoint;
                if (targetPoint) {
                    targetMarker.style.left = `${targetPoint.x.toFixed(1)}px`;
                    targetMarker.style.top = `${targetPoint.y.toFixed(1)}px`;
                }
            }
            canvas.querySelectorAll('[data-map-distance]').forEach(item => {
                const target = (context.targets || []).find(value => value.key === item.dataset.mapDistance);
                item.hidden = !Number.isFinite(Number(target?.yards));
                if (target && Number.isFinite(Number(target.yards))) item.querySelector('strong').textContent = Math.round(Number(target.yards));
            });
            const distanceStrip = canvas.querySelector('[data-map-distance-strip]');
            if (distanceStrip) distanceStrip.hidden = !(context.targets || []).some(value => Number.isFinite(Number(value.yards)));
            const hazardView = canvas.querySelector('[data-map-hazards]');
            if (hazardView) {
                const hazards = (context.hazards || []).filter(value => Number.isFinite(Number(value.yards))).slice(0, 2);
                hazardView.hidden = hazards.length === 0;
                hazardView.textContent = hazards.map(value => `${value.type === 'water' ? 'Water' : 'Bunker'} ${Math.round(Number(value.yards))} yd`).join(' · ');
            }
        });
    },

    generateAerialHoleMap(hole, mapContext = null) {
        const path = (hole?.mapGeometry?.path || []).filter(point => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon))).slice(0, 100);
        const features = (hole?.mapGeometry?.features || []).slice(0, 30);
        if (path.length < 2) return this.generateHoleSVG(hole);

        const width = 220, height = 440;
        const geographicPoints = [...path, ...features.flatMap(feature => feature.geometry || [])]
            .filter(point => Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lon)));
        let zoom = 16;
        for (let candidate = 16; candidate >= 13; candidate -= 1) {
            const candidatePixels = geographicPoints.map(point => this.webMercatorPixel(point, candidate));
            const spanX = Math.max(...candidatePixels.map(point => point.x)) - Math.min(...candidatePixels.map(point => point.x));
            const spanY = Math.max(...candidatePixels.map(point => point.y)) - Math.min(...candidatePixels.map(point => point.y));
            zoom = candidate;
            if (spanX <= 188 && spanY <= 390) break;
        }
        const pixels = geographicPoints.map(point => this.webMercatorPixel(point, zoom));
        const center = {
            x: (Math.min(...pixels.map(point => point.x)) + Math.max(...pixels.map(point => point.x))) / 2,
            y: (Math.min(...pixels.map(point => point.y)) + Math.max(...pixels.map(point => point.y))) / 2
        };
        const project = point => this.projectAerialMapPoint(point, center, zoom, width, height);
        const points = items => items.map(point => {
            const value = project(point);
            return `${value.x.toFixed(1)},${value.y.toFixed(1)}`;
        }).join(' ');

        const minTileX = Math.floor((center.x - width / 2) / 256);
        const maxTileX = Math.floor((center.x + width / 2) / 256);
        const minTileY = Math.floor((center.y - height / 2) / 256);
        const maxTileY = Math.floor((center.y + height / 2) / 256);
        const tileLimit = 2 ** zoom;
        const tiles = [];
        for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
            for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
                if (tileY < 0 || tileY >= tileLimit) continue;
                const wrappedX = ((tileX % tileLimit) + tileLimit) % tileLimit;
                const left = tileX * 256 - (center.x - width / 2);
                const top = tileY * 256 - (center.y - height / 2);
                tiles.push(`<img class="aerial-map-tile" src="https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/${zoom}/${tileY}/${wrappedX}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="left:${left.toFixed(2)}px;top:${top.toFixed(2)}px" onerror="Caddie.handleAerialTileError(this)">`);
            }
        }

        const featureColors = { fairway: '#79bd53', green: '#39d879', bunker: '#f7dfaa', water: '#42bde8', tee: '#818cf8' };
        const polygons = features.filter(feature => feature.geometry?.length >= 3).map(feature =>
            `<polygon points="${points(feature.geometry)}" fill="${featureColors[feature.type] || '#8ebd63'}" fill-opacity=".24" stroke="${featureColors[feature.type] || '#d7ead1'}" stroke-width="1.5"/>`
        ).join('');
        const tee = project(path[0]), green = project(path[path.length - 1]);
        const holeRotation = -(Math.atan2(green.x - tee.x, tee.y - green.y) * 180 / Math.PI);
        const player = project(mapContext?.position);
        const shotStart = project(mapContext?.shotStart);
        const selectedTarget = project(mapContext?.mapTarget);
        const liveTargets = Array.isArray(mapContext?.targets) ? mapContext.targets : [];
        const targetLabels = { front: 'F', center: 'C', back: 'B', pin: 'Pin' };
        const targetStrip = ['front', 'center', 'back', 'pin'].map(key => {
            const target = liveTargets.find(value => value.key === key);
            const visible = Number.isFinite(Number(target?.yards));
            return `<span data-map-distance="${key}" ${visible ? '' : 'hidden'}><small>${targetLabels[key]}</small><strong>${visible ? Math.round(Number(target.yards)) : '—'}</strong><i>yd</i></span>`;
        }).join('');
        const hazardText = (mapContext?.hazards || []).filter(value => Number.isFinite(Number(value.yards))).slice(0, 2)
            .map(value => `${value.type === 'water' ? 'Water' : 'Bunker'} ${Math.round(Number(value.yards))} yd`).join(' · ');
        const playerVisible = Boolean(player && player.x >= -20 && player.x <= 240 && player.y >= -20 && player.y <= 460);
        return `<div class="aerial-map-canvas" role="img" aria-label="USGS aerial imagery for hole ${Number(hole.hole) || 1} with mapped course overlay. Tap to choose a shot target." data-map-center-x="${center.x}" data-map-center-y="${center.y}" data-map-zoom="${zoom}" data-hole-rotation="${holeRotation.toFixed(2)}" data-orientation="north" onclick="Caddie.chooseAerialTarget(event, this)">
            <div class="aerial-map-rotator">
            <div class="aerial-tile-layer">${tiles.join('')}</div>
            <svg class="aerial-map-overlay" viewBox="0 0 ${width} ${height}" aria-hidden="true">
                ${polygons}
                <polyline points="${points(path)}" fill="none" stroke="rgba(4,20,14,.72)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
                <polyline points="${points(path)}" fill="none" stroke="#f8faf7" stroke-width="2.25" stroke-dasharray="7 5" stroke-linecap="round"/>
                <circle cx="${tee.x.toFixed(1)}" cy="${tee.y.toFixed(1)}" r="8" fill="#4338ca" stroke="#fff" stroke-width="2.5"/>
                <circle cx="${green.x.toFixed(1)}" cy="${green.y.toFixed(1)}" r="10" fill="#16a34a" stroke="#fff" stroke-width="2.5"/>
                <line data-map-shot-line ${player && shotStart ? `x1="${shotStart.x.toFixed(1)}" y1="${shotStart.y.toFixed(1)}" x2="${player.x.toFixed(1)}" y2="${player.y.toFixed(1)}"` : 'hidden'} class="aerial-live-shot-line"/>
            </svg>
            <span class="aerial-map-label aerial-map-label-tee" style="left:${tee.x.toFixed(1)}px;top:${tee.y.toFixed(1)}px">TEE</span>
            <span class="aerial-map-label aerial-map-label-green" style="left:${green.x.toFixed(1)}px;top:${green.y.toFixed(1)}px">GREEN</span>
            <span class="aerial-player-marker" data-map-player data-quality="${Number(mapContext?.accuracy) <= 15 ? 'excellent' : Number(mapContext?.accuracy) <= 40 ? 'good' : 'approximate'}" ${playerVisible ? `style="left:${player.x.toFixed(1)}px;top:${player.y.toFixed(1)}px"` : 'hidden'}><i></i><b>YOU</b></span>
            <span class="aerial-selected-target" data-map-selected-target ${selectedTarget ? `style="left:${selectedTarget.x.toFixed(1)}px;top:${selectedTarget.y.toFixed(1)}px"` : 'hidden'}><i></i><b>TARGET</b></span>
            </div>
            <div class="aerial-live-distances" data-map-distance-strip aria-label="Live green distances" ${liveTargets.some(value => Number.isFinite(Number(value.yards))) ? '' : 'hidden'}>${targetStrip}</div>
            <div class="aerial-live-hazards" data-map-hazards ${hazardText ? '' : 'hidden'}>${hazardText}</div>
            <span class="aerial-map-north" aria-hidden="true">N<br><i></i></span>
            <span class="aerial-map-credit">USDA / USGS The National Map</span>
        </div>`;
    },

    generateHoleSVG(hole) {
        if (hole?.mapGeometry?.path?.length >= 2) return this.generateMappedHoleSVG(hole);
        const w = 220, h = 440;
        const fairwayColor = '#4a8526';
        const roughColor = '#3a6b1e';
        const greenColor = '#22c55e';
        const bunkerColor = '#f5e6c8';
        const waterColor = '#38bdf8';
        const teeColor = '#6366f1';

        // Determine fairway path based on shape
        let fairwayPath;
        switch (hole.fairwayShape) {
            case 'dogleg-left':
                fairwayPath = `M 85,410 Q 85,280 65,200 Q 50,140 80,60 L 140,60 Q 170,140 155,200 Q 135,280 135,410 Z`;
                break;
            case 'dogleg-right':
                fairwayPath = `M 85,410 Q 85,280 105,200 Q 120,140 150,60 L 200,60 Q 180,140 165,200 Q 145,280 145,410 Z`;
                break;
            case 's-curve':
                fairwayPath = `M 80,410 Q 60,320 80,250 Q 100,180 120,130 Q 140,80 110,40 L 170,40 Q 200,80 170,130 Q 150,180 140,250 Q 120,320 140,410 Z`;
                break;
            default: // straight
                fairwayPath = `M 85,410 Q 80,250 90,60 L 150,60 Q 140,250 135,410 Z`;
        }

        // Elevation indicators
        let elevationArrow = '';
        if (hole.elevation === 'uphill' || hole.elevation === 'steep-uphill') {
            elevationArrow = `<text x="200" y="230" font-size="20" fill="#fff" opacity="0.7">⬆</text><text x="194" y="255" font-size="8" fill="#fff" opacity="0.6">UPHILL</text>`;
        } else if (hole.elevation === 'downhill' || hole.elevation === 'steep-downhill') {
            elevationArrow = `<text x="200" y="230" font-size="20" fill="#fff" opacity="0.7">⬇</text><text x="190" y="255" font-size="8" fill="#fff" opacity="0.6">DOWNHILL</text>`;
        }

        // Hazard SVG elements
        let hazardSVG = '';
        const positions = {
            'left-fairway': [52, 310], 'right-fairway': [160, 310], 'center-fairway': [110, 300],
            'left-green': [55, 70], 'right-green': [165, 70], 'front-green': [110, 100],
            'front': [110, 110], 'back': [110, 30], 'left': [45, 70], 'right': [175, 70],
            'front-left': [65, 100], 'front-right': [155, 100], 'back-green': [110, 30],
            'center': [110, 220], 'all': [110, 90],
            'right-tee': [170, 395], 'both': [30, 250]
        };
        (hole.hazards || []).forEach(hz => {
            const [cx, cy] = positions[hz.pos] || [110, 200];
            if (hz.type === 'water' || hz.type === 'ocean' || hz.type === 'lake' || hz.type === 'burn') {
                hazardSVG += `<ellipse cx="${cx}" cy="${cy}" rx="18" ry="10" fill="${waterColor}" opacity="0.7"/>
                              <text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="10">💧</text>`;
            } else if (hz.type === 'bunker' || hz.type === 'cross-bunker' || hz.type === 'bunker-hell') {
                hazardSVG += `<ellipse cx="${cx}" cy="${cy}" rx="12" ry="7" fill="${bunkerColor}" stroke="#c4a882" stroke-width="1"/>`;
            } else if (hz.type === 'marsh' || hz.type === 'fescue' || hz.type === 'waste-area') {
                hazardSVG += `<rect x="${cx-12}" y="${cy-6}" width="24" height="12" rx="3" fill="#92702e" opacity="0.6"/>`;
            } else if (hz.type === 'trees' || hz.type === 'gorse') {
                hazardSVG += `<text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="14">🌲</text>`;
            } else if (hz.type === 'canyon' || hz.type === 'cliff') {
                hazardSVG += `<line x1="${cx-8}" y1="${cy-15}" x2="${cx-8}" y2="${cy+15}" stroke="#64748b" stroke-width="3" stroke-dasharray="4,3"/>`;
            } else if (hz.type === 'dunes') {
                hazardSVG += `<text x="${cx}" y="${cy+4}" text-anchor="middle" font-size="9" font-weight="700">B</text>`;
            } else if (hz.type === 'road') {
                hazardSVG += `<line x1="${cx-15}" y1="${cy}" x2="${cx+15}" y2="${cy}" stroke="#64748b" stroke-width="3"/>`;
            } else if (hz.type === 'valley') {
                hazardSVG += `<path d="M ${cx-15},${cy-5} L ${cx},${cy+8} L ${cx+15},${cy-5}" fill="none" stroke="#64748b" stroke-width="2"/>`;
            }
        });

        // Green shape
        let greenSVG;
        switch (hole.greenShape) {
            case 'kidney':
                greenSVG = `<path d="M 93,40 Q 80,30 90,20 Q 110,10 130,20 Q 140,30 127,40 Q 115,35 93,40 Z" fill="${greenColor}"/>`;
                break;
            case 'narrow':
            case 'narrow-deep':
                greenSVG = `<ellipse cx="110" cy="35" rx="18" ry="22" fill="${greenColor}"/>`;
                break;
            case 'wide':
            case 'wide-shallow':
            case 'shared':
            case 'shared-huge':
                greenSVG = `<ellipse cx="110" cy="38" rx="35" ry="16" fill="${greenColor}"/>`;
                break;
            case 'deep':
                greenSVG = `<ellipse cx="110" cy="35" rx="22" ry="25" fill="${greenColor}"/>`;
                break;
            case 'tiered':
                greenSVG = `<ellipse cx="110" cy="35" rx="25" ry="20" fill="${greenColor}"/>
                            <line x1="90" y1="35" x2="130" y2="35" stroke="#1a9040" stroke-width="1" stroke-dasharray="3,2"/>`;
                break;
            case 'hourglass':
                greenSVG = `<path d="M 90,20 Q 85,15 95,10 L 125,10 Q 135,15 130,20 Q 120,30 130,40 Q 135,45 125,50 L 95,50 Q 85,45 90,40 Q 100,30 90,20 Z" fill="${greenColor}"/>`;
                break;
            case 'island':
                greenSVG = `<ellipse cx="110" cy="35" rx="30" ry="22" fill="${waterColor}" opacity="0.5"/>
                            <ellipse cx="110" cy="35" rx="22" ry="16" fill="${greenColor}"/>`;
                break;
            case 'crowned':
                greenSVG = `<ellipse cx="110" cy="35" rx="25" ry="18" fill="${greenColor}"/>
                            <path d="M 98,28 Q 110,22 122,28" fill="none" stroke="#1a9040" stroke-width="1.5"/>`;
                break;
            case 'tiny-round':
                greenSVG = `<circle cx="110" cy="35" r="12" fill="${greenColor}"/>`;
                break;
            default:
                greenSVG = `<ellipse cx="110" cy="35" rx="25" ry="18" fill="${greenColor}"/>`;
        }

        // Flag
        const flagSVG = `<line x1="110" y1="38" x2="110" y2="18" stroke="#fff" stroke-width="1.5"/>
                         <polygon points="110,18 125,23 110,28" fill="#ef4444"/>`;

        // Tee box
        const teeSVG = `<rect x="100" y="405" width="20" height="8" rx="2" fill="${teeColor}"/>
                        <text x="110" y="430" text-anchor="middle" font-size="9" fill="#fff" font-weight="700">TEE</text>`;

        // Shot trajectory (dashed line)
        let trajectoryPath;
        switch (hole.fairwayShape) {
            case 'dogleg-left':
                trajectoryPath = `M 110,405 Q 100,280 80,140 Q 75,90 110,35`;
                break;
            case 'dogleg-right':
                trajectoryPath = `M 110,405 Q 120,280 140,140 Q 155,90 110,35`;
                break;
            default:
                trajectoryPath = `M 110,405 Q 110,250 110,35`;
        }

        return `
            <svg viewBox="0 0 ${w} ${h}" class="hole-svg" xmlns="http://www.w3.org/2000/svg">
                <!-- Sky gradient -->
                <defs>
                    <linearGradient id="sky-${hole.hole}" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#87ceeb"/>
                        <stop offset="18%" stop-color="#87ceeb"/>
                        <stop offset="22%" stop-color="${roughColor}"/>
                        <stop offset="100%" stop-color="${roughColor}"/>
                    </linearGradient>
                </defs>
                <rect width="${w}" height="${h}" fill="url(#sky-${hole.hole})" rx="12"/>

                <!-- Fairway -->
                <path d="${fairwayPath}" fill="${fairwayColor}" opacity="0.9"/>

                <!-- Green -->
                ${greenSVG}
                ${flagSVG}

                <!-- Hazards -->
                ${hazardSVG}

                <!-- Shot trajectory -->
                <path d="${trajectoryPath}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-dasharray="6,4"/>

                <!-- Tee box -->
                ${teeSVG}

                <!-- Elevation -->
                ${elevationArrow}

                <!-- Yardage label -->
                <rect x="75" y="210" width="70" height="22" rx="11" fill="rgba(0,0,0,0.5)"/>
                <text x="110" y="225" text-anchor="middle" font-size="11" fill="#fff" font-weight="600">${hole.yards} yds</text>
            </svg>
        `;
    },

    generateMappedHoleSVG(hole) {
        const path = hole.mapGeometry.path.slice(0, 100);
        const features = (hole.mapGeometry.features || []).slice(0, 30);
        const meanLat = path.reduce((sum, point) => sum + Number(point.lat), 0) / path.length;
        const cosLat = Math.max(0.1, Math.cos(meanLat * Math.PI / 180));
        const origin = path[0];
        const local = point => ({ x: (Number(point.lon) - origin.lon) * cosLat, y: Number(point.lat) - origin.lat });
        const end = local(path[path.length - 1]);
        const angle = Math.atan2(end.y, end.x) - Math.PI / 2;
        const rotate = point => {
            const value = local(point), c = Math.cos(-angle), s = Math.sin(-angle);
            return { x: value.x * c - value.y * s, y: value.x * s + value.y * c };
        };
        const all = [...path, ...features.flatMap(feature => feature.geometry || [])].map(rotate);
        const minX = Math.min(...all.map(point => point.x)), maxX = Math.max(...all.map(point => point.x));
        const minY = Math.min(...all.map(point => point.y)), maxY = Math.max(...all.map(point => point.y));
        const scale = Math.min(176 / Math.max(maxX - minX, 0.000001), 366 / Math.max(maxY - minY, 0.000001));
        const project = point => {
            const value = rotate(point);
            return { x: 22 + (value.x - minX) * scale, y: 410 - (value.y - minY) * scale };
        };
        const points = items => items.map(point => { const value = project(point); return `${value.x.toFixed(1)},${value.y.toFixed(1)}`; }).join(' ');
        const colors = { fairway: '#4a8526', green: '#22c55e', bunker: '#f5e6c8', water: '#38bdf8', tee: '#6366f1' };
        const polygons = features.filter(feature => feature.geometry?.length >= 3).map(feature => `<polygon points="${points(feature.geometry)}" fill="${colors[feature.type] || '#6b8e3d'}" stroke="rgba(255,255,255,.35)" stroke-width="1" opacity="${feature.type === 'water' ? '.82' : '.94'}"/>`).join('');
        const line = points(path);
        const tee = project(path[0]), green = project(path[path.length - 1]);
        const gradientId = `mapped-${Number(hole.hole) || 0}`;
        return `<svg viewBox="0 0 220 440" class="hole-svg mapped-hole-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapped layout for hole ${Number(hole.hole) || 1}">
            <defs><linearGradient id="${gradientId}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#487629"/><stop offset="1" stop-color="#284d20"/></linearGradient></defs>
            <rect width="220" height="440" rx="12" fill="url(#${gradientId})"/>
            ${polygons}
            <polyline points="${line}" fill="none" stroke="#72b84a" stroke-width="24" stroke-linecap="round" stroke-linejoin="round" opacity=".76"/>
            <polyline points="${line}" fill="none" stroke="rgba(255,255,255,.7)" stroke-width="2" stroke-dasharray="6 5" stroke-linecap="round"/>
            <circle cx="${tee.x.toFixed(1)}" cy="${tee.y.toFixed(1)}" r="8" fill="#6366f1" stroke="#fff" stroke-width="2"/><text x="${tee.x.toFixed(1)}" y="${(tee.y + 20).toFixed(1)}" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">TEE</text>
            <circle cx="${green.x.toFixed(1)}" cy="${green.y.toFixed(1)}" r="12" fill="#22c55e" stroke="#fff" stroke-width="2"/><line x1="${green.x.toFixed(1)}" y1="${green.y.toFixed(1)}" x2="${green.x.toFixed(1)}" y2="${(green.y - 24).toFixed(1)}" stroke="#fff" stroke-width="2"/><path d="M ${green.x.toFixed(1)},${(green.y - 24).toFixed(1)} l 14,5 l -14,5 z" fill="#ef4444"/>
            <rect x="8" y="8" width="70" height="20" rx="10" fill="rgba(0,0,0,.62)"/><text x="43" y="21.5" text-anchor="middle" fill="#fff" font-size="9" font-weight="700">OSM MAP</text>
            <rect x="75" y="210" width="70" height="22" rx="11" fill="rgba(0,0,0,.58)"/><text x="110" y="225" text-anchor="middle" fill="#fff" font-size="11" font-weight="700">${Number(hole.yards) || 0} yds</text>
        </svg>`;
    },

    renderHoleCard(hole) {
        const parColor = hole.par === 3 ? '#10b981' : hole.par === 4 ? '#3b82f6' : '#d4a017';
        return `
            <div class="hole-layout-card" data-hole-card="${hole.hole}" style="cursor:pointer;" title="Click to view detailed diagram">
                <div class="hole-num">Hole ${hole.hole}</div>
                <div style="display: flex; justify-content: center; gap: 12px; margin-top: 8px;">
                    <span style="background: ${parColor}; color: white; padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 700;">Par ${hole.par}</span>
                    <span style="background: var(--bg-tertiary); padding: 2px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;">${hole.yards} yds</span>
                </div>
                <div class="hole-mini-map">
                    ${this.generateHoleSVG(hole)}
                </div>
                <div class="hole-info" style="margin-top: 8px;">
                    <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5;">${hole.tip}</p>
                </div>
            </div>
        `;
    },

    /* ── Geolocation: find nearest course ────────────── */
    detectNearestCourse() {
        const msgEl = document.getElementById('geoMessage');
        const showMsg = (text, type) => {
            this._courseState.geoMessage = text;
            if (msgEl) { msgEl.textContent = text; msgEl.className = 'geo-message show ' + type; }
        };

        if (!navigator.geolocation) {
            showMsg('⚠️ Geolocation is not supported by your browser.', 'warn');
            return;
        }

        showMsg('📡 Detecting your location...', 'info');

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLon = position.coords.longitude;

                // Haversine distance
                const toRad = d => d * Math.PI / 180;
                const haversine = (lat1, lon1, lat2, lon2) => {
                    const R = 3959; // miles
                    const dLat = toRad(lat2 - lat1);
                    const dLon = toRad(lon2 - lon1);
                    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2;
                    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                };

                let nearest = null, minDist = Infinity;
                GolfData.allCourses.forEach(c => {
                    const d = haversine(userLat, userLon, c.lat, c.lon);
                    if (d < minDist) { minDist = d; nearest = c; }
                });

                if (nearest) {
                    this._courseState.selectedCourseId = nearest.id;
                    GolfData.selectedCourseId = nearest.id;
                    this._courseState.geoDetected = true;
                    showMsg(`📍 Nearest course: ${nearest.name} (${Math.round(minDist)} miles away)`, 'success');
                    // Re-render with selected course
                    const container = document.getElementById('caddieContent');
                    container.innerHTML = this.renderCourseStrategy();
                    this.bindCourseEvents();
                }
            },
            (error) => {
                const msgs = {
                    1: '⚠️ Location permission denied. Please enable location access.',
                    2: '⚠️ Location unavailable. Please try again.',
                    3: '⚠️ Location request timed out. Please try again.'
                };
                showMsg(msgs[error.code] || '⚠️ Could not detect location.', 'warn');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    },

    /* ── Bind course view events ─────────────────────── */
    bindCourseEvents() {
        // Course selector
        const sel = document.getElementById('courseSelect');
        if (sel) {
            sel.addEventListener('change', () => {
                this._courseState.selectedCourseId = sel.value;
                GolfData.selectedCourseId = sel.value;
                this._courseState.currentHole = 1;
                const container = document.getElementById('caddieContent');
                container.innerHTML = this.renderCourseStrategy();
                this.bindCourseEvents();
            });
        }

        // Geolocation button
        const geoBtn = document.getElementById('geoDetectBtn');
        if (geoBtn) {
            geoBtn.addEventListener('click', () => this.detectNearestCourse());
        }

        // View mode toggle
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._courseState.viewMode = btn.dataset.mode;
                this._courseState.currentHole = 1;
                const container = document.getElementById('caddieContent');
                container.innerHTML = this.renderCourseStrategy();
                this.bindCourseEvents();
            });
        });

        // Hole-by-hole navigation
        const prevBtn = document.getElementById('holePrev');
        const nextBtn = document.getElementById('holeNext');
        if (prevBtn) prevBtn.addEventListener('click', () => this.navigateHole(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateHole(1));

        // Hole dot navigation
        document.querySelectorAll('.hole-dot').forEach(dot => {
            dot.addEventListener('click', () => {
                this._courseState.currentHole = parseInt(dot.dataset.hole);
                this.refreshHoleView();
            });
        });

        // Full course view — click card to switch to hole view
        document.querySelectorAll('[data-hole-card]').forEach(card => {
            card.addEventListener('click', () => {
                this._courseState.viewMode = 'hole';
                this._courseState.currentHole = parseInt(card.dataset.holeCard);
                const container = document.getElementById('caddieContent');
                container.innerHTML = this.renderCourseStrategy();
                this.bindCourseEvents();
            });
        });

        // Discover button
        const discoverBtn = document.getElementById('discoverCoursesBtn');
        if (discoverBtn) {
            discoverBtn.addEventListener('click', () => this.discoverNearbyCourses());
        }

        const openImportBtn = document.getElementById('openCourseImportBtn');
        if (openImportBtn) {
            openImportBtn.addEventListener('click', () => {
                this._courseState.viewMode = 'open-import';
                this._courseState.openSearchError = '';
                this.refreshCourseStrategy();
            });
        }

        const openSearchForm = document.getElementById('openCourseSearchForm');
        if (openSearchForm) {
            openSearchForm.addEventListener('submit', event => {
                event.preventDefault();
                this.searchOpenCourses(document.getElementById('openCourseSearch')?.value);
            });
        }

        document.querySelectorAll('.open-preview-btn').forEach(button => {
            button.addEventListener('click', () => this.previewOpenCourse(button.dataset.courseId));
        });

        const openTeeSelect = document.getElementById('openTeeSelect');
        if (openTeeSelect) {
            openTeeSelect.addEventListener('change', () => {
                this._courseState.openSelectedTeeId = openTeeSelect.value;
                this.refreshCourseStrategy();
            });
        }

        document.getElementById('importOpenCourseBtn')?.addEventListener('click', () => this.importOpenCourse());
        document.getElementById('enrichCourseBtn')?.addEventListener('click', () => this.enrichSelectedCourse());
        document.getElementById('openImportBackBtn')?.addEventListener('click', () => {
            this._courseState.viewMode = 'full';
            this.refreshCourseStrategy();
        });

        // Add Course button → show builder
        const addBtn = document.getElementById('addCourseBtn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this._courseState.builderCourseId = null;
                this._courseState.viewMode = 'builder';
                const container = document.getElementById('caddieContent');
                container.innerHTML = this.renderCourseStrategy();
                this.bindCourseEvents();
            });
        }

        const editBtn = document.getElementById('editCourseBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                this._courseState.builderCourseId = this._courseState.selectedCourseId;
                this._courseState.viewMode = 'builder';
                this.refreshCourseStrategy();
            });
        }

        // Remove custom course
        const removeBtn = document.getElementById('removeCourseBtn');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                const course = GolfData.allCourses.find(c => c.id === this._courseState.selectedCourseId);
                if (course && confirm(`Remove "${course.name}" from your custom courses?`)) {
                    GolfData.removeCustomCourse(course.id);
                    this._courseState.selectedCourseId = GolfData.courses[0]?.id || '';
                    GolfData.selectedCourseId = this._courseState.selectedCourseId;
                    this._courseState.geoMessage = `🗑️ "${course.name}" removed.`;
                    const container = document.getElementById('caddieContent');
                    container.innerHTML = this.renderCourseStrategy();
                    this.bindCourseEvents();
                }
            });
        }

        // Discover panel — add buttons
        document.querySelectorAll('.discover-add-btn').forEach(btn => {
            btn.addEventListener('click', () => this.addDiscoveredCourse(parseInt(btn.dataset.idx)));
        });

        // Discover back button
        const discoverBack = document.getElementById('discoverBackBtn');
        if (discoverBack) {
            discoverBack.addEventListener('click', () => {
                this._courseState.viewMode = 'full';
                const container = document.getElementById('caddieContent');
                container.innerHTML = this.renderCourseStrategy();
                this.bindCourseEvents();
            });
        }

        // Builder back button
        const builderBack = document.getElementById('builderBackBtn');
        if (builderBack) {
            builderBack.addEventListener('click', () => {
                this._courseState.builderCourseId = null;
                this._courseState.viewMode = 'full';
                const container = document.getElementById('caddieContent');
                container.innerHTML = this.renderCourseStrategy();
                this.bindCourseEvents();
            });
        }

        // Builder form submit
        const builderForm = document.getElementById('courseBuilderForm');
        if (builderForm) {
            builderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveCourseFromBuilder();
            });
        }

        // Builder GPS fill
        const gpsBtn = document.getElementById('cb-fill-gps');
        if (gpsBtn) {
            gpsBtn.addEventListener('click', () => {
                if (!navigator.geolocation) { alert('Geolocation not supported.'); return; }
                gpsBtn.textContent = '📡 Getting location...';
                navigator.geolocation.getCurrentPosition(
                    pos => {
                        document.getElementById('cb-lat').value = pos.coords.latitude.toFixed(6);
                        document.getElementById('cb-lon').value = pos.coords.longitude.toFixed(6);
                        gpsBtn.textContent = '✅ GPS Filled!';
                        setTimeout(() => { gpsBtn.textContent = '📍 Fill GPS from My Location'; }, 2000);
                    },
                    () => { gpsBtn.textContent = '⚠️ Failed'; setTimeout(() => { gpsBtn.textContent = '📍 Fill GPS from My Location'; }, 2000); },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });
        }

        document.querySelectorAll('.hole-coordinate-gps').forEach(button => {
            button.addEventListener('click', () => this.fillHoleCoordinateFromGps(Number(button.dataset.hole), button.dataset.endpoint, button));
        });
        document.querySelectorAll('.hole-visual-target').forEach(button => {
            button.addEventListener('click', () => this.openVisualTargetEditor(Number(button.dataset.hole)));
        });
    },

    fillHoleCoordinateFromGps(hole, endpoint, button) {
        if (!navigator.geolocation || !Number.isInteger(hole) || !['tee', 'green-front', 'green', 'green-back'].includes(endpoint)) return;
        const original = button?.textContent || 'Use my location';
        if (button) { button.disabled = true; button.textContent = 'Getting GPS…'; }
        navigator.geolocation.getCurrentPosition(position => {
            const lat = document.querySelector(`.hole-${endpoint}-lat[data-hole="${hole}"]`);
            const lon = document.querySelector(`.hole-${endpoint}-lon[data-hole="${hole}"]`);
            if (lat) lat.value = Number(position.coords.latitude).toFixed(7);
            if (lon) lon.value = Number(position.coords.longitude).toFixed(7);
            if (button) { button.disabled = false; button.textContent = '✓ Location captured'; }
        }, () => {
            if (button) { button.disabled = false; button.textContent = 'GPS unavailable'; setTimeout(() => { button.textContent = original; }, 2000); }
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
    },

    getBuilderTargetPoint(hole, target) {
        const classes = {
            tee: ['hole-tee-lat', 'hole-tee-lon'],
            front: ['hole-green-front-lat', 'hole-green-front-lon'],
            center: ['hole-green-lat', 'hole-green-lon'],
            back: ['hole-green-back-lat', 'hole-green-back-lon']
        };
        const pair = classes[target];
        if (!pair) return null;
        const latRaw = document.querySelector(`.${pair[0]}[data-hole="${hole}"]`)?.value;
        const lonRaw = document.querySelector(`.${pair[1]}[data-hole="${hole}"]`)?.value;
        if (latRaw === '' || latRaw === undefined || lonRaw === '' || lonRaw === undefined) return null;
        const lat = Number(latRaw), lon = Number(lonRaw);
        return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
    },

    getVisualTargetBounds(points, anchor) {
        const list = points.filter(Boolean);
        if (!list.length && anchor) list.push(anchor);
        if (!list.length) return null;
        const lats = list.map(point => point.lat), lons = list.map(point => point.lon);
        const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;
        const minimumSpan = list.length < 2 ? 0.006 : 0.0015;
        const latSpan = Math.max(minimumSpan, (Math.max(...lats) - Math.min(...lats)) * 1.5);
        const lonSpan = Math.max(minimumSpan, (Math.max(...lons) - Math.min(...lons)) * 1.5);
        return { minLat: centerLat - latSpan / 2, maxLat: centerLat + latSpan / 2, minLon: centerLon - lonSpan / 2, maxLon: centerLon + lonSpan / 2 };
    },

    renderVisualTargetEditor(hole) {
        const targets = ['tee', 'front', 'center', 'back'];
        const points = Object.fromEntries(targets.map(target => [target, this.getBuilderTargetPoint(hole, target)]));
        const courseLatRaw = document.getElementById('cb-lat')?.value, courseLonRaw = document.getElementById('cb-lon')?.value;
        const courseLat = Number(courseLatRaw), courseLon = Number(courseLonRaw);
        const anchor = courseLatRaw !== '' && courseLatRaw !== undefined && courseLonRaw !== '' && courseLonRaw !== undefined && Number.isFinite(courseLat) && Number.isFinite(courseLon) && Math.abs(courseLat) <= 90 && Math.abs(courseLon) <= 180 ? { lat: courseLat, lon: courseLon } : null;
        const bounds = this.getVisualTargetBounds(Object.values(points), anchor);
        if (!bounds) return `<div class="visual-target-shell"><div class="visual-target-heading"><div><span>Hole ${hole}</span><h3>Visual GPS target editor</h3></div><button type="button" class="visual-target-close" aria-label="Close">×</button></div><div class="visual-target-empty"><strong>Add an anchor first</strong><p>Enter the course latitude/longitude or capture at least one tee or green point, then reopen the visual editor.</p></div></div>`;
        const project = point => point ? {
            x: 20 + ((point.lon - bounds.minLon) / (bounds.maxLon - bounds.minLon)) * 280,
            y: 20 + ((bounds.maxLat - point.lat) / (bounds.maxLat - bounds.minLat)) * 460
        } : null;
        const projected = Object.fromEntries(targets.map(target => [target, project(points[target])]));
        const colors = { tee: '#6366f1', front: '#f59e0b', center: '#16a34a', back: '#0f766e' };
        const labels = { tee: 'Tee', front: 'Front', center: 'Center', back: 'Back' };
        const linePoints = targets.map(target => projected[target]).filter(Boolean).map(point => `${point.x},${point.y}`).join(' ');
        const markers = targets.filter(target => projected[target]).map(target => `<g class="visual-marker" data-target="${target}" role="button" aria-label="Drag ${labels[target]} target"><circle cx="${projected[target].x}" cy="${projected[target].y}" r="10" fill="${colors[target]}" stroke="white" stroke-width="3"/><text x="${projected[target].x}" y="${projected[target].y - 15}" text-anchor="middle">${labels[target]}</text></g>`).join('');
        return `<div class="visual-target-shell">
            <div class="visual-target-heading"><div><span>Hole ${hole}</span><h3>Visual GPS target editor</h3></div><button type="button" class="visual-target-close" aria-label="Close">×</button></div>
            <p>Choose a target and tap the map to place it, or drag an existing marker to refine it. The editor writes precise coordinates back into the course form.</p>
            <div class="visual-target-toolbar"><label>Place<select class="form-select" id="visualTargetType"><option value="tee">Tee</option><option value="front">Green front</option><option value="center" selected>Green center</option><option value="back">Green back</option></select></label><button type="button" class="btn btn-sm btn-outline" id="visualTargetClear">Clear selected</button></div>
            <svg id="visualTargetCanvas" class="visual-target-canvas" viewBox="0 0 320 500" role="img" aria-label="Tap to place or drag a GPS target" data-min-lat="${bounds.minLat}" data-max-lat="${bounds.maxLat}" data-min-lon="${bounds.minLon}" data-max-lon="${bounds.maxLon}">
                <defs><linearGradient id="targetMapGrass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#dcfce7"/><stop offset="1" stop-color="#365f24"/></linearGradient></defs>
                <rect width="320" height="500" rx="18" fill="url(#targetMapGrass)"/>
                <path d="M35 460 C80 390 65 300 150 245 S245 125 280 40" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="78" stroke-linecap="round"/>
                ${linePoints ? `<polyline points="${linePoints}" fill="none" stroke="white" stroke-width="3" stroke-dasharray="8 7" opacity=".78"/>` : ''}
                ${markers}
                <text x="160" y="490" text-anchor="middle" fill="white" opacity=".75" font-size="11">Tap anywhere to place the selected target</text>
            </svg>
            <div class="visual-target-legend">${targets.map(target => `<span><i style="background:${colors[target]}"></i>${labels[target]}${points[target] ? ' ✓' : ''}</span>`).join('')}</div>
            <div class="visual-target-footer"><small>Approximate editing window. Verify important targets on the course for best accuracy.</small><button type="button" class="btn btn-primary visual-target-done">Done</button></div>
        </div>`;
    },

    openVisualTargetEditor(hole) {
        const dialog = document.getElementById('visualTargetDialog');
        if (!dialog || !Number.isInteger(hole)) return;
        dialog.dataset.hole = String(hole);
        dialog.innerHTML = this.renderVisualTargetEditor(hole);
        this.bindVisualTargetEditor(dialog, hole);
        if (!dialog.open && dialog.showModal) dialog.showModal();
    },

    bindVisualTargetEditor(dialog, hole) {
        dialog.querySelectorAll('.visual-target-close, .visual-target-done').forEach(button => button.addEventListener('click', () => dialog.close()));
        const canvas = dialog.querySelector('#visualTargetCanvas');
        if (canvas) {
            const pointFromEvent = event => {
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height) return null;
                const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
                const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
                const minLat = Number(canvas.dataset.minLat), maxLat = Number(canvas.dataset.maxLat), minLon = Number(canvas.dataset.minLon), maxLon = Number(canvas.dataset.maxLon);
                return { lat: maxLat - y * (maxLat - minLat), lon: minLon + x * (maxLon - minLon), viewX: x * 320, viewY: y * 500 };
            };
            const finishPlacement = target => {
                dialog.innerHTML = this.renderVisualTargetEditor(hole);
                const selector = dialog.querySelector('#visualTargetType');
                if (selector) selector.value = target;
                this.bindVisualTargetEditor(dialog, hole);
            };
            let draggedTarget = '';
            canvas.querySelectorAll('.visual-marker').forEach(marker => marker.addEventListener('pointerdown', event => {
                event.preventDefault();
                draggedTarget = marker.dataset.target || '';
                const selector = dialog.querySelector('#visualTargetType');
                if (selector && draggedTarget) selector.value = draggedTarget;
                marker.setPointerCapture?.(event.pointerId);
            }));
            canvas.addEventListener('pointermove', event => {
                if (!draggedTarget) return;
                event.preventDefault();
                const point = pointFromEvent(event);
                if (!point) return;
                this.setBuilderTargetPoint(hole, draggedTarget, point);
                const marker = canvas.querySelector(`.visual-marker[data-target="${draggedTarget}"]`);
                marker?.querySelector('circle')?.setAttribute('cx', point.viewX);
                marker?.querySelector('circle')?.setAttribute('cy', point.viewY);
                marker?.querySelector('text')?.setAttribute('x', point.viewX);
                marker?.querySelector('text')?.setAttribute('y', point.viewY - 15);
            });
            canvas.addEventListener('pointerup', event => {
                if (!draggedTarget) return;
                const target = draggedTarget;
                const point = pointFromEvent(event);
                draggedTarget = '';
                if (point) this.setBuilderTargetPoint(hole, target, point);
                finishPlacement(target);
            });
            canvas.addEventListener('pointercancel', () => { draggedTarget = ''; });
            canvas.addEventListener('click', event => {
            const rect = canvas.getBoundingClientRect();
            if (!rect.width || !rect.height) return;
            const point = pointFromEvent(event);
            if (!point) return;
            const target = dialog.querySelector('#visualTargetType')?.value || 'center';
            this.setBuilderTargetPoint(hole, target, point);
            finishPlacement(target);
            });
        }
        dialog.querySelector('#visualTargetClear')?.addEventListener('click', () => {
            const target = dialog.querySelector('#visualTargetType')?.value || 'center';
            this.setBuilderTargetPoint(hole, target, null);
            dialog.innerHTML = this.renderVisualTargetEditor(hole);
            const selector = dialog.querySelector('#visualTargetType');
            if (selector) selector.value = target;
            this.bindVisualTargetEditor(dialog, hole);
        });
    },

    setBuilderTargetPoint(hole, target, point) {
        const classes = { tee: ['hole-tee-lat', 'hole-tee-lon'], front: ['hole-green-front-lat', 'hole-green-front-lon'], center: ['hole-green-lat', 'hole-green-lon'], back: ['hole-green-back-lat', 'hole-green-back-lon'] };
        const pair = classes[target];
        if (!pair) return;
        const lat = document.querySelector(`.${pair[0]}[data-hole="${hole}"]`), lon = document.querySelector(`.${pair[1]}[data-hole="${hole}"]`);
        if (lat) lat.value = point ? Number(point.lat).toFixed(7) : '';
        if (lon) lon.value = point ? Number(point.lon).toFixed(7) : '';
    },

    navigateHole(delta) {
        const course = GolfData.allCourses.find(c => c.id === this._courseState.selectedCourseId) || GolfData.courses[0];
        const holes = [...(course.holes || [])].sort((a, b) => a.hole - b.hole);
        const currentIndex = holes.findIndex(h => h.hole === this._courseState.currentHole);
        const newIndex = currentIndex + delta;
        if (newIndex >= 0 && newIndex < holes.length) {
            this._courseState.currentHole = holes[newIndex].hole;
            this.refreshHoleView();
        }
    },

    refreshHoleView() {
        const course = GolfData.allCourses.find(c => c.id === this._courseState.selectedCourseId) || GolfData.courses[0];
        const area = document.getElementById('courseViewArea');
        if (area) {
            area.innerHTML = this.renderHoleByHoleView(course);
            // Rebind hole navigation
            const prevBtn = document.getElementById('holePrev');
            const nextBtn = document.getElementById('holeNext');
            if (prevBtn) prevBtn.addEventListener('click', () => this.navigateHole(-1));
            if (nextBtn) nextBtn.addEventListener('click', () => this.navigateHole(1));
            document.querySelectorAll('.hole-dot').forEach(dot => {
                dot.addEventListener('click', () => {
                    this._courseState.currentHole = parseInt(dot.dataset.hole);
                    this.refreshHoleView();
                });
            });
        }
    },

    /* ── Shot Advisor ───────────────────────────────────── */
    renderShotAdvisor() {
        return `
            <div class="caddie-panel">
                <h2>Shot Advisor</h2>
                <p class="panel-desc">Describe your situation and get shot-by-shot advice from your virtual caddie.</p>
                
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Where is your ball?</label>
                        <select class="form-select" id="saLocation">
                            <option value="tee-par3">Tee Box — Par 3</option>
                            <option value="tee-par4">Tee Box — Par 4</option>
                            <option value="tee-par5">Tee Box — Par 5</option>
                            <option value="fairway-far">Fairway — 200+ yards out</option>
                            <option value="fairway-mid">Fairway — 120-200 yards out</option>
                            <option value="fairway-close">Fairway — Under 120 yards out</option>
                            <option value="rough">In the Rough</option>
                            <option value="deep-rough">Deep Rough / Tall Grass</option>
                            <option value="bunker-fairway">Fairway Bunker</option>
                            <option value="bunker-green">Greenside Bunker</option>
                            <option value="fringe">Fringe / Apron of Green</option>
                            <option value="green-long">On Green — 30+ feet from hole</option>
                            <option value="green-mid">On Green — 10-30 feet from hole</option>
                            <option value="green-short">On Green — Under 10 feet from hole</option>
                            <option value="trees">Behind Trees</option>
                            <option value="trouble">Trouble Shot (awkward lie / obstacle)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">What's the main challenge?</label>
                        <select class="form-select" id="saChallenge">
                            <option value="none">No special challenge</option>
                            <option value="water-front">Water in front of green</option>
                            <option value="water-side">Water to the side</option>
                            <option value="bunker-front">Bunker guarding green front</option>
                            <option value="tight-pin">Pin tucked to the edge</option>
                            <option value="wind">Strong wind</option>
                            <option value="downhill-green">Downhill to the green</option>
                            <option value="uphill-green">Uphill to the green</option>
                            <option value="elevated-green">Elevated green</option>
                            <option value="fast-greens">Very fast greens</option>
                        </select>
                    </div>
                </div>
                
                <button class="btn btn-primary btn-lg btn-block" onclick="Caddie.getAdvice()">Get Caddie Advice</button>
                <div id="shotAdvice" class="mt-3"></div>
            </div>
        `;
    },

    getAdvice() {
        const location = document.getElementById('saLocation').value;
        const challenge = document.getElementById('saChallenge').value;

        const advice = this.adviceDatabase[location] || { title: 'General Advice', content: 'Focus on making solid contact and aiming for the safest target.' };
        const challengeAdvice = this.challengeDatabase[challenge] || '';

        document.getElementById('shotAdvice').innerHTML = `
            <div class="result-box">
                <h3>Caddie Recommendation</h3>
                <div class="result-detail">
                    <h4 style="color: var(--green-700); margin-top: 0;">${this.cleanPresentationText(advice.title)}</h4>
                    <p>${advice.content}</p>
                    ${challengeAdvice ? `
                        <h4 style="color: var(--gold-500); margin-top: 16px;">Challenge Adjustment: ${challenge.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                        <p>${challengeAdvice}</p>
                    ` : ''}
                    <div style="margin-top: 16px; padding: 12px; background: rgba(212,160,23,0.1); border-radius: var(--radius-sm);">
                        <strong>Key Thought:</strong> ${this.getKeyThought(location)}
                    </div>
                </div>
            </div>
        `;
    },

    cleanPresentationText(value) {
        return String(value || '').replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
    },

    adviceDatabase: {
        'tee-par3': {
            title: '🏌️ Par 3 Tee Shot',
            content: 'This is a green-in-regulation opportunity! Pick the right club for the yardage, aim for the CENTER of the green (not the flag), and make a smooth, confident swing. Par 3s are where you set up birdie chances. Tee the ball low (about a quarter inch above ground) for irons. If using a hybrid, tee it slightly higher.'
        },
        'tee-par4': {
            title: '🏌️ Par 4 Tee Shot',
            content: 'Your goal is the FAIRWAY, not maximum distance. If driver keeps you in play, use it. If you struggle with the driver, a 3-wood or even a long iron that finds the fairway is a much better play. Look for the widest part of the fairway and aim there. Leave yourself a comfortable approach distance.'
        },
        'tee-par5': {
            title: '🏌️ Par 5 Tee Shot',
            content: 'Par 5s are birdie opportunities! Make an aggressive swing but stay in control. A big drive sets up a possible eagle or easy birdie. Know the layup distances — where are the hazards? If going for the green in 2, can you realistically reach it? If not, take the smart play and lay up to your favorite wedge distance.'
        },
        'fairway-far': {
            title: '🏞️ Long Approach (200+ yards)',
            content: 'This is a hard shot — even for pros. Use a hybrid or fairway wood. Aim for the FRONT of the green; landing anywhere on the green from here is excellent. Private to this distance: a shot that finishes anywhere near the green is a success. Don\'t try to flag-hunt from this distance.'
        },
        'fairway-mid': {
            title: '🏞️ Mid-Range Approach (120-200 yards)',
            content: 'This is the scoring zone! Take the right club for your distance, aim at the center or fat part of the green, and commit to your swing. This is where GIR (greens in regulation) happen. Remember: most misses are SHORT. Take one extra club if you\'re between clubs.'
        },
        'fairway-close': {
            title: '🏞️ Short Approach (Under 120 yards)',
            content: 'Wedge territory! This is where you should be attacking the pin. Pick your landing spot (usually 5-10 yards short of the pin to account for roll), choose the right wedge, and control your distance with swing length — not swing speed. A three-quarter wedge is more accurate than a full wedge.'
        },
        'rough': {
            title: '🌿 Recovery from the Rough',
            content: 'The rough grabs your club, so: (1) Take one MORE club than normal distance calls for, (2) Open the clubface slightly to prevent the grass from closing it at impact, (3) Grip slightly firmer, (4) Make a steeper swing to get the club down to the ball. Accept that you might lose some distance and aim for the safe part of the green.'
        },
        'deep-rough': {
            title: '🌾 Deep Rough Escape',
            content: 'Survival mode! Your #1 priority is getting back to the fairway. Take your most lofted club (sand wedge or lob wedge), aim for the fairway (not the green), and make an aggressive swing down through the grass. Don\'t try to be a hero — a bogey is much better than a double or triple bogey from trying a miracle shot.'
        },
        'bunker-fairway': {
            title: '🏖️ Fairway Bunker Shot',
            content: 'Unlike a greenside bunker, you DO want to hit the ball first here. (1) Dig your feet in slightly for stability, (2) Grip down about 1 inch, (3) Ball position center or slightly back, (4) Focus on clean, ball-first contact — pick the ball clean off the sand, (5) Take one more club than normal. Swing at 75-80% to maintain control.'
        },
        'bunker-green': {
            title: '🏖️ Greenside Bunker Escape',
            content: 'Remember: hit the SAND, not the ball! (1) Open the clubface before gripping, (2) Open your stance 20-30° left, (3) Aim to enter the sand about 2 inches behind the ball, (4) Make a full, confident swing — do NOT decelerate, (5) The sand carries the ball out. For a longer bunker shot, use less open face. For high, soft shot, open the face more.'
        },
        'fringe': {
            title: '⛳ From the Fringe',
            content: 'Great position! You have several options: (1) PUTT — often the safest play if the fringe is smooth. Use a slightly firmer stroke to get through the longer grass. (2) CHIP with a 7 or 8-iron using a putting stroke. (3) If there\'s a slope or obstacle, use a wedge. The general rule: ALWAYS putt if you can, chip if you can\'t putt, pitch only if you can\'t chip.'
        },
        'green-long': {
            title: '⛳ Long Putt (30+ feet)',
            content: 'Lag putting time! Your goal is NOT to make this putt — it\'s to leave it within 3 feet of the hole for an easy tap-in. Focus on SPEED over line. Practice your backstroke length: for long putts, let the length of your backstroke (not the force) control distance. Look at the hole, look back at the ball, and let it go with a smooth pendulum stroke.'
        },
        'green-mid': {
            title: '⛳ Medium Putt (10-30 feet)',
            content: 'A realistic birdie or par-saving putt! Read the green carefully — look from behind the ball, behind the hole, and from the low side. Pick your line and a spot 2-3 feet in front of the ball to aim at. Speed matters most: try to die the ball in the front edge of the hole. A putt that goes 12-18 inches past the hole was hit at perfect speed.'
        },
        'green-short': {
            title: '⛳ Short Putt (Under 10 feet)',
            content: 'These are the money putts! Keep your head STILL through the stroke — don\'t look up until you hear the ball drop. Pick a spot on the edge of the hole and aim for it. Inside 5 feet, play less break and hit the putt firmly into the back of the hole. Commit to your line and never decelerate!'
        },
        'trees': {
            title: '🌲 Behind Trees',
            content: 'First rule: GET OUT. Don\'t try a miracle shot between a 3-foot gap in the trees. Options: (1) PUNCH SHOT — use a 5 or 6-iron, ball back in stance, short backswing, low follow-through. Keep the ball below the tree line. (2) CURVE IT — if there\'s a gap, a controlled draw or fade around the trees. Only attempt this if you\'re confident in your shot-shaping. (3) PITCH OUT — sideways or backwards to the fairway. Sometimes the smartest shot is the boring one.'
        },
        'trouble': {
            title: '⚠️ Trouble Shot Recovery',
            content: 'When you\'re in trouble, think DAMAGE CONTROL. Ask yourself: "What is the SAFEST way to give myself a chance for a bogey?" Bogey is OK from trouble — double bogey is the killer. Options: take an unplayable lie penalty (one stroke, but you get out of jail), play the safest possible shot back to the fairway, or if there\'s a reasonable shot to the green with less than 30% risk, go for it. But be honest about those odds.'
        }
    },

    challengeDatabase: {
        'water-front': 'With water in front, take EXTRA club and make sure you CLEAR it. Most players who find the water did so because they took too little club. If the carry is 150, hit a club that carries 160. It\'s always better to be OVER the green than in the water.',
        'water-side': 'Aim AWAY from the water. If water is right, aim center-left of the green. Your miss should be on the DRY side. Accept that you\'re giving up some angle to the pin for protection.',
        'bunker-front': 'Focus on carrying the bunker with enough distance to clear it. Don\'t try to land it just past the bunker — give yourself a cushion. If the pin is right behind the bunker, aim for the center of the green instead.',
        'tight-pin': 'When the pin is tucked to the edge (near a bunker or edge of green), DON\'T aim at it. Aim for the center of the green. A ball 25 feet from the hole on the green is vastly better than one in the bunker or off the green near a tight pin. Only pros should attack tight pins.',
        'wind': 'Into the wind: club UP and swing SMOOTH. A smooth 7-iron beats a hard 8-iron in the wind every time. With the wind: club down slightly. Crosswind: aim upwind and let it drift back. Key rule: swing at 80% in wind — extra spin from hard swings makes the wind effect worse.',
        'downhill-green': 'The ball will come in with less backspin and will release (roll) more when it lands. Take LESS club (the ball rolls farther) and plan for the ball to bound forward after landing.',
        'uphill-green': 'Take MORE club — uphill shots fly higher and land softer, but they don\'t carry as far. Add roughly 1 club per 20 feet of elevation rise. The ball will stop quickly on the green.',
        'elevated-green': 'An elevated green means the ball needs to carry ALL the way to the putting surface — there\'s no running the ball up. Take extra club and play for carry distance. Any shot short will roll back down.',
        'fast-greens': 'On fast greens (Stimpmeter 11+): (1) Be extra careful with approach shots — land them short and let them release to the flag. (2) Putt with a lighter touch and trust the break. (3) On downhill putts, just breathe on it. (4) Above the hole is MUCH harder than below the hole — try to leave yourself uphill putts.'
    },

    getKeyThought(location) {
        const thoughts = {
            'tee-par3': 'Hit the green. Any part of the green. That gives you a putt for birdie.',
            'tee-par4': 'Fairway first. A fairway shot with 170 yards left beats a rough shot with 140.',
            'tee-par5': 'Birdie hole! First priority is a big, straight drive to set up the approach.',
            'fairway-far': 'Anywhere on or near the green is a victory from this distance.',
            'fairway-mid': 'This is where good players make par and great players make birdie. Execute your stock shot.',
            'fairway-close': 'Attack mode! Pick your landing spot and commit.',
            'rough': 'Get it out, get it on, get it close. Accept the lost distance.',
            'deep-rough': 'Escape first, score second. Get back to the fairway.',
            'bunker-fairway': 'Pick it clean. Ball first, sand second.',
            'bunker-green': 'Splash it out! Hit 2 inches behind and swing THROUGH.',
            'fringe': 'Putt when you can. It\'s almost always the safest option from the fringe.',
            'green-long': 'Two putts is a WIN from here. Focus on speed.',
            'green-mid': 'This is a makeable putt. Trust your read, commit to your line.',
            'green-short': 'These are the scoring putts. No fear. Firm and confident.',
            'trees': 'Get out of jail first. Fairway is the goal, not the green.',
            'trouble': 'Damage control. What\'s the safest path to a bogey?'
        };
        return thoughts[location] || 'Play the smart shot. Course management wins rounds.';
    },

    bindEvents(tool) {
        if (tool === 'club-selector') {
            const skill = document.getElementById('csSkill');
            const gender = document.getElementById('csGender');
            if (skill && gender) {
                this.renderClubChart(skill.value, gender.value);
                skill.addEventListener('change', () => this.renderClubChart(skill.value, gender.value));
                gender.addEventListener('change', () => this.renderClubChart(skill.value, gender.value));
            }
            const shotCarry = document.getElementById('shotCarry');
            const shotTotal = document.getElementById('shotTotal');
            if (shotCarry && shotTotal) {
                shotCarry.addEventListener('input', () => {
                    if (!shotTotal.dataset.edited) shotTotal.value = shotCarry.value;
                });
                shotTotal.addEventListener('input', () => { shotTotal.dataset.edited = 'true'; });
            }
        }
        if (tool === 'course-strategy') {
            this.bindCourseEvents();
        }
        this.bindConditionEvents(tool);
        this.applyConditions(tool);
    },

    setCondition(name, value) {
        this.conditions[name] = value;
        if (name === 'windDirection' && ['cross-l', 'cross-r'].includes(value)) this.conditions.crosswindDirection = value;
        this.saveConditions();
    },

    bindConditionEvents(tool) {
        if (tool === 'club-selector') {
            document.getElementById('csDistance')?.addEventListener('input', event => this.setCondition('distance', event.target.value === '' ? '' : this.clampNumber(this.inputDistanceToYards(event.target.value), 1, 600, '')));
            document.getElementById('csWind')?.addEventListener('change', event => {
                Object.assign(this.conditions, this.clubWindToConditions(event.target.value));
                this.saveConditions();
                this.toggleCrosswindDirection();
            });
            document.getElementById('csCrossDir')?.addEventListener('change', event => {
                this.setCondition('crosswindDirection', event.target.value);
                this.setCondition('windDirection', event.target.value);
            });
            document.getElementById('csAlt')?.addEventListener('change', event => this.setCondition('altitude', this.clubAltitudeToFeet(event.target.value)));
        }
        if (tool === 'distance-calc') {
            const bindings = [
                ['dcDistance', 'distance', 1, 600, ''], ['dcElevation', 'elevation', -200, 200, 0],
                ['dcWind', 'windSpeed', 0, 50, 0], ['dcTemp', 'temperature', 0, 120, 72],
                ['dcAltitude', 'altitude', 0, 12000, 0]
            ];
            bindings.forEach(([id, name, min, max, fallback]) => document.getElementById(id)?.addEventListener('input', event => {
                const raw = name === 'distance' ? this.inputDistanceToYards(event.target.value) : event.target.value;
                this.setCondition(name, event.target.value === '' && name === 'distance' ? '' : this.clampNumber(raw, min, max, fallback));
            }));
            document.getElementById('dcWindDir')?.addEventListener('change', event => this.setCondition('windDirection', event.target.value));
        }
    },

    applyConditions(tool) {
        if (tool === 'club-selector') {
            const distance = document.getElementById('csDistance');
            const wind = document.getElementById('csWind');
            const cross = document.getElementById('csCrossDir');
            const altitude = document.getElementById('csAlt');
            if (distance) distance.value = this.conditions.distance === '' ? '' : this.displayDistanceValue(this.conditions.distance);
            if (wind) wind.value = this.conditionsToClubWind();
            if (cross) cross.value = this.conditions.crosswindDirection;
            if (altitude) altitude.value = this.feetToClubAltitude();
            this.toggleCrosswindDirection();
        }
        if (tool === 'distance-calc') {
            const values = {
                dcDistance: this.conditions.distance === '' ? '' : this.displayDistanceValue(this.conditions.distance), dcElevation: this.conditions.elevation,
                dcWind: this.conditions.windSpeed, dcWindDir: this.conditions.windDirection,
                dcTemp: this.conditions.temperature, dcAltitude: this.conditions.altitude
            };
            Object.entries(values).forEach(([id, value]) => { const element = document.getElementById(id); if (element) element.value = value; });
        }
    },

    toggleCrosswindDirection() {
        const group = document.getElementById('csCrossDirGroup');
        const wind = document.getElementById('csWind');
        if (group && wind) group.classList.toggle('hidden', wind.value !== 'crosswind');
    }
};
