/* =========================================================
   CourseCompass — Optional Firebase Synchronization Transport
   Dormant unless COURSECOMPASS_FIREBASE_CONFIG is populated.
   ========================================================= */

const CourseCompassSync = {
    sdkVersion: '12.17.1',
    status: 'local-only',
    error: '',
    user: null,
    auth: null,
    authApi: null,
    db: null,
    api: null,
    group: null,
    members: [],
    roundStates: [],
    unsubscribeMembers: null,
    unsubscribeRounds: null,
    unsubscribeGroup: null,
    unsubscribePersonal: null,
    processing: false,
    retryTimer: null,
    changeTimer: null,
    presenceTimer: null,
    syncConflict: '',
    lastSyncedAt: 0,
    listenersBound: false,
    initPromise: null,
    groupKey: 'coursecompass-sync-group',

    get config() {
        return globalThis.COURSECOMPASS_FIREBASE_CONFIG;
    },

    isConfigured() {
        const value = this.config;
        return Boolean(value && typeof value === 'object' &&
            typeof value.apiKey === 'string' && value.apiKey.length > 10 &&
            typeof value.projectId === 'string' && value.projectId.length > 2 &&
            typeof value.appId === 'string' && value.appId.length > 5 &&
            !Object.values(value).some(item => typeof item === 'string' && item.includes('...')));
    },

    async init() {
        if (!this.listenersBound) {
            document.addEventListener('coursecompass:storage-change', event => {
                if (event.detail?.key === CourseCompassStore.keys.syncOutbox) return;
                clearTimeout(this.changeTimer);
                this.changeTimer = setTimeout(() => this.processOutbox(), 400);
            });
            window.addEventListener('online', () => this.status === 'connected' ? this.processOutbox() : this.init());
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible' && this.group && this.status === 'connected') this.writeMembership(this.group.id, this.group.ownerUid === this.user?.uid ? 'owner' : 'player').catch(() => {});
            });
            this.listenersBound = true;
        }
        if (!this.isConfigured()) {
            this.status = 'local-only';
            this.refreshPanel();
            return false;
        }
        if (this.status === 'connected') {
            await this.processOutbox();
            return true;
        }
        if (this.initPromise) return this.initPromise;

        this.status = 'connecting';
        this.refreshPanel();
        this.initPromise = (async () => {
        try {
            const base = `https://www.gstatic.com/firebasejs/${this.sdkVersion}`;
            const [appApi, authApi, firestoreApi] = await Promise.all([
                import(`${base}/firebase-app.js`),
                import(`${base}/firebase-auth.js`),
                import(`${base}/firebase-firestore.js`)
            ]);
            const firebaseApp = appApi.getApps().length ? appApi.getApp() : appApi.initializeApp(this.config);
            const auth = authApi.getAuth(firebaseApp);
            if (!auth.currentUser) await authApi.signInAnonymously(auth);
            this.auth = auth;
            this.authApi = authApi;
            this.user = auth.currentUser;
            try {
                this.db = firestoreApi.initializeFirestore(firebaseApp, {
                    localCache: firestoreApi.persistentLocalCache({ tabManager: firestoreApi.persistentMultipleTabManager() })
                });
            } catch {
                this.db = firestoreApi.getFirestore(firebaseApp);
            }
            this.api = firestoreApi;
            await this.upsertUserProfile();
            this.status = 'connected';
            const savedGroup = CourseCompassStore.getJSON(this.groupKey, null);
            if (savedGroup?.id) await this.restoreGroup(savedGroup.id);
            else {
                const requestedGroup = typeof globalThis.URL === 'function' && globalThis.location ? this.sanitizeCode(new globalThis.URL(globalThis.location.href).searchParams.get('group')) : '';
                if (requestedGroup.length === 6) await this.joinGroup(requestedGroup);
            }
            await this.processOutbox();
            this.subscribePersonalData();
            this.refreshPanel();
            return true;
        } catch (error) {
            this.status = 'error';
            this.error = this.friendlyError(error);
            this.refreshPanel();
            this.scheduleRetry();
            return false;
        } finally {
            this.initPromise = null;
        }
        })();
        return this.initPromise;
    },

    friendlyError(error) {
        const code = String(error?.code || '');
        if (code.includes('operation-not-allowed')) return 'Enable Anonymous and Email/Password Authentication in Firebase.';
        if (code.includes('email-already-in-use') || code.includes('credential-already-in-use')) return 'That email already has an account. Choose Sign In instead.';
        if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'The email or password is incorrect.';
        if (code.includes('weak-password')) return 'Use a password with at least six characters.';
        if (code.includes('invalid-email')) return 'Enter a valid email address.';
        if (code.includes('too-many-requests')) return 'Too many attempts. Wait briefly and try again.';
        if (code.includes('permission-denied')) return 'Firestore rejected the request. Deploy the supplied security rules.';
        if (!navigator.onLine) return 'Offline. Local changes remain queued.';
        return String(error?.message || 'Synchronization could not connect.').slice(0, 180);
    },

    scheduleRetry() {
        clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => this.status === 'connected' ? this.processOutbox() : this.init(), 15000);
    },

    async upsertUserProfile() {
        const { doc, setDoc, serverTimestamp } = this.api;
        const profile = CourseCompassStore.playerProfile;
        await setDoc(doc(this.db, 'users', this.user.uid), {
            playerId: profile.id,
            displayName: profile.name,
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    get isPermanentAccount() {
        return Boolean(this.user && !this.user.isAnonymous);
    },

    accountCredentials() {
        const email = String(document.getElementById('syncAccountEmail')?.value || '').trim().toLowerCase();
        const password = String(document.getElementById('syncAccountPassword')?.value || '');
        if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('Enter a valid email address.');
        if (password.length < 6) throw new Error('Use a password with at least six characters.');
        return { email, password };
    },

    async createAccount() {
        if (!this.auth || !this.authApi || !this.user) return;
        try {
            const { email, password } = this.accountCredentials();
            let result;
            if (this.user.isAnonymous) {
                const credential = this.authApi.EmailAuthProvider.credential(email, password);
                result = await this.authApi.linkWithCredential(this.user, credential);
            } else {
                result = { user: this.user };
            }
            this.user = result.user;
            await this.upsertUserProfile();
            await this.processOutbox();
            this.subscribePersonalData();
            this.refreshPanel();
            this.setAccountMessage('Account secured. Your existing data stays attached to this identity.', 'success');
        } catch (error) { this.setAccountMessage(this.friendlyError(error), 'error'); }
    },

    async signInAccount() {
        if (!this.auth || !this.authApi) return;
        try {
            const { email, password } = this.accountCredentials();
            this.setAccountMessage('Signing in and safely merging this device with the cloud…', 'success');
            this.unsubscribePersonal?.();
            const result = await this.authApi.signInWithEmailAndPassword(this.auth, email, password);
            this.user = result.user;
            await this.mergeAccountData();
            await this.upsertUserProfile();
            this.subscribePersonalData();
            this.refreshPanel();
            this.refreshLocalViews();
            this.setAccountMessage('Signed in. Cloud and device data are now merged and live.', 'success');
        } catch (error) { this.setAccountMessage(this.friendlyError(error), 'error'); }
    },

    async resetPassword() {
        if (!this.auth || !this.authApi) return;
        const email = String(document.getElementById('syncAccountEmail')?.value || '').trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email)) return this.setAccountMessage('Enter your email first.', 'error');
        try {
            await this.authApi.sendPasswordResetEmail(this.auth, email);
            this.setAccountMessage('Password reset email sent.', 'success');
        } catch (error) { this.setAccountMessage(this.friendlyError(error), 'error'); }
    },

    async signOutAccount() {
        if (!this.auth || !this.authApi || !confirm('Sign out on this device? Local data will remain available.')) return;
        try {
            this.unsubscribePersonal?.();
            if (this.group) {
                this.stopPresenceHeartbeat();
                const { doc, deleteDoc } = this.api;
                await deleteDoc(doc(this.db, 'groups', this.group.id, 'roundStates', this.user.uid));
                await deleteDoc(doc(this.db, 'groups', this.group.id, 'members', this.user.uid));
                this.unsubscribeMembers?.();
                this.unsubscribeRounds?.();
                this.group = null;
                this.members = [];
                this.roundStates = [];
                this.syncConflict = '';
                CourseCompassStore.remove(this.groupKey, { silent: true });
            }
            await this.authApi.signOut(this.auth);
            await this.authApi.signInAnonymously(this.auth);
            this.user = this.auth.currentUser;
            await this.upsertUserProfile();
            this.subscribePersonalData();
            this.refreshPanel();
            this.setAccountMessage('Signed out. This device is using a temporary local identity.', 'success');
        } catch (error) { this.setAccountMessage(this.friendlyError(error), 'error'); }
    },

    mergeRawValue(key, localRaw, remoteRaw) {
        if (localRaw === null) return remoteRaw;
        if (remoteRaw === null) return localRaw;
        try {
            const local = JSON.parse(localRaw);
            const remote = JSON.parse(remoteRaw);
            if ([CourseCompassStore.keys.roundHistory, CourseCompassStore.keys.clubShots, CourseCompassStore.keys.practiceSessions, CourseCompassStore.keys.roundReviews, CourseCompassStore.keys.preRoundPlans, CourseCompassStore.keys.customCourses].includes(key)) {
                const merged = new Map();
                [...(Array.isArray(remote) ? remote : []), ...(Array.isArray(local) ? local : [])]
                    .forEach((item, index) => merged.set(String(item?.id || JSON.stringify(item) || index), item));
                return JSON.stringify([...merged.values()]);
            }
            if (key === CourseCompassStore.keys.activeRound) {
                const localTime = Date.parse(local?.savedAt || 0) || 0;
                const remoteTime = Date.parse(remote?.savedAt || 0) || 0;
                return remoteTime > localTime ? remoteRaw : localRaw;
            }
            if (key === CourseCompassStore.keys.clubProfile) {
                return JSON.stringify({ ...remote, ...local, clubs: { ...(remote?.clubs || {}), ...(local?.clubs || {}) } });
            }
            if (key === CourseCompassStore.keys.playerProfile) return remoteRaw;
        } catch { /* Preserve the local provider-neutral value below. */ }
        return localRaw;
    },

    async mergeAccountData() {
        const { collection, getDocs, doc, setDoc, serverTimestamp } = this.api;
        const snapshot = await getDocs(collection(this.db, 'users', this.user.uid, 'data'));
        const remote = new Map(snapshot.docs.map(item => [item.id, item.data()?.value ?? null]));
        for (const key of CourseCompassStore.syncKeys) {
            const merged = this.mergeRawValue(key, CourseCompassStore.getRaw(key), remote.get(key) ?? null);
            if (merged === null) continue;
            CourseCompassStore.setRaw(key, merged, { silent: true });
            await setDoc(doc(this.db, 'users', this.user.uid, 'data', key), {
                key, value: merged, deviceId: CourseCompassStore.deviceId,
                playerId: CourseCompassStore.playerProfile.id,
                changedAt: new Date().toISOString(), updatedAt: serverTimestamp()
            });
        }
        CourseCompassStore.acknowledgeChanges(CourseCompassStore.outbox.map(item => item.id));
    },

    subscribePersonalData() {
        if (!this.db || !this.user || !this.api) return;
        this.unsubscribePersonal?.();
        const { collection, onSnapshot } = this.api;
        this.unsubscribePersonal = onSnapshot(collection(this.db, 'users', this.user.uid, 'data'), snapshot => {
            snapshot.docChanges().forEach(change => {
                const key = change.doc.id;
                if (!CourseCompassStore.syncKeys.has(key) || CourseCompassStore.outbox.some(item => item.key === key)) return;
                if (change.type === 'removed') CourseCompassStore.remove(key, { silent: true });
                else if (typeof change.doc.data()?.value === 'string') CourseCompassStore.setRaw(key, change.doc.data().value, { silent: true });
            });
            this.refreshLocalViews();
        }, error => {
            this.error = this.friendlyError(error);
            this.refreshPanel();
        });
    },

    refreshLocalViews() {
        if (typeof App !== 'undefined') {
            App.renderDataCenter?.();
            const badge = document.getElementById('playerName');
            if (badge) badge.textContent = CourseCompassStore.playerProfile.name;
        }
        if (typeof Caddie !== 'undefined' && typeof App !== 'undefined' && App.currentSection === 'caddie') Caddie.render(Caddie.currentTool);
        if (typeof Scoring !== 'undefined' && typeof App !== 'undefined' && App.currentSection === 'scoring' && !Scoring.players.length) Scoring.render(Scoring.currentTool);
    },

    renderAccountPanel() {
        if (!this.isConfigured()) return '<p class="data-sync-note">Configure Firebase to enable secure cross-device accounts.</p>';
        if (this.status === 'connecting') return '<p class="data-sync-note">Connecting account services…</p>';
        if (!this.auth || !this.user) return '<p class="data-sync-note">Account services are temporarily unavailable.</p>';
        if (this.isPermanentAccount) return `
            <div class="account-status-card">
                <div><strong>✓ Cross-device account</strong><p>${this.escape(this.user.email || 'Permanent account')} · Private data updates on signed-in devices.</p></div>
                <button type="button" class="btn btn-secondary btn-sm" onclick="CourseCompassSync.signOutAccount()">Sign Out</button>
            </div><div id="syncAccountMessage" class="text-sm" aria-live="polite"></div>`;
        return `
            <div class="account-sync-panel">
                <div><strong>Secure cross-device sync</strong><p>Create an account to keep this player identity and restore data on another device.</p></div>
                <div class="account-fields">
                    <input class="form-input" id="syncAccountEmail" type="email" autocomplete="email" placeholder="Email address" aria-label="Sync account email">
                    <input class="form-input" id="syncAccountPassword" type="password" minlength="6" autocomplete="current-password" placeholder="Password (6+ characters)" aria-label="Sync account password">
                </div>
                <div class="account-actions">
                    <button type="button" class="btn btn-primary btn-sm" onclick="CourseCompassSync.createAccount()">Create Account</button>
                    <button type="button" class="btn btn-secondary btn-sm" onclick="CourseCompassSync.signInAccount()">Sign In & Merge</button>
                    <button type="button" class="btn btn-ghost btn-sm" onclick="CourseCompassSync.resetPassword()">Reset Password</button>
                </div>
                <div id="syncAccountMessage" class="text-sm" aria-live="polite"></div>
            </div>`;
    },

    refreshAccountPanel() {
        const panel = document.getElementById('accountSyncPanel');
        if (panel) panel.innerHTML = this.renderAccountPanel();
    },

    setAccountMessage(message, type = 'success') {
        const element = document.getElementById('syncAccountMessage');
        if (!element) return;
        element.textContent = message;
        element.className = `text-sm ${type}`;
    },

    sanitizeCode(value) {
        return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    },

    makeGroupCode() {
        const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        const bytes = new Uint8Array(6);
        globalThis.crypto?.getRandomValues?.(bytes);
        return [...bytes].map((byte, index) => alphabet[(byte || Math.floor(Math.random() * 256) + index) % alphabet.length]).join('');
    },

    async createGroup() {
        if (this.status !== 'connected') return;
        const input = document.getElementById('syncGroupName');
        const name = String(input?.value || '').trim().slice(0, 80) || 'Golf Group';
        const code = this.makeGroupCode();
        const { doc, setDoc, serverTimestamp } = this.api;
        try {
            await setDoc(doc(this.db, 'groups', code), {
                name,
                ownerUid: this.user.uid,
                joinable: true,
                lockedThrough: 0,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            await this.writeMembership(code, 'owner');
            await this.restoreGroup(code);
            this.setPanelMessage(`Group created. Share code ${code}.`, 'success');
        } catch (error) { this.setPanelMessage(this.friendlyError(error), 'error'); }
    },

    async joinGroup(codeOverride = '') {
        if (this.status !== 'connected') return;
        const code = this.sanitizeCode(codeOverride || document.getElementById('syncJoinCode')?.value);
        if (code.length !== 6) {
            this.setPanelMessage('Enter the six-character group code.', 'error');
            return;
        }
        const { doc, getDoc } = this.api;
        try {
            const snapshot = await getDoc(doc(this.db, 'groups', code));
            if (!snapshot.exists() || snapshot.data().joinable !== true) throw new Error('This group is unavailable.');
            await this.writeMembership(code, 'player');
            await this.restoreGroup(code);
            this.setPanelMessage(`Joined ${snapshot.data().name || code}.`, 'success');
        } catch (error) { this.setPanelMessage(this.friendlyError(error), 'error'); }
    },

    groupJoinUrl() {
        if (!this.group) return '';
        const base = globalThis.location?.href || 'https://coursecompass.app/';
        if (typeof globalThis.URL !== 'function') return `${base.split('?')[0]}?group=${this.group.id}`;
        const url = new globalThis.URL(base);
        url.searchParams.set('group', this.group.id);
        return url.href;
    },

    renderGroupQr(value) {
        try {
            if (typeof globalThis.qrcode !== 'function' || !value) throw new Error('QR encoder unavailable');
            const qr = globalThis.qrcode(0, 'M');
            qr.addData(String(value));
            qr.make();
            return `<div class="group-qr" role="img" aria-label="QR code to join group ${this.escape(this.group?.id || '')}">${qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true })}</div>`;
        } catch (_) {
            return `<div class="group-qr-fallback" role="status"><strong>${this.escape(this.group?.id || '')}</strong><span>Share or enter this join code</span></div>`;
        }
    },

    async shareGroup() {
        if (!this.group) return;
        const text = `Join ${this.group.name || 'my golf group'} in CourseCompass with code ${this.group.id}`;
        const url = this.groupJoinUrl();
        try {
            if (navigator.share) await navigator.share({ title: 'CourseCompass Live Group', text, url });
            else { await navigator.clipboard.writeText(`${text}\n${url}`); this.setPanelMessage('Join link copied.', 'success'); }
        } catch (_) { /* Share cancellation is not an error. */ }
    },

    isOwner() { return Boolean(this.group && this.user && this.group.ownerUid === this.user.uid); },
    isHoleLocked(hole) { return Boolean(this.group && !this.isOwner() && Number(hole) <= Number(this.group.lockedThrough || 0)); },

    async setLockedThrough(value) {
        if (!this.isOwner() || !this.api) return;
        const lockedThrough = Math.max(0, Math.min(18, Number(value) || 0));
        const { doc, updateDoc, serverTimestamp } = this.api;
        await updateDoc(doc(this.db, 'groups', this.group.id), { lockedThrough, updatedAt: serverTimestamp() });
        this.group.lockedThrough = lockedThrough;
        this.refreshPanel();
    },

    async writeMembership(groupId, role) {
        const { doc, setDoc, serverTimestamp } = this.api;
        const profile = CourseCompassStore.playerProfile;
        await setDoc(doc(this.db, 'groups', groupId, 'members', this.user.uid), {
            uid: this.user.uid,
            playerId: profile.id,
            displayName: profile.name,
            role,
            deviceId: CourseCompassStore.deviceId,
            joinedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    },

    async restoreGroup(groupId) {
        const code = this.sanitizeCode(groupId);
        const { doc, getDoc } = this.api;
        const snapshot = await getDoc(doc(this.db, 'groups', code));
        if (!snapshot.exists()) {
            CourseCompassStore.remove(this.groupKey, { silent: true });
            return;
        }
        this.group = { id: code, ...snapshot.data() };
        CourseCompassStore.setJSON(this.groupKey, { id: code, name: this.group.name || code }, { silent: true });
        this.subscribeGroup();
        this.startPresenceHeartbeat();
        await this.publishActiveRound();
    },

    subscribeGroup() {
        this.unsubscribeGroup?.();
        this.unsubscribeMembers?.();
        this.unsubscribeRounds?.();
        const { collection, doc, onSnapshot } = this.api;
        this.unsubscribeGroup = onSnapshot(doc(this.db, 'groups', this.group.id), snapshot => {
            if (snapshot.exists()) this.group = { id: snapshot.id, ...snapshot.data() };
            this.refreshPanel();
        });
        this.unsubscribeMembers = onSnapshot(collection(this.db, 'groups', this.group.id, 'members'), snapshot => {
            this.members = snapshot.docs.map(item => ({ uid: item.id, ...item.data() }));
            this.refreshPanel();
        }, error => this.setPanelMessage(this.friendlyError(error), 'error'));
        this.unsubscribeRounds = onSnapshot(collection(this.db, 'groups', this.group.id, 'roundStates'), snapshot => {
            this.roundStates = snapshot.docs.map(item => ({ uid: item.id, ...item.data() }));
            const profile = CourseCompassStore.playerProfile;
            const collision = this.roundStates.find(state => state.playerId === profile.id && state.deviceId && state.deviceId !== CourseCompassStore.deviceId);
            this.syncConflict = collision ? `Another device is publishing as ${collision.displayName || profile.name}. Use a separate player account on each device to prevent score replacement.` : '';
            this.refreshPanel();
        }, error => this.setPanelMessage(this.friendlyError(error), 'error'));
    },

    async leaveGroup() {
        if (!this.group || !this.api) return;
        if (!confirm(`Leave ${this.group.name || this.group.id}?`)) return;
        const { doc, deleteDoc } = this.api;
        try {
            await deleteDoc(doc(this.db, 'groups', this.group.id, 'members', this.user.uid));
            await deleteDoc(doc(this.db, 'groups', this.group.id, 'roundStates', this.user.uid));
        } catch (error) {
            this.setPanelMessage(this.friendlyError(error), 'error');
            return;
        }
        this.unsubscribeMembers?.();
        this.unsubscribeRounds?.();
        this.unsubscribeGroup?.();
        this.stopPresenceHeartbeat();
        this.group = null;
        this.members = [];
        this.roundStates = [];
        this.syncConflict = '';
        CourseCompassStore.remove(this.groupKey, { silent: true });
        this.refreshPanel();
    },

    async deleteCloudAccount() {
        if (!this.user || !this.api || !this.authApi || !confirm('Permanently delete this cloud account and its synchronized CourseCompass data?')) return;
        const uid = this.user.uid;
        const { doc, deleteDoc, updateDoc, serverTimestamp } = this.api;
        try {
            if (this.group) {
                const groupId = this.group.id;
                const ownedGroup = this.group.ownerUid === uid;
                const successor = ownedGroup ? this.members.find(member => member.uid && member.uid !== uid) : null;
                if (successor) {
                    await updateDoc(doc(this.db, 'groups', groupId, 'members', successor.uid), { role: 'owner', updatedAt: serverTimestamp() });
                    await updateDoc(doc(this.db, 'groups', groupId), { ownerUid: successor.uid, updatedAt: serverTimestamp() });
                }
                await deleteDoc(doc(this.db, 'groups', groupId, 'roundStates', uid)).catch(() => {});
                await deleteDoc(doc(this.db, 'groups', groupId, 'members', uid)).catch(() => {});
                if (ownedGroup && !successor) await deleteDoc(doc(this.db, 'groups', groupId));
            }
            for (const key of CourseCompassStore.syncKeys) await deleteDoc(doc(this.db, 'users', uid, 'data', key)).catch(() => {});
            await deleteDoc(doc(this.db, 'users', uid)).catch(() => {});
            await this.authApi.deleteUser(this.user);
            this.user = null; this.group = null; this.status = 'local-only';
            App.ensureProductDialog()?.close();
            App.setDataCenterMessage('Cloud account and synchronized data deleted.', 'success');
            this.refreshPanel();
        } catch (error) { App.setDataCenterMessage(this.friendlyError(error), 'error'); }
    },

    async processOutbox() {
        if (this.status !== 'connected' || !this.user || !this.api || this.processing || !navigator.onLine) return;
        const pending = CourseCompassStore.outbox;
        if (!pending.length) return;
        this.processing = true;
        const completed = [];
        const { doc, setDoc, deleteDoc, serverTimestamp } = this.api;
        try {
            for (const change of pending) {
                const personalRef = doc(this.db, 'users', this.user.uid, 'data', change.key);
                if (change.action === 'remove') await deleteDoc(personalRef);
                else await setDoc(personalRef, {
                    key: change.key,
                    value: change.value,
                    deviceId: change.deviceId,
                    playerId: change.playerId,
                    changedAt: change.createdAt,
                    updatedAt: serverTimestamp()
                });
                if (this.group && change.key === CourseCompassStore.keys.activeRound) {
                    await this.publishActiveRound(change.action === 'remove' ? null : change.value);
                }
                if (change.key === CourseCompassStore.keys.playerProfile) {
                    await this.upsertUserProfile();
                    if (this.group) await this.writeMembership(this.group.id, this.group.ownerUid === this.user.uid ? 'owner' : 'player');
                }
                completed.push(change.id);
            }
            CourseCompassStore.acknowledgeChanges(completed);
            this.error = '';
            this.lastSyncedAt = Date.now();
        } catch (error) {
            this.error = this.friendlyError(error);
            this.scheduleRetry();
        } finally {
            this.processing = false;
            this.refreshPanel();
        }
    },

    async publishActiveRound(rawValue = undefined) {
        if (!this.group || !this.user || !this.api) return;
        const { doc, setDoc, deleteDoc, serverTimestamp } = this.api;
        const groupRef = doc(this.db, 'groups', this.group.id, 'roundStates', this.user.uid);
        const activeRound = rawValue === undefined ? CourseCompassStore.getRaw(CourseCompassStore.keys.activeRound) : rawValue;
        if (!activeRound) {
            await deleteDoc(groupRef);
            return;
        }
        await setDoc(groupRef, {
            playerId: CourseCompassStore.playerProfile.id,
            displayName: CourseCompassStore.playerProfile.name,
            activeRound,
            deviceId: CourseCompassStore.deviceId,
            clientChangedAt: new Date().toISOString(),
            updatedAt: serverTimestamp()
        });
        this.lastSyncedAt = Date.now();
    },

    timestampMillis(value) {
        if (typeof value?.toMillis === 'function') return value.toMillis();
        if (Number.isFinite(Number(value?.seconds))) return Number(value.seconds) * 1000;
        const parsed = Date.parse(value || 0);
        return Number.isFinite(parsed) ? parsed : 0;
    },

    memberPresence(member, now = Date.now()) {
        const updated = this.timestampMillis(member?.updatedAt);
        if (!updated) return { label: 'Connecting', className: 'pending', ageMinutes: null };
        const ageMinutes = Math.max(0, Math.floor((now - updated) / 60000));
        return ageMinutes <= 10 ? { label: 'Online', className: 'online', ageMinutes } : { label: `${ageMinutes}m ago`, className: 'stale', ageMinutes };
    },

    startPresenceHeartbeat() {
        this.stopPresenceHeartbeat();
        if (!this.group || this.status !== 'connected') return;
        this.presenceTimer = setInterval(() => {
            if (!this.group || document.visibilityState === 'hidden' || !navigator.onLine) return;
            this.writeMembership(this.group.id, this.group.ownerUid === this.user?.uid ? 'owner' : 'player').catch(() => {});
        }, 4 * 60 * 1000);
    },

    stopPresenceHeartbeat() {
        if (this.presenceTimer) clearInterval(this.presenceTimer);
        this.presenceTimer = null;
    },

    getLivePlayers() {
        return this.roundStates.map(state => {
            let round = null;
            try { round = JSON.parse(state.activeRound); } catch { return null; }
            const player = round?.players?.[0];
            const holes = round?.courseSnapshot?.holes || [];
            if (!player || !holes.length) return null;
            const scores = round.scores?.[player.id] || round.scores?.[String(player.id)] || {};
            let total = 0, playedPar = 0, holesPlayed = 0;
            holes.forEach(hole => {
                const score = Number(scores[hole.hole]);
                if (score > 0) { total += score; playedPar += Number(hole.par) || 0; holesPlayed++; }
            });
            return {
                uid: state.uid,
                name: state.displayName || player.name || 'Golfer',
                course: round.courseSnapshot?.name || 'Course',
                total,
                toPar: total - playedPar,
                holesPlayed,
                holesTotal: holes.length,
                deviceId: state.deviceId || '',
                updatedAt: state.updatedAt
            };
        }).filter(Boolean).sort((a, b) => (b.holesPlayed - a.holesPlayed) || (a.total - b.total));
    },

    escape(value) {
        return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
    },

    renderPanel() {
        if (!this.isConfigured()) return `
            <div class="live-sync-panel local">
                <div><strong>Live Group Sync</strong><p>Transport is ready but not configured. Scorecards continue working locally and offline.</p></div>
                <span class="sync-status-pill">Configuration required</span>
            </div>`;
        if (this.status === 'connecting') return `<div class="live-sync-panel"><strong>Connecting live synchronization…</strong></div>`;
        if (this.status === 'error') return `
            <div class="live-sync-panel error"><div><strong>Sync unavailable</strong><p>${this.escape(this.error)}</p></div><button class="btn btn-secondary btn-sm" onclick="CourseCompassSync.init()">Retry</button></div>`;
        if (this.status !== 'connected') return `<div class="live-sync-panel"><strong>Local mode</strong></div>`;
        if (!this.group) return `
            <div class="live-sync-panel connected">
                <div class="live-sync-title"><div><strong>Live Group Sync</strong><p>Connected as ${this.escape(CourseCompassStore.playerProfile.name)}</p></div><span class="sync-status-pill connected">Connected</span></div>
                <div class="live-sync-join-grid">
                    <label>New group name<input class="form-input" id="syncGroupName" maxlength="80" placeholder="Saturday Foursome"></label>
                    <button class="btn btn-primary" onclick="CourseCompassSync.createGroup()">Create Group</button>
                    <label>Join code<input class="form-input" id="syncJoinCode" maxlength="6" placeholder="ABC234" autocapitalize="characters"></label>
                    <button class="btn btn-secondary" onclick="CourseCompassSync.joinGroup()">Join Group</button>
                </div>
                <div id="liveSyncMessage" class="text-sm" aria-live="polite"></div>
            </div>`;

        const livePlayers = this.getLivePlayers();
        const members = this.members.map(member => ({ ...member, presence: this.memberPresence(member) }));
        const onlineCount = members.filter(member => member.presence.className === 'online').length;
        const memberNames = members.length ? members.map(member => `<span class="live-member ${member.presence.className}"><i></i>${this.escape(member.displayName || 'Golfer')}<small>${this.escape(member.role || 'player')} · ${this.escape(member.presence.label)}</small></span>`).join('') : '<span class="text-sm">Waiting for members</span>';
        const pending = Array.isArray(CourseCompassStore.outbox) ? CourseCompassStore.outbox.length : 0;
        const lastSync = this.lastSyncedAt ? new Date(this.lastSyncedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'waiting for first update';
        const joinUrl = this.groupJoinUrl();
        return `
            <div class="live-sync-panel connected">
                <div class="live-sync-title">
                    <div><strong>${this.escape(this.group.name || 'Live Group')}</strong><p>Code <code>${this.group.id}</code> · ${onlineCount}/${this.members.length} recently online · ${pending ? `${pending} queued locally` : `synced ${lastSync}`}</p></div>
                    <div><button class="btn btn-secondary btn-sm" onclick="CourseCompassSync.shareGroup()">Share / Copy</button><button class="btn btn-ghost btn-sm" onclick="CourseCompassSync.leaveGroup()">Leave</button></div>
                </div>
                <details class="group-join-tools"><summary>Join QR & host controls</summary><div>${this.renderGroupQr(joinUrl)}<p>Scan to open CourseCompass with group code <strong>${this.group.id}</strong>. The QR code is generated privately on this device.</p>${this.isOwner() ? `<label>Lock scoring through hole <select class="form-select" onchange="CourseCompassSync.setLockedThrough(this.value)">${Array.from({ length: 19 }, (_, hole) => `<option value="${hole}" ${Number(this.group.lockedThrough || 0) === hole ? 'selected' : ''}>${hole ? `Hole ${hole}` : 'None'}</option>`).join('')}</select></label>` : `<p>Host lock: through hole ${Number(this.group.lockedThrough || 0) || 'none'}.</p>`}</div></details>
                <div class="live-member-list">${memberNames}</div>
                ${this.syncConflict ? `<div class="sync-conflict-alert" role="alert"><strong>Player identity conflict</strong><span>${this.escape(this.syncConflict)}</span></div>` : ''}
                <div class="live-player-grid">${livePlayers.length ? livePlayers.map(player => `
                    <div class="live-player-card">
                        <strong>${this.escape(player.name)}</strong><span>${this.escape(player.course)}</span>
                        <b>${player.total || '—'} <small>${player.holesPlayed ? (player.toPar === 0 ? 'E' : player.toPar > 0 ? `+${player.toPar}` : player.toPar) : ''}</small></b>
                        <span>${player.holesPlayed}/${player.holesTotal} holes · ${this.escape(this.memberPresence({ updatedAt: player.updatedAt }).label)}</span>
                    </div>`).join('') : '<p class="text-sm">Start a solo scorecard on each device to publish live scores.</p>'}</div>
                <div id="liveSyncMessage" class="text-sm" aria-live="polite"></div>
            </div>`;
    },

    refreshPanel() {
        const panel = document.getElementById('liveSyncPanel');
        if (panel) panel.innerHTML = this.renderPanel();
        const status = document.getElementById('syncStatusPill');
        if (status) {
            status.textContent = this.status === 'connected' ? (this.group ? `Live · ${this.group.id}` : 'Cloud connected') : this.status === 'error' ? 'Sync error' : 'Local-only';
            status.classList.toggle('connected', this.status === 'connected');
        }
        this.refreshAccountPanel();
    },

    setPanelMessage(message, type = 'success') {
        const element = document.getElementById('liveSyncMessage');
        if (!element) return;
        element.textContent = message;
        element.className = `text-sm ${type}`;
    }
};
