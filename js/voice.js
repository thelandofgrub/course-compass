/* CourseCompass — local, device-powered Voice Caddie. No cloud AI required. */
const VoiceCaddie = {
    recognition: null,
    listening: false,
    settingsKey: 'coursecompass-voice-settings',
    voiceInputEnabled: true,
    speakReplies: true,
    selectedVoiceURI: '',
    speechRate: 0.96,

    init() {
        if (document.getElementById('voiceCaddieButton')) return;
        this.loadSettings();
        const recognitionAvailable = Boolean(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition);
        const speechAvailable = Boolean(globalThis.speechSynthesis && typeof SpeechSynthesisUtterance !== 'undefined');
        const mount = document.createElement('div');
        mount.className = 'voice-caddie-mount';
        mount.innerHTML = `
            <button id="voiceCaddieButton" class="voice-caddie-button" type="button" onclick="VoiceCaddie.toggle()" aria-label="Open Voice Caddie" aria-expanded="false">
                <span class="voice-caddie-mark" aria-hidden="true">AI</span><span>Ask Caddie</span>
            </button>
            <aside id="voiceCaddiePanel" class="voice-caddie-panel hidden" aria-label="Voice Caddie conversation">
                <div class="voice-caddie-header">
                    <div><strong><span class="voice-caddie-mark" aria-hidden="true">AI</span> Voice Caddie</strong><small>Private device conversation</small></div>
                    <button type="button" class="voice-close" onclick="VoiceCaddie.toggle(false)" aria-label="Close Voice Caddie">×</button>
                </div>
                <div id="voiceConversation" class="voice-conversation" aria-live="polite">
                    <div class="voice-message caddie">Hi! Ask me for a club, change the playing conditions, record a score, or open any part of the app.</div>
                </div>
                <div class="voice-suggestions">
                    <button type="button" onclick="VoiceCaddie.ask('What club for 150 yards?')">150-yard club</button>
                    <button type="button" onclick="VoiceCaddie.ask('Set a 12 mph headwind')">Set headwind</button>
                    <button type="button" onclick="VoiceCaddie.ask('What is my round status?')">Round status</button>
                </div>
                <form class="voice-input-row" onsubmit="VoiceCaddie.submitText(event)">
                    <input id="voiceCaddieInput" class="form-input" type="text" maxlength="220" placeholder="Ask your caddie…" aria-label="Message Voice Caddie">
                    <button class="btn btn-primary" type="submit" aria-label="Send message">Send</button>
                    <button id="voiceListenButton" class="btn btn-secondary" type="button" onclick="VoiceCaddie.startListening()" aria-label="Start voice input">Speak</button>
                </form>
                <details class="voice-settings">
                    <summary>Voice settings</summary>
                    <div class="voice-settings-grid">
                        <label><input id="voiceInputEnabled" type="checkbox" onchange="VoiceCaddie.toggleVoiceInput(this.checked)"> Microphone listening</label>
                        <label><input id="voiceRepliesEnabled" type="checkbox" onchange="VoiceCaddie.toggleSpeech(this.checked)"> Spoken replies</label>
                        <label class="voice-select-label">Voice
                            <select id="voiceVoiceSelect" class="form-select" onchange="VoiceCaddie.selectVoice(this.value)" ${speechAvailable ? '' : 'disabled'}></select>
                        </label>
                        <label class="voice-select-label">Speaking pace
                            <select id="voiceRateSelect" class="form-select" onchange="VoiceCaddie.setSpeechRate(this.value)">
                                <option value="0.9">Calm</option><option value="0.96">Natural</option><option value="1.05">Brisk</option>
                            </select>
                        </label>
                    </div>
                    <p>Typed conversation always remains available. Voices come from your device, so “Natural” or “Enhanced” system voices usually sound best.</p>
                </details>
                <div class="voice-footer">
                    <span id="voiceCaddieStatus"></span>
                    <span id="voiceModeSummary"></span>
                </div>
            </aside>`;
        document.body.appendChild(mount);
        this.updateVoiceControls(recognitionAvailable);
        this.populateVoices();
        if (globalThis.speechSynthesis?.addEventListener) globalThis.speechSynthesis.addEventListener('voiceschanged', () => this.populateVoices());
        else if (globalThis.speechSynthesis) globalThis.speechSynthesis.onvoiceschanged = () => this.populateVoices();
    },

    loadSettings() {
        try {
            const saved = JSON.parse(globalThis.localStorage?.getItem(this.settingsKey) || 'null');
            if (!saved || typeof saved !== 'object') return;
            if (typeof saved.voiceInputEnabled === 'boolean') this.voiceInputEnabled = saved.voiceInputEnabled;
            if (typeof saved.speakReplies === 'boolean') this.speakReplies = saved.speakReplies;
            if (typeof saved.selectedVoiceURI === 'string') this.selectedVoiceURI = saved.selectedVoiceURI;
            if ([0.9, 0.96, 1.05].includes(Number(saved.speechRate))) this.speechRate = Number(saved.speechRate);
        } catch { /* Preferences are optional. */ }
    },

    saveSettings() {
        try {
            globalThis.localStorage?.setItem(this.settingsKey, JSON.stringify({
                voiceInputEnabled: this.voiceInputEnabled,
                speakReplies: this.speakReplies,
                selectedVoiceURI: this.selectedVoiceURI,
                speechRate: this.speechRate
            }));
        } catch { /* Preferences are optional. */ }
    },

    toggle(force) {
        const panel = document.getElementById('voiceCaddiePanel');
        const button = document.getElementById('voiceCaddieButton');
        if (!panel || !button) return;
        const open = typeof force === 'boolean' ? force : panel.classList.contains('hidden');
        panel.classList.toggle('hidden', !open);
        button.setAttribute('aria-expanded', String(open));
        if (open) setTimeout(() => document.getElementById('voiceCaddieInput')?.focus(), 50);
        else this.stopListening();
    },

    submitText(event) {
        event.preventDefault();
        const input = document.getElementById('voiceCaddieInput');
        const message = String(input?.value || '').trim();
        if (!message) return;
        input.value = '';
        this.ask(message);
    },

    ask(message) {
        const clean = String(message || '').trim().slice(0, 220);
        if (!clean) return;
        this.toggle(true);
        this.addMessage(clean, 'player');
        const reply = this.answer(clean);
        setTimeout(() => {
            this.addMessage(reply, 'caddie');
            if (this.speakReplies) this.speak(reply);
        }, 180);
        return reply;
    },

    answer(message) {
        const text = message.toLowerCase().replace(/[?!.]/g, ' ');
        if (/\b(disable|turn off) voice\b/.test(text)) {
            this.toggleVoiceInput(false); this.toggleSpeech(false);
            return 'Voice features are off. You can keep chatting with me here by typing, and re-enable them in Voice settings.';
        }
        if (/\b(enable|turn on) voice\b/.test(text)) {
            this.toggleVoiceInput(true); this.toggleSpeech(true);
            return 'Voice features are on. Tap the microphone whenever you want to talk.';
        }
        if (/\b(mute|stop speaking)\b/.test(text)) { this.toggleSpeech(false); return 'Got it. Spoken replies are off, but I’m still here in text.'; }
        if (/\b(unmute|start speaking)\b/.test(text)) { this.toggleSpeech(true); return 'Spoken replies are back on.'; }

        const conditionReply = this.conditionCommand(text);
        if (conditionReply) return conditionReply;
        const scoreReply = this.scoreCommand(text);
        if (scoreReply) return scoreReply;
        if (/\b(what should i hit|recommendation|shot decision|safe play|distance to (?:the )?(?:front|center|back|pin)|how far to (?:the )?(?:bunker|water))\b/.test(text)) return this.contextualShotAnswer(text);

        const navigation = [
            { words: ['home'], section: 'home', label: 'home' },
            { words: ['learn', 'academy', 'lesson'], section: 'learn', label: 'the Golf Academy' },
            { words: ['caddie'], section: 'caddie', label: 'the Virtual Caddie' },
            { words: ['scorecard', 'scoring'], section: 'scoring', label: 'the scorecard' },
            { words: ['leaderboard'], section: 'leaderboard', label: 'the leaderboard' },
            { words: ['trivia'], section: 'trivia', label: 'golf trivia' },
            { words: ['glossary'], section: 'glossary', label: 'the glossary' }
        ];
        if (/\b(open|show|go to|take me)\b/.test(text)) {
            const target = navigation.find(item => item.words.some(word => text.includes(word)));
            if (target) { App.navigate(target.section); return `You got it — opening ${target.label}.`; }
        }
        if (/\b(club|hit|use)\b/.test(text) && /\d{2,3}/.test(text)) return this.clubAnswer(Number(text.match(/\d{2,3}/)[0]), /\bmeters?\b/.test(text) ? 'meters' : /\b(?:yards?|yds?)\b/.test(text) ? 'yards' : null);
        if (/\b(score|round status|how am i doing|to par)\b/.test(text)) return this.roundAnswer();
        if (/\b(tip|advice today)\b/.test(text)) {
            const tip = document.getElementById('dailyTip')?.textContent || GolfData.dailyTips?.[0];
            return tip ? `Here’s today’s thought: ${tip}` : 'Keep the tempo smooth, pick a clear target, and commit to it.';
        }
        if (/\b(group|join code|live code)\b/.test(text)) {
            return CourseCompassSync.group ? `Your live group code is ${CourseCompassSync.group.id}. You have ${CourseCompassSync.members.length} connected members.` : 'You’re not in a live group yet. Open Scoring whenever you’re ready to create or join one.';
        }
        const glossaryMatch = (GolfData.glossary || []).find(item => {
            const term = String(item.term || '').toLowerCase();
            return term.length > 2 && (text.includes(term) || text === `what is ${term}`);
        });
        if (glossaryMatch) return `${glossaryMatch.term} means ${glossaryMatch.definition}`;
        if (/\b(help|what can you do)\b/.test(text)) return 'I can recommend the current shot, read front, center, back and hazard distances, choose a safe play, update conditions, record a score, summarize the round, explain golf terms, and navigate the app. Everything runs on your device.';
        if (/\b(hello|hi|hey)\b/.test(text)) return `Hey, ${CourseCompassStore.playerProfile.name}! What shot can I help you think through?`;
        return 'I didn’t quite catch the golf command. Try “what club for 165 yards,” “set a 12 mile-per-hour headwind,” “record 5 on hole 7,” or “open scorecard.”';
    },

    conditionCommand(text) {
        const numberNear = pattern => Number(text.match(pattern)?.[1]);
        let changed = '';
        const windSpeed = numberNear(/(\d{1,2})\s*(?:mph|miles? per hour)/);
        if (Number.isFinite(windSpeed) && /\b(headwind|tailwind|crosswind|left to right|right to left)\b/.test(text)) {
            Caddie.conditions.windSpeed = Math.min(50, windSpeed);
            Caddie.conditions.windDirection = /headwind/.test(text) ? 'head' : /tailwind/.test(text) ? 'tail' : /right to left/.test(text) ? 'cross-r' : 'cross-l';
            changed = `${windSpeed} mile-per-hour ${Caddie.conditions.windDirection === 'head' ? 'headwind' : Caddie.conditions.windDirection === 'tail' ? 'tailwind' : Caddie.conditions.windDirection === 'cross-r' ? 'crosswind from right to left' : 'crosswind from left to right'}`;
        } else if (/\b(no wind|calm wind|clear the wind)\b/.test(text)) {
            Caddie.conditions.windSpeed = 0; Caddie.conditions.windDirection = 'none'; changed = 'calm wind';
        } else if (/\btemperature\b/.test(text)) {
            const value = numberNear(/(?:temperature\D{0,12})(\d{1,3})/) || numberNear(/(\d{1,3})\s*degrees/);
            if (Number.isFinite(value) && value <= 120) { Caddie.conditions.temperature = value; changed = `${value} degrees`; }
        } else if (/\baltitude\b/.test(text)) {
            const value = numberNear(/(\d{1,5})\s*(?:feet|foot|ft)/) || numberNear(/altitude\D{0,12}(\d{1,5})/);
            if (Number.isFinite(value) && value <= 12000) { Caddie.conditions.altitude = value; changed = `${value} feet of altitude`; }
        } else if (/\b(set|change|target)\b/.test(text) && /\b(?:yards?|yds?)\b/.test(text)) {
            const value = numberNear(/(\d{1,3})\s*(?:yards?|yds?)/);
            if (Number.isFinite(value) && value <= 600) { Caddie.conditions.distance = value; changed = `${value} yards`; }
        }
        if (!changed) return '';
        Caddie.saveConditions();
        Caddie.applyConditions?.(Caddie.currentTool);
        return `All set — I’ve updated the shared playing conditions to ${changed}. Both caddie calculators are in sync.`;
    },

    scoreCommand(text) {
        const match = text.match(/(?:record|enter|log|score)\s+(?:a\s+)?(\d{1,2})\s+(?:on|for)\s+hole\s+(\d{1,2})/);
        if (!match) return '';
        const score = Number(match[1]);
        const holeNumber = Number(match[2]);
        const player = Scoring.players?.[0];
        const hole = (Scoring.course?.holes || []).find(item => Number(item.hole) === holeNumber);
        if (!player || !hole || !Scoring.scores?.[player.id]) return 'I can do that once an active scorecard is open with at least one player.';
        if (score < 1 || score > 20) return 'That score needs to be between 1 and 20 strokes.';
        Scoring.updateScore(player.id, holeNumber, score, Number(hole.par) || 4);
        const relation = score === hole.par ? 'par' : score === hole.par - 1 ? 'birdie' : score === hole.par + 1 ? 'bogey' : `${score} strokes`;
        return `Done — I recorded ${relation} for ${player.name} on hole ${holeNumber}.`;
    },

    clubAnswer(distance, suppliedUnit = null) {
        const experience = globalThis.CourseCompassStore?.experienceProfile || { id: 'developing', skill: 'intermediate' };
        const unit = suppliedUnit || Caddie.getDistanceUnit?.() || 'yards';
        const yards = Math.max(20, Math.min(400, Math.round((Number(distance) || 0) * (unit === 'meters' ? 1.09361 : 1))));
        const shotPlan = Caddie.calculateShotPlan({ distance: yards });
        const effectiveYards = shotPlan.effectiveDistance;
        const bag = Caddie.getActiveBag(experience.skill, 'neutral');
        const choices = Object.entries(bag.clubs || {})
            .filter(([, values]) => values.enabled !== false && Number(values.carry) > 0)
            .map(([name, values]) => ({ name, carry: Number(values.carry), gap: Math.abs(Number(values.carry) - effectiveYards), dispersion: Number(values.dispersion) || 0 }))
            .sort((a, b) => a.gap - b.gap || a.dispersion - b.dispersion);
        const best = choices[0];
        if (!best) return 'Let’s set up My Bag in the Virtual Caddie first, then I can make a personal recommendation.';
        const swing = best.carry === effectiveYards ? 'That lines up nicely with the adjusted number.' : best.carry > effectiveYards ? `It normally carries ${best.carry} yards, so take a smooth, controlled swing.` : `It carries about ${best.carry} yards, so you’ll need a committed swing.`;
        const conditions = effectiveYards !== yards ? ` With the current conditions, the shot is playing closer to ${effectiveYards}.` : '';
        const aim = shotPlan.drift ? ` Favor a start line about ${shotPlan.drift} yards ${shotPlan.aimDirection}.` : '';
        const formatDistance = value => Caddie.formatDistance?.(value) || `${Math.round(value)} yards`;
        if (experience.id === 'beginner') return `From ${formatDistance(yards)}, use your ${best.name}. Aim for the center of the safest target and make a smooth swing.${conditions}`;
        const performanceDetail = experience.id === 'competitive' ? ` Expected dispersion is about plus or minus ${formatDistance(best.dispersion)}.` : '';
        return `Alright — from ${formatDistance(yards)}, I’d start with your ${best.name}. ${swing}${conditions}${aim}${performanceDetail} Take one last look at the lie and your safest miss.`;
    },

    contextualShotAnswer(text = '') {
        const hole = Scoring.getCourseHoles?.().find(item => item.hole === Scoring.currentRoundHole);
        if (!hole || !Scoring.players?.length) return 'Start a round and open On Course mode so I can use the live hole context.';
        const gps = Scoring.getGpsDistances(hole);
        const distanceKey = ['front', 'center', 'back', 'pin'].find(key => new RegExp(`\\b${key}\\b`).test(text));
        if (distanceKey) {
            const yards = gps.greenDistances?.[distanceKey];
            return Number.isFinite(yards) ? `The ${distanceKey} is ${Math.round(yards)} yards away.` : `A ${distanceKey} coordinate is not available for this hole yet.`;
        }
        if (/\b(bunker|water)\b/.test(text)) {
            const type = /\bwater\b/.test(text) ? 'water' : 'bunker';
            const hazard = gps.hazards.find(item => item.type === type);
            return hazard ? `The nearest mapped ${type} is ${Math.round(hazard.yards)} yards away.` : `I do not have a mapped ${type} distance from the current position.`;
        }
        const decision = Scoring.getShotDecision(hole);
        if (!decision.club) return 'Set up My Bag first and I can make a personal shot recommendation.';
        const aim = decision.plan.drift ? `Aim about ${decision.plan.drift} yards ${decision.plan.aimDirection}.` : `${decision.safeMiss}.`;
        if (decision.experience?.id === 'beginner') return `${decision.actualDistance} yards. Use your ${decision.club.name} and aim for the center of the safest target. Make a smooth swing.`;
        const performanceDetail = decision.experience?.id === 'competitive' ? ` Expected dispersion is plus or minus ${decision.club.dispersion || 0} yards.` : '';
        return `${decision.actualDistance} yards, playing like ${decision.plan.effectiveDistance}. Hit your ${decision.club.name}, which carries about ${decision.club.carry}. ${aim}${performanceDetail} ${decision.confidence} confidence.`;
    },

    speakShotDecision() {
        const reply = this.contextualShotAnswer('what should I hit');
        this.toggle(true);
        this.addMessage(reply, 'caddie');
        if (this.speakReplies) this.speak(reply);
        return reply;
    },

    roundAnswer() {
        const round = Scoring.players?.length ? { players: Scoring.players, scores: Scoring.scores, courseSnapshot: Scoring.course } : GolfData.activeRound;
        const player = round?.players?.[0];
        const holes = round?.courseSnapshot?.holes || round?.course?.holes || [];
        if (!player || !holes.length) return 'No active round yet. Open the scorecard when you’re ready and I’ll keep track with you.';
        const scores = round.scores?.[player.id] || {};
        let strokes = 0, par = 0, played = 0;
        holes.forEach(hole => { const value = Number(scores[hole.hole]); if (value > 0) { strokes += value; par += Number(hole.par) || 0; played++; } });
        if (!played) return `${player.name}, everything is ready, but we haven’t entered a score yet.`;
        const relative = strokes - par;
        const label = relative === 0 ? 'even par' : relative > 0 ? `${relative} over par` : `${Math.abs(relative)} under par`;
        return `You’re ${label} through ${played} hole${played === 1 ? '' : 's'}, ${player.name}, with ${strokes} total strokes. Stay patient and keep picking smart targets.`;
    },

    startListening() {
        const Recognition = globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition;
        if (!this.voiceInputEnabled) { this.setListening(false, 'Microphone listening is off. Enable it in Voice settings.'); return; }
        if (!Recognition || this.listening) return;
        this.recognition = new Recognition();
        this.recognition.lang = document.documentElement.lang || 'en-US';
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.onstart = () => this.setListening(true, 'Listening… go ahead');
        this.recognition.onresult = event => this.ask(event.results?.[0]?.[0]?.transcript || '');
        this.recognition.onerror = event => this.setListening(false, event.error === 'not-allowed' ? 'Microphone permission is required.' : 'I missed that. Please try once more.');
        this.recognition.onend = () => this.setListening(false, 'Ready when you are');
        try { this.recognition.start(); } catch { this.setListening(false, 'Voice input could not start.'); }
    },

    stopListening() { try { this.recognition?.stop(); } catch { /* Already stopped. */ } this.setListening(false, 'Ready when you are'); },
    setListening(active, status) {
        this.listening = active;
        document.getElementById('voiceListenButton')?.classList.toggle('listening', active);
        const element = document.getElementById('voiceCaddieStatus');
        if (element) element.textContent = status;
    },

    toggleVoiceInput(force) {
        this.voiceInputEnabled = typeof force === 'boolean' ? force : !this.voiceInputEnabled;
        if (!this.voiceInputEnabled) this.stopListening();
        this.saveSettings(); this.updateVoiceControls();
    },
    toggleSpeech(force) {
        this.speakReplies = typeof force === 'boolean' ? force : !this.speakReplies;
        if (!this.speakReplies) globalThis.speechSynthesis?.cancel();
        this.saveSettings(); this.updateVoiceControls();
    },
    selectVoice(uri) { this.selectedVoiceURI = String(uri || ''); this.saveSettings(); },
    setSpeechRate(value) { this.speechRate = [0.9, 0.96, 1.05].includes(Number(value)) ? Number(value) : 0.96; this.saveSettings(); },

    updateVoiceControls(recognitionAvailable = Boolean(globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition)) {
        const mic = document.getElementById('voiceInputEnabled');
        const replies = document.getElementById('voiceRepliesEnabled');
        const listen = document.getElementById('voiceListenButton');
        const rate = document.getElementById('voiceRateSelect');
        if (mic) { mic.checked = this.voiceInputEnabled; mic.disabled = !recognitionAvailable; }
        if (replies) replies.checked = this.speakReplies;
        if (listen) listen.disabled = !recognitionAvailable || !this.voiceInputEnabled;
        if (rate) rate.value = String(this.speechRate);
        const status = document.getElementById('voiceCaddieStatus');
        if (status && !this.listening) status.textContent = recognitionAvailable ? (this.voiceInputEnabled ? 'Ready when you are' : 'Microphone listening is off') : 'Microphone recognition is unavailable; typing still works.';
        const summary = document.getElementById('voiceModeSummary');
        if (summary) summary.textContent = `Mic ${this.voiceInputEnabled && recognitionAvailable ? 'on' : 'off'} · Replies ${this.speakReplies ? 'on' : 'off'}`;
    },

    populateVoices() {
        const select = document.getElementById('voiceVoiceSelect');
        if (!select || !globalThis.speechSynthesis) return;
        const voices = [...globalThis.speechSynthesis.getVoices()];
        const english = voices.filter(voice => /^en(?:-|_)/i.test(voice.lang));
        const available = english.length ? english : voices;
        const quality = /natural|enhanced|neural|aria|jenny|samantha|zira|google.*english/i;
        available.sort((a, b) => Number(quality.test(b.name)) - Number(quality.test(a.name)) || a.name.localeCompare(b.name));
        if (!this.selectedVoiceURI || !available.some(voice => voice.voiceURI === this.selectedVoiceURI)) this.selectedVoiceURI = available[0]?.voiceURI || '';
        select.innerHTML = available.length ? available.map(voice => `<option value="${this.escapeAttribute(voice.voiceURI)}">${this.escapeText(voice.name)} (${this.escapeText(voice.lang)})${quality.test(voice.name) ? ' · preferred' : ''}</option>`).join('') : '<option value="">Default device voice</option>';
        select.value = this.selectedVoiceURI;
        this.saveSettings();
    },

    speak(text) {
        if (!this.speakReplies || !globalThis.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') return;
        globalThis.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(String(text).slice(0, 500));
        const voice = globalThis.speechSynthesis.getVoices().find(item => item.voiceURI === this.selectedVoiceURI);
        if (voice) utterance.voice = voice;
        utterance.rate = this.speechRate;
        utterance.pitch = 1.02;
        utterance.volume = 1;
        globalThis.speechSynthesis.speak(utterance);
    },

    escapeText(value) { return String(value).replace(/[&<>]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char])); },
    escapeAttribute(value) { return this.escapeText(value).replace(/"/g, '&quot;'); },
    addMessage(text, role) {
        const conversation = document.getElementById('voiceConversation');
        if (!conversation) return;
        const message = document.createElement('div');
        message.className = `voice-message ${role === 'player' ? 'player' : 'caddie'}`;
        message.textContent = text;
        conversation.appendChild(message);
        conversation.scrollTop = conversation.scrollHeight;
    }
};

// Boot independently of the main controller so an unrelated module failure cannot hide the caddie.
if (globalThis.document?.readyState === 'loading') {
    globalThis.document.addEventListener('DOMContentLoaded', () => VoiceCaddie.init(), { once: true });
} else if (globalThis.document?.body) {
    VoiceCaddie.init();
}
