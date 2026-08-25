/* =========================================================
   CourseCompass — Main Application Controller
   Navigation, theme, glossary, splash screen, initialization
   ========================================================= */

const App = {

    currentSection: 'home',
    fieldMode: 'standard',

    /* ── Initialization ─────────────────────────────────── */
    init() {
        this.loadAccessibility();
        // Voice Caddie must remain available even if a later optional module fails.
        VoiceCaddie.init();
        this.initDiagnostics();

        // Splash screen
        this.showSplash();

        // Initialize all modules
        Lessons.init();
        Caddie.init();
        Scoring.init();
        Leaderboard.init();
        Trivia.init();

        // Setup navigation
        this.bindNavigation();
        this.bindThemeToggle();
        this.bindFieldModeToggle();
        this.bindMobileMenu();
        this.initGlossary();
        this.setDailyTip();
        this.loadTheme();
        this.loadFieldMode();
        this.applyExperienceProfile();

        // Prompt for player name
        this.initPlayerName();
        this.initDataCenter();
        CourseCompassSync.init();
        this.initOnboarding();
        this.applyLaunchIntent();
    },

    /* ── Splash Screen ──────────────────────────────────── */
    showSplash() {
        const tips = [
            "Loading your personalized golf experience...",
            "Calibrating the virtual caddie...",
            "Analyzing grass types and weather patterns...",
            "Preparing 42 comprehensive lessons...",
            "Setting up the scorecard...",
            "Loading trivia questions..."
        ];
        const tip = tips[Math.floor(Math.random() * tips.length)];
        const tipEl = document.getElementById('splashTip');
        if (tipEl) tipEl.textContent = tip;

        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            const app = document.getElementById('app');
            if (splash) splash.classList.add('fade-out');
            if (app) app.classList.remove('hidden');
            setTimeout(() => {
                if (splash) splash.style.display = 'none';
            }, 600);
        }, 2200);
    },

    /* ── Navigation ─────────────────────────────────────── */
    bindNavigation() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const section = btn.dataset.section;
                this.navigate(section);
            });
        });
    },

    navigate(section) {
        // Update active nav button
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === section);
        });

        // Update active section
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.remove('active');
        });
        const targetSection = document.getElementById(`section-${section}`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Refresh leaderboard if navigating there
        if (section === 'leaderboard') {
            Leaderboard.render(Leaderboard.currentTab);
        }

        // Keep the scorecard aligned with the course selected in the caddie.
        if (section === 'scoring' && Scoring.players.length === 0) {
            const selected = GolfData.selectedCourse;
            if (selected?.holes?.length) Scoring.course = selected;
            Scoring.render(Scoring.currentTool);
        }

        this.currentSection = section;

        // Close mobile menu if open
        const nav = document.getElementById('topNav');
        if (nav) nav.classList.remove('open');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /* ── Theme Toggle ───────────────────────────────────── */
    bindThemeToggle() {
        const toggle = document.getElementById('themeToggle');
        if (toggle) {
            toggle.addEventListener('click', () => {
                const current = document.documentElement.getAttribute('data-theme');
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                toggle.textContent = next === 'dark' ? 'Light' : 'Dark';
                CourseCompassStore.setRaw(CourseCompassStore.keys.theme, next, { silent: true });
            });
        }
    },

    loadTheme() {
        const saved = CourseCompassStore.getRaw(CourseCompassStore.keys.theme);
        if (saved) {
            document.documentElement.setAttribute('data-theme', saved);
            const toggle = document.getElementById('themeToggle');
            if (toggle) toggle.textContent = saved === 'dark' ? 'Light' : 'Dark';
        }
    },

    /* ── Mobile Menu ────────────────────────────────────── */
    bindMobileMenu() {
        const toggle = document.getElementById('menuToggle');
        const nav = document.getElementById('topNav');
        if (toggle && nav) {
            toggle.addEventListener('click', () => {
                nav.classList.toggle('open');
            });
        }
    },

    /* ── Player Name ────────────────────────────────────── */
    initPlayerName() {
        const profile = CourseCompassStore.playerProfile;
        const el = document.getElementById('playerName');
        if (el) el.textContent = profile.name;
        // Click on player badge to change name
        const badge = document.getElementById('playerBadge');
        if (badge) {
            badge.style.cursor = 'pointer';
            badge.addEventListener('click', () => {
                const name = prompt('Enter your name:', CourseCompassStore.playerProfile.name);
                if (name && name.trim()) {
                    const updated = CourseCompassStore.updatePlayerProfile(name);
                    if (updated && el) el.textContent = updated.name;
                    this.renderDataCenter();
                }
            });
        }
    },

    applyLaunchIntent() {
        const intent = String(globalThis.location?.hash || '').replace('#', '');
        if (!intent) return;
        setTimeout(() => {
            if (intent === 'on-course') { this.navigate('scoring'); Scoring.setScoringTool('on-course'); }
            else if (intent === 'scoring') this.navigate('scoring');
        }, 2300);
    },

    initDiagnostics() {
        if (this._diagnosticsBound) return;
        const record = (type, message, source = '') => {
            try {
                const key = 'coursecompass-local-diagnostics';
                const entries = JSON.parse(localStorage.getItem(key) || '[]');
                entries.push({ at: new Date().toISOString(), type, message: String(message || 'Unknown error').slice(0, 300), source: String(source || '').split(/[\\/]/).pop().slice(0, 100) });
                localStorage.setItem(key, JSON.stringify(entries.slice(-20)));
            } catch (_) { /* Diagnostics must never interrupt the application. */ }
        };
        window.addEventListener('error', event => record('error', event.message, event.filename));
        window.addEventListener('unhandledrejection', event => record('promise', event.reason?.message || event.reason));
        this._diagnosticsBound = true;
    },

    exportDiagnostics() {
        const entries = JSON.parse(localStorage.getItem('coursecompass-local-diagnostics') || '[]');
        const blob = new Blob([JSON.stringify({ format: 'coursecompass-diagnostics', exportedAt: new Date().toISOString(), entries }, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = 'coursecompass-diagnostics.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    },

    bindFieldModeToggle() {
        const toggle = document.getElementById('fieldModeToggle');
        if (!toggle) return;
        toggle.addEventListener('click', () => {
            const order = ['standard', 'sunlight', 'battery'];
            const next = order[(order.indexOf(this.fieldMode) + 1) % order.length];
            this.setFieldMode(next);
        });
    },

    loadFieldMode() {
        const saved = CourseCompassStore.getRaw(CourseCompassStore.keys.fieldMode);
        this.setFieldMode(['standard', 'sunlight', 'battery'].includes(saved) ? saved : 'standard', false);
    },

    getFieldModeLabel(mode = this.fieldMode) {
        return ({ standard: 'Standard', sunlight: 'Sunlight', battery: 'Battery' })[mode] || 'Standard';
    },

    setFieldMode(mode, persist = true) {
        const next = ['standard', 'sunlight', 'battery'].includes(mode) ? mode : 'standard';
        this.fieldMode = next;
        document.documentElement.setAttribute('data-field-mode', next);
        const label = this.getFieldModeLabel(next);
        const toggle = document.getElementById('fieldModeToggle');
        if (toggle) {
            toggle.textContent = label;
            toggle.setAttribute('aria-label', `Field mode: ${label}. Activate to change mode.`);
            toggle.title = next === 'sunlight' ? 'Sunlight mode: maximum outdoor contrast' : next === 'battery' ? 'Battery mode: reduced motion and lower-power GPS' : 'Standard mode: balanced display and live updates';
        }
        document.querySelectorAll('[data-field-mode-label]').forEach(element => { element.textContent = `${label} mode`; });
        if (persist) CourseCompassStore.setRaw(CourseCompassStore.keys.fieldMode, next, { silent: true });
        if (typeof Scoring !== 'undefined' && Scoring.currentTool === 'on-course' && document.getElementById('onCourseWeather')) {
            Scoring.bindOnCourseWeather();
        }
        return next;
    },

    /* ── Player Data, Backup, and Sync Foundation ──────── */
    initDataCenter() {
        this.renderDataCenter();
        ['accessibilityTextSize', 'accessibilityContrast', 'accessibilityMotion', 'accessibilitySimplified'].forEach(id => {
            const control = document.getElementById(id);
            if (control && !control.dataset.bound) {
                control.dataset.bound = 'true';
                control.addEventListener('change', () => this.saveAccessibility());
            }
        });
        const unitSelect = document.getElementById('profileDistanceUnit');
        if (unitSelect && !unitSelect.dataset.bound) {
            unitSelect.dataset.bound = 'true';
            unitSelect.dataset.previousUnit = unitSelect.value;
            unitSelect.addEventListener('change', () => {
                const carry = document.getElementById('profileDriverCarry');
                const previous = unitSelect.dataset.previousUnit || 'yards';
                if (carry?.value && previous !== unitSelect.value) carry.value = Math.round(Number(carry.value) * (unitSelect.value === 'meters' ? 0.9144 : 1.09361));
                unitSelect.dataset.previousUnit = unitSelect.value;
                const label = document.getElementById('profileDistanceUnitLabel');
                if (label) label.textContent = unitSelect.value;
            });
        }
        const input = document.getElementById('backupFileInput');
        if (input) input.addEventListener('change', async () => {
            const file = input.files?.[0];
            const mode = input.dataset.mode === 'replace' ? 'replace' : 'merge';
            input.value = '';
            if (!file) return;
            if (mode === 'replace' && !confirm('Replace all CourseCompass data on this device with this backup? A safety snapshot will be made in memory first.')) return;
            try {
                const result = await CourseCompassStore.importFile(file, mode);
                this.setDataCenterMessage(`${result.importedKeys} data sections ${mode === 'merge' ? 'merged' : 'restored'}. Reloading CourseCompass…`, 'success');
                setTimeout(() => location.reload(), 800);
            } catch (error) {
                this.setDataCenterMessage(error?.message || 'The backup could not be imported.', 'error');
            }
        });
        document.addEventListener('coursecompass:storage-change', () => this.renderDataCenter());
    },

    renderDataCenter() {
        const profile = CourseCompassStore.playerProfile;
        const nameInput = document.getElementById('profileNameInput');
        const experienceInput = document.getElementById('profileExperienceInput');
        const experienceSummary = document.getElementById('experienceSummary');
        const profileId = document.getElementById('profileIdValue');
        const deviceId = document.getElementById('deviceIdValue');
        const outbox = document.getElementById('outboxCountValue');
        if (nameInput && document.activeElement !== nameInput) nameInput.value = profile.name;
        if (experienceInput && document.activeElement !== experienceInput) experienceInput.value = profile.experience;
        if (experienceSummary) experienceSummary.textContent = this.experienceDescription(profile.experience);
        const setValue = (id, value) => { const element = document.getElementById(id); if (element && document.activeElement !== element) element.value = value ?? ''; };
        setValue('profileDriverCarry', profile.driverCarry ? (profile.distanceUnit === 'meters' ? Math.round(profile.driverCarry * 0.9144) : profile.driverCarry) : '');
        setValue('profileSwingSpeed', profile.swingSpeed || '');
        setValue('profileHandicapRange', profile.handicapRange);
        setValue('profileHandedness', profile.handedness);
        setValue('profilePreferredTee', profile.preferredTee);
        setValue('profileDistanceUnit', profile.distanceUnit);
        setValue('profileImprovementGoal', profile.improvementGoal);
        const unitLabel = document.getElementById('profileDistanceUnitLabel');
        if (unitLabel) unitLabel.textContent = profile.distanceUnit;
        if (document.getElementById('profileDistanceUnit')) document.getElementById('profileDistanceUnit').dataset.previousUnit = profile.distanceUnit;
        if (profileId) profileId.textContent = profile.id.slice(0, 18) + '…';
        if (deviceId) deviceId.textContent = CourseCompassStore.deviceId.slice(0, 18) + '…';
        if (outbox) outbox.textContent = String(CourseCompassStore.outbox.length);
        const accessibility = this.getAccessibilitySettings();
        setValue('accessibilityTextSize', accessibility.textSize);
        setValue('accessibilityContrast', accessibility.contrast);
        setValue('accessibilityMotion', accessibility.motion);
        const simplified = document.getElementById('accessibilitySimplified');
        if (simplified && document.activeElement !== simplified) simplified.checked = accessibility.simplified;
    },

    getAccessibilitySettings() {
        const saved = CourseCompassStore.getJSON(CourseCompassStore.keys.accessibility, {});
        return {
            textSize: ['standard', 'large', 'xlarge'].includes(saved?.textSize) ? saved.textSize : 'standard',
            contrast: ['standard', 'high'].includes(saved?.contrast) ? saved.contrast : 'standard',
            motion: ['system', 'full', 'reduced'].includes(saved?.motion) ? saved.motion : 'system',
            simplified: saved?.simplified === true
        };
    },

    applyAccessibility(settings = this.getAccessibilitySettings()) {
        const reducedBySystem = settings.motion === 'system' && globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
        document.documentElement.dataset.textSize = settings.textSize;
        document.documentElement.dataset.contrast = settings.contrast;
        document.documentElement.dataset.motion = settings.motion === 'reduced' || reducedBySystem ? 'reduced' : 'full';
        document.documentElement.dataset.simplified = String(settings.simplified);
    },

    loadAccessibility() {
        this.applyAccessibility(this.getAccessibilitySettings());
    },

    saveAccessibility() {
        const settings = {
            textSize: document.getElementById('accessibilityTextSize')?.value || 'standard',
            contrast: document.getElementById('accessibilityContrast')?.value || 'standard',
            motion: document.getElementById('accessibilityMotion')?.value || 'system',
            simplified: Boolean(document.getElementById('accessibilitySimplified')?.checked)
        };
        CourseCompassStore.setJSON(CourseCompassStore.keys.accessibility, settings);
        this.applyAccessibility(settings);
        this.setDataCenterMessage('Accessibility preferences saved.', 'success');
    },

    savePlayerProfile() {
        const input = document.getElementById('profileNameInput');
        const experience = document.getElementById('profileExperienceInput')?.value;
        const distanceUnit = document.getElementById('profileDistanceUnit')?.value || 'yards';
        const enteredCarry = document.getElementById('profileDriverCarry')?.value;
        const driverCarry = enteredCarry === '' ? null : Math.round(Number(enteredCarry) * (distanceUnit === 'meters' ? 1.09361 : 1));
        const profile = CourseCompassStore.updatePlayerProfile(input?.value, experience, {
            driverCarry,
            swingSpeed: document.getElementById('profileSwingSpeed')?.value,
            handicapRange: document.getElementById('profileHandicapRange')?.value,
            handedness: document.getElementById('profileHandedness')?.value,
            preferredTee: document.getElementById('profilePreferredTee')?.value,
            distanceUnit,
            improvementGoal: document.getElementById('profileImprovementGoal')?.value
        });
        if (!profile) {
            this.setDataCenterMessage('Enter a player name before saving.', 'error');
            return;
        }
        const badgeName = document.getElementById('playerName');
        if (badgeName) badgeName.textContent = profile.name;
        this.applyExperienceProfile();
        Lessons.showRecommendedLevel?.();
        if (Caddie.currentTool === 'club-selector') Caddie.render('club-selector');
        if (Scoring.currentTool === 'on-course') Scoring.render('on-course');
        this.renderDataCenter();
        this.setDataCenterMessage(`${CourseCompassStore.experienceProfile.label} guidance is active and queued for synchronization.`, 'success');
    },

    experienceDescription(experience) {
        return {
            beginner: 'Emphasizes plain language, center targets, safer clubs, and fundamental lessons.',
            developing: 'Balances explanation and detail while building consistent decision-making.',
            advanced: 'Adds shot-shape, dispersion, conditions, and performance context.',
            competitive: 'Shows the fullest decision detail for preparation, execution, and review.'
        }[experience] || 'Guided recommendations with balanced detail.';
    },

    applyExperienceProfile() {
        const profile = CourseCompassStore.experienceProfile;
        document.documentElement.dataset.experience = profile.id;
        document.documentElement.dataset.guidanceDetail = profile.detail;
    },

    exportBackup() {
        const backup = CourseCompassStore.downloadBackup();
        this.setDataCenterMessage(`Backup exported with ${Object.keys(backup.data).length} data sections.`, 'success');
    },

    chooseBackup(mode) {
        const input = document.getElementById('backupFileInput');
        if (!input) return;
        input.dataset.mode = mode === 'replace' ? 'replace' : 'merge';
        input.click();
    },

    setDataCenterMessage(message, type = 'success') {
        const element = document.getElementById('dataSyncMessage');
        if (!element) return;
        element.textContent = message;
        element.className = `text-sm ${type === 'error' ? 'error' : 'success'}`;
    },

    ensureProductDialog() {
        let dialog = document.getElementById('productDialog');
        if (dialog) return dialog;
        dialog = document.createElement('dialog');
        dialog.id = 'productDialog';
        dialog.className = 'product-dialog';
        document.body.appendChild(dialog);
        return dialog;
    },

    initOnboarding() {
        if (CourseCompassStore.getRaw('coursecompass-onboarding-complete') === '1') return;
        setTimeout(() => this.showOnboarding(), 2400);
    },

    showOnboarding() {
        const dialog = this.ensureProductDialog();
        dialog.innerHTML = `<form method="dialog" class="product-dialog-shell" onsubmit="App.completeOnboarding(event)">
            <span class="eyebrow">Welcome to CourseCompass</span><h2>Set up your on-course companion</h2>
            <p>Your scores and club data stay on this device unless you explicitly connect Firebase synchronization.</p>
            <label>Player name<input id="onboardingName" class="form-input" maxlength="80" value="${this.escapeAttribute(CourseCompassStore.playerProfile.name)}" required></label>
            <label>Golf experience<select id="onboardingExperience" class="form-select">
                <option value="beginner">Beginner — keep decisions simple</option><option value="developing" selected>Developing — guide me as I improve</option><option value="advanced">Advanced — show deeper shot detail</option><option value="competitive">Competitive — show full performance detail</option>
            </select></label>
            <div class="onboarding-profile-grid"><label>Driver carry in yards <small>Optional; improves starting estimates</small><input id="onboardingDriverCarry" class="form-input" type="number" min="80" max="350" placeholder="e.g., 210"></label><label>Primary goal<select id="onboardingGoal" class="form-select"><option value="break-100">Break 100</option><option value="break-90">Break 90</option><option value="break-80">Break 80</option><option value="reduce-penalties">Reduce penalties</option><option value="putting">Improve putting</option><option value="approach">Improve approach play</option><option value="consistency" selected>Build consistency</option><option value="competition">Prepare for competition</option></select></label></div>
            <div class="onboarding-facts"><span><strong>Location</strong>Used only after you start GPS or request nearby courses.</span><span><strong>Voice</strong>Device speech tools remain optional.</span><span><strong>Costs</strong>Billable AI and mapping services are disabled.</span></div>
            <label class="consent-check"><input id="onboardingConsent" type="checkbox" required> I understand that GPS distances are estimates and must not replace course markings or personal judgment.</label>
            <div class="product-dialog-actions"><button class="btn btn-primary" type="submit">Finish setup</button><button class="btn btn-secondary" type="button" onclick="App.showPrivacyCenter()">Privacy details</button></div>
        </form>`;
        dialog.showModal?.();
    },

    completeOnboarding(event) {
        event?.preventDefault?.();
        const name = document.getElementById('onboardingName')?.value;
        const experience = document.getElementById('onboardingExperience')?.value;
        const driverCarry = document.getElementById('onboardingDriverCarry')?.value;
        const improvementGoal = document.getElementById('onboardingGoal')?.value;
        if (!document.getElementById('onboardingConsent')?.checked) return;
        CourseCompassStore.updatePlayerProfile(name, experience, { driverCarry, improvementGoal });
        CourseCompassStore.setRaw('coursecompass-onboarding-complete', '1', { silent: true });
        document.getElementById('playerName').textContent = CourseCompassStore.playerProfile.name;
        this.applyExperienceProfile();
        Lessons.showRecommendedLevel?.();
        if (Caddie.currentTool === 'club-selector') Caddie.render('club-selector');
        this.ensureProductDialog().close();
        this.renderDataCenter();
    },

    showPrivacyCenter() {
        const dialog = this.ensureProductDialog();
        dialog.innerHTML = `<div class="product-dialog-shell"><span class="eyebrow">Privacy center</span><h2>Your data, your control</h2>
            <div class="privacy-grid"><article><strong>Location</strong><p>Requested only for nearby-course discovery, live yardages, target selection and GPS shot measurement. CourseCompass does not place location history in group score synchronization.</p></article><article><strong>Local storage</strong><p>Profiles, clubs, rounds, custom courses and preferences are stored on this device. Export a backup before deletion if you want to retain them.</p></article><article><strong>Cloud synchronization</strong><p>Firebase is optional. When configured and signed in, portable golf data and live group scores are synchronized under the account.</p></article><article><strong>Voice and AI</strong><p>Speech recognition and voices come from the device. Billable generative AI calls are prohibited by application policy.</p></article></div>
            <p class="privacy-policy-links"><a href="legal/privacy.html" target="_blank" rel="noopener">Full privacy policy</a> · <a href="legal/terms.html" target="_blank" rel="noopener">Terms &amp; disclaimer</a> · <a href="legal/support.html" target="_blank" rel="noopener">Support</a></p>
            <div class="product-dialog-actions"><button class="btn btn-secondary" type="button" onclick="App.ensureProductDialog().close()">Close</button><button class="btn btn-secondary" type="button" onclick="App.exportDiagnostics()">Export diagnostics</button><button class="btn btn-danger" type="button" onclick="App.deleteLocalData()">Delete local data</button>${CourseCompassSync?.user ? '<button class="btn btn-danger" type="button" onclick="CourseCompassSync.deleteCloudAccount()">Delete cloud account</button>' : ''}</div></div>`;
        if (!dialog.open) dialog.showModal?.();
    },

    deleteLocalData() {
        if (!confirm('Permanently delete all CourseCompass data stored on this device? Export a backup first if needed.')) return;
        Object.values(CourseCompassStore.keys).forEach(key => localStorage.removeItem(key));
        ['coursecompass-onboarding-complete', 'coursecompass-hole-map-layer', 'coursecompass-voice-settings', 'coursecompass-local-diagnostics'].forEach(key => localStorage.removeItem(key));
        sessionStorage.clear();
        location.reload();
    },

    escapeAttribute(value) {
        return String(value ?? '').replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    },

    /* ── Daily Tip ──────────────────────────────────────── */
    setDailyTip() {
        const tips = GolfData.dailyTips;
        // Use date to get a consistent tip for the day
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
        const tip = tips[dayOfYear % tips.length];
        const el = document.getElementById('dailyTip');
        if (el) el.textContent = tip;
    },

    /* ── Glossary ───────────────────────────────────────── */
    initGlossary() {
        this.renderGlossary(GolfData.glossary);
        this.bindGlossarySearch();
        this.bindGlossaryFilters();
    },

    renderGlossary(terms) {
        const container = document.getElementById('glossaryContainer');
        if (!container) return;
        
        if (terms.length === 0) {
            container.innerHTML = `
                <div class="text-center" style="padding: 40px;">
                    <span class="empty-state-code">SEARCH</span>
                    <p style="font-size: 1.2rem;">No terms found</p>
                    <p style="color: var(--text-secondary);">Try a different search term or filter.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = terms.map(item => `
            <div class="glossary-item">
                <div class="glossary-term">${item.term}</div>
                <div class="glossary-def">${item.definition}</div>
            </div>
        `).join('');
    },

    bindGlossarySearch() {
        const input = document.getElementById('glossarySearch');
        if (!input) return;
        let debounceTimer = null;
        input.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = input.value.toLowerCase().trim();
                // Reset filter buttons
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.filter-btn[data-filter="all"]')?.classList.add('active');

                if (!query) {
                    this.renderGlossary(GolfData.glossary);
                    return;
                }
                const filtered = GolfData.glossary.filter(item =>
                    item.term.toLowerCase().includes(query) ||
                    item.definition.toLowerCase().includes(query)
                );
                this.renderGlossary(filtered);
            }, 250);
        });
    },

    bindGlossaryFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const filter = btn.dataset.filter;
                const search = document.getElementById('glossarySearch');
                if (search) search.value = '';

                if (filter === 'all') {
                    this.renderGlossary(GolfData.glossary);
                    return;
                }

                const [start, end] = filter.split('-');
                const startCode = start.charCodeAt(0);
                const endCode = end.charCodeAt(0);

                const filtered = GolfData.glossary.filter(item => {
                    const firstChar = item.term.charAt(0).toUpperCase().charCodeAt(0);
                    return firstChar >= startCode && firstChar <= endCode;
                });
                this.renderGlossary(filtered);
            });
        });
    }
};

/* ── Launch Application ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
