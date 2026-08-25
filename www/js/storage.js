/* =========================================================
   CourseCompass — Versioned Local Repository & Sync Outbox
   Keeps persistence provider-neutral so a cloud or self-hosted
   transport can be added without rewriting feature modules.
   ========================================================= */

const CourseCompassStore = {
    backupFormat: 'coursecompass-backup',
    backupVersion: 1,
    keys: {
        theme: 'coursecompass-theme',
        fieldMode: 'coursecompass-field-mode',
        playerName: 'coursecompass-player-name',
        playerProfile: 'coursecompass-player-profile',
        customCourses: 'coursecompass-custom-courses',
        selectedCourse: 'coursecompass-selected-course-id',
        clubProfile: 'coursecompass-club-profile',
        clubShots: 'coursecompass-club-shot-history',
        calibrationSession: 'coursecompass-calibration-session',
        practicePlan: 'coursecompass-practice-plan',
        practiceSessions: 'coursecompass-practice-sessions',
        roundReviews: 'coursecompass-round-reviews',
        preRoundPlans: 'coursecompass-pre-round-plans',
        accessibility: 'coursecompass-accessibility',
        activeRound: 'coursecompass-active-round',
        roundHistory: 'coursecompass-round-history',
        deviceId: 'coursecompass-device-id',
        syncOutbox: 'coursecompass-sync-outbox'
    },

    portableKeys: [
        'coursecompass-theme',
        'coursecompass-field-mode',
        'coursecompass-player-name',
        'coursecompass-player-profile',
        'coursecompass-custom-courses',
        'coursecompass-selected-course-id',
        'coursecompass-club-profile',
        'coursecompass-club-shot-history',
        'coursecompass-calibration-session',
        'coursecompass-practice-plan',
        'coursecompass-practice-sessions',
        'coursecompass-round-reviews',
        'coursecompass-pre-round-plans',
        'coursecompass-accessibility',
        'coursecompass-active-round',
        'coursecompass-round-history'
    ],

    syncKeys: new Set([
        'coursecompass-player-profile',
        'coursecompass-custom-courses',
        'coursecompass-club-profile',
        'coursecompass-club-shot-history',
        'coursecompass-practice-plan',
        'coursecompass-practice-sessions',
        'coursecompass-round-reviews',
        'coursecompass-pre-round-plans',
        'coursecompass-accessibility',
        'coursecompass-active-round',
        'coursecompass-round-history'
    ]),

    jsonKeys: new Set([
        'coursecompass-player-profile',
        'coursecompass-custom-courses',
        'coursecompass-club-profile',
        'coursecompass-club-shot-history',
        'coursecompass-calibration-session',
        'coursecompass-practice-plan',
        'coursecompass-practice-sessions',
        'coursecompass-round-reviews',
        'coursecompass-pre-round-plans',
        'coursecompass-accessibility',
        'coursecompass-active-round',
        'coursecompass-round-history'
    ]),

    _suspendOutbox: false,

    experienceLevels: {
        beginner: { id: 'beginner', label: 'Beginner', skill: 'beginner', lessonLevel: 'beginner', strategy: 'conservative', detail: 'essential' },
        developing: { id: 'developing', label: 'Developing', skill: 'intermediate', lessonLevel: 'intermediate', strategy: 'balanced', detail: 'guided' },
        advanced: { id: 'advanced', label: 'Advanced', skill: 'advanced', lessonLevel: 'advanced', strategy: 'balanced', detail: 'advanced' },
        competitive: { id: 'competitive', label: 'Competitive', skill: 'pro', lessonLevel: 'pro', strategy: 'balanced', detail: 'full' }
    },

    normalizeExperience(value) {
        return Object.hasOwn(this.experienceLevels, value) ? value : 'developing';
    },

    normalizeProfileSettings(settings = {}) {
        const numberOrNull = (value, minimum, maximum) => {
            if (value === '' || value === null || value === undefined) return null;
            const number = Number(value);
            return Number.isFinite(number) && number >= minimum && number <= maximum ? Math.round(number) : null;
        };
        const allowed = (value, values, fallback) => values.includes(value) ? value : fallback;
        return {
            driverCarry: numberOrNull(settings.driverCarry, 80, 350),
            swingSpeed: numberOrNull(settings.swingSpeed, 40, 140),
            handicapRange: allowed(settings.handicapRange, ['new', '36-plus', '20-35', '10-19', '5-9', '0-4'], 'new'),
            handedness: allowed(settings.handedness, ['right', 'left'], 'right'),
            preferredTee: allowed(settings.preferredTee, ['auto', 'forward', 'middle', 'back', 'championship'], 'auto'),
            distanceUnit: allowed(settings.distanceUnit, ['yards', 'meters'], 'yards'),
            improvementGoal: allowed(settings.improvementGoal, ['break-100', 'break-90', 'break-80', 'reduce-penalties', 'putting', 'approach', 'consistency', 'competition'], 'consistency')
        };
    },

    get experienceProfile() {
        return this.experienceLevels[this.playerProfile.experience];
    },

    makeId(prefix) {
        const value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
        return `${prefix}-${value}`;
    },

    getRaw(key) {
        return localStorage.getItem(key);
    },

    setRaw(key, value, options = {}) {
        if (value === null || value === undefined) return this.remove(key, options);
        const raw = String(value);
        localStorage.setItem(key, raw);
        if (!options.silent) this.recordMutation(key, 'set', raw);
        this.emitChange(key, 'set');
    },

    remove(key, options = {}) {
        localStorage.removeItem(key);
        if (!options.silent) this.recordMutation(key, 'remove', null);
        this.emitChange(key, 'remove');
    },

    getJSON(key, fallback = null) {
        try {
            const raw = this.getRaw(key);
            return raw === null ? fallback : JSON.parse(raw);
        } catch { return fallback; }
    },

    setJSON(key, value, options = {}) {
        this.setRaw(key, JSON.stringify(value), options);
    },

    emitChange(key, action) {
        if (typeof document === 'undefined' || typeof CustomEvent === 'undefined') return;
        document.dispatchEvent(new CustomEvent('coursecompass:storage-change', { detail: { key, action } }));
    },

    get deviceId() {
        let id = this.getRaw(this.keys.deviceId);
        if (!id || !/^device-[a-z0-9-]+$/i.test(id)) {
            id = this.makeId('device');
            this.setRaw(this.keys.deviceId, id, { silent: true });
        }
        return id;
    },

    get playerProfile() {
        const stored = this.getJSON(this.keys.playerProfile, null);
        if (stored && typeof stored.id === 'string' && /^player-[a-z0-9-]+$/i.test(stored.id)) {
            const settings = this.normalizeProfileSettings(stored);
            return {
                id: stored.id,
                name: String(stored.name || 'Golfer').slice(0, 80),
                experience: this.normalizeExperience(stored.experience),
                ...settings,
                createdAt: String(stored.createdAt || ''),
                updatedAt: String(stored.updatedAt || '')
            };
        }
        const now = new Date().toISOString();
        const profile = {
            id: this.makeId('player'),
            name: String(this.getRaw(this.keys.playerName) || 'Golfer').slice(0, 80),
            experience: 'developing',
            ...this.normalizeProfileSettings(),
            createdAt: now,
            updatedAt: now
        };
        this.setJSON(this.keys.playerProfile, profile);
        return profile;
    },

    updatePlayerProfile(name, experience, settings = {}) {
        const cleanName = String(name || '').trim().slice(0, 80);
        if (!cleanName) return null;
        const current = this.playerProfile;
        const profile = {
            ...current,
            name: cleanName,
            experience: this.normalizeExperience(experience ?? current.experience),
            ...this.normalizeProfileSettings({ ...current, ...settings }),
            updatedAt: new Date().toISOString()
        };
        this.setRaw(this.keys.playerName, cleanName, { silent: true });
        this.setJSON(this.keys.playerProfile, profile);
        return profile;
    },

    get outbox() {
        const parsed = this.getJSON(this.keys.syncOutbox, []);
        return Array.isArray(parsed) ? parsed.filter(item => item && typeof item.id === 'string').slice(-100) : [];
    },

    recordMutation(key, action, rawValue) {
        if (this._suspendOutbox || !this.syncKeys.has(key)) return;
        const outbox = this.outbox.filter(item => item.key !== key);
        outbox.push({
            id: this.makeId('change'),
            key,
            action,
            value: rawValue,
            deviceId: this.deviceId,
            playerId: key === this.keys.playerProfile ? this.getJSON(key, {})?.id || '' : this.getJSON(this.keys.playerProfile, {})?.id || '',
            createdAt: new Date().toISOString(),
            status: 'pending'
        });
        this.setJSON(this.keys.syncOutbox, outbox, { silent: true });
    },

    acknowledgeChanges(ids) {
        const accepted = new Set(Array.isArray(ids) ? ids : []);
        this.setJSON(this.keys.syncOutbox, this.outbox.filter(item => !accepted.has(item.id)), { silent: true });
    },

    exportObject() {
        const data = {};
        this.portableKeys.forEach(key => {
            const raw = this.getRaw(key);
            if (raw === null) return;
            data[key] = this.jsonKeys.has(key) ? this.getJSON(key, null) : raw;
        });
        return {
            format: this.backupFormat,
            version: this.backupVersion,
            exportedAt: new Date().toISOString(),
            app: { name: 'CourseCompass', dataSchema: 1 },
            data
        };
    },

    downloadBackup() {
        const backup = this.exportObject();
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `coursecompass-backup-${backup.exportedAt.slice(0, 10)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        return backup;
    },

    validateBackup(backup) {
        if (!backup || backup.format !== this.backupFormat || backup.version !== this.backupVersion ||
            !backup.data || typeof backup.data !== 'object' || Array.isArray(backup.data)) {
            throw new Error('This is not a supported CourseCompass backup.');
        }
        const allowed = new Set(this.portableKeys);
        const data = {};
        Object.entries(backup.data).forEach(([key, value]) => {
            if (!allowed.has(key)) return;
            if (this.jsonKeys.has(key)) {
                if (value !== null && typeof value !== 'object') throw new Error(`Invalid data for ${key}.`);
                data[key] = value;
            } else if (typeof value === 'string' && value.length <= 500) {
                data[key] = value;
            } else {
                throw new Error(`Invalid data for ${key}.`);
            }
        });
        return data;
    },

    mergeArrays(current, incoming, idKey = 'id') {
        const merged = new Map();
        [...(Array.isArray(current) ? current : []), ...(Array.isArray(incoming) ? incoming : [])]
            .forEach((item, index) => {
                if (!item || typeof item !== 'object') return;
                const key = typeof item[idKey] === 'string' ? item[idKey] : `item-${index}-${JSON.stringify(item).slice(0, 80)}`;
                merged.set(key, item);
            });
        return [...merged.values()];
    },

    importObject(backup, mode = 'merge') {
        const data = this.validateBackup(backup);
        const safetyBackup = this.exportObject();
        const arrayKeys = new Set([this.keys.customCourses, this.keys.clubShots, this.keys.practiceSessions, this.keys.roundReviews, this.keys.preRoundPlans, this.keys.roundHistory]);
        this._suspendOutbox = true;
        try {
            if (mode === 'replace') this.portableKeys.forEach(key => localStorage.removeItem(key));
            Object.entries(data).forEach(([key, value]) => {
                if (mode === 'merge' && arrayKeys.has(key)) {
                    const merged = this.mergeArrays(this.getJSON(key, []), value);
                    localStorage.setItem(key, JSON.stringify(merged));
                } else if (mode === 'merge' && key === this.keys.activeRound && this.getRaw(key)) {
                    return;
                } else {
                    localStorage.setItem(key, this.jsonKeys.has(key) ? JSON.stringify(value) : value);
                }
            });
        } catch (error) {
            this._suspendOutbox = false;
            this.importObject(safetyBackup, 'replace');
            throw error;
        }
        this._suspendOutbox = false;
        const changedSyncKeys = mode === 'replace' ? [...this.syncKeys] : Object.keys(data).filter(key => this.syncKeys.has(key));
        changedSyncKeys.forEach(key => {
            const value = this.getRaw(key);
            this.recordMutation(key, value === null ? 'remove' : 'set', value);
        });
        return { importedKeys: Object.keys(data).length, mode, safetyBackup };
    },

    async importFile(file, mode = 'merge') {
        if (!file || file.size > 5 * 1024 * 1024) throw new Error('Choose a CourseCompass backup smaller than 5 MB.');
        const text = await file.text();
        return this.importObject(JSON.parse(text), mode);
    }
};
