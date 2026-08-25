const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const runId = `IT-${Date.now().toString(36).toUpperCase()}`;
const results = [];

function createServer() {
    return http.createServer((request, response) => {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        const target = path.resolve(root, relative);
        if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) return response.writeHead(404).end('Not found');
        response.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
        fs.createReadStream(target).pipe(response);
    });
}

const round = (name, score) => JSON.stringify({
    version: 1,
    savedAt: new Date().toISOString(),
    courseId: 'integration-course',
    currentHole: 1,
    courseSnapshot: { id: 'integration-course', name: 'Integration Test Course', holes: [{ hole: 1, par: 4, yards: 400 }, { hole: 2, par: 3, yards: 160 }] },
    players: [{ id: 0, name, color: '#17644b' }],
    scores: { 0: { 1: score, 2: null } },
    roundStats: { 0: {} }, roundShots: { 0: {} }, roundPins: {}
});

async function waitFor(page, expression, timeout = 20000, ...args) {
    await page.waitForFunction(expression, { timeout }, ...args);
}

(async () => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await puppeteer.launch({ headless: true });
    const hostContext = await browser.createBrowserContext();
    const guestContext = await browser.createBrowserContext();
    const host = await hostContext.newPage();
    const guest = await guestContext.newPage();
    const clientDiagnostics = new Map([[host, { pageErrors: [], failedRequests: [] }], [guest, { pageErrors: [], failedRequests: [] }]]);
    let groupId = '';
    let hostIdentity = null;
    let guestIdentity = null;
    let hostAccountDeleted = false;
    const cleanupErrors = [];

    for (const page of [host, guest]) {
        page.on('pageerror', error => clientDiagnostics.get(page).pageErrors.push(error.message));
        page.on('requestfailed', request => {
            if (/firebase|googleapis|gstatic/i.test(request.url())) clientDiagnostics.get(page).failedRequests.push(`${request.url()} — ${request.failure()?.errorText || 'failed'}`);
        });
        await page.evaluateOnNewDocument(() => localStorage.setItem('coursecompass-onboarding-complete', '1'));
        await page.goto(origin, { waitUntil: 'domcontentloaded' });
    }

    try {
        for (const page of [host, guest]) {
            try {
                await waitFor(page, () => typeof CourseCompassSync !== 'undefined' && (CourseCompassSync.status === 'connected' || CourseCompassSync.status === 'error'), 60000);
            } catch (_) {
                const state = await page.evaluate(() => typeof CourseCompassSync === 'undefined' ? { loaded: false, online: navigator.onLine } : { loaded: true, status: CourseCompassSync.status, error: CourseCompassSync.error, configured: CourseCompassSync.isConfigured(), online: navigator.onLine });
                throw new Error(`Firebase connection timeout: ${JSON.stringify({ ...state, ...clientDiagnostics.get(page) })}`);
            }
            const state = await page.evaluate(() => ({ status: CourseCompassSync.status, error: CourseCompassSync.error, uid: CourseCompassSync.user?.uid }));
            assert.equal(state.status, 'connected', state.error || 'Firebase client did not connect.');
            assert.ok(state.uid, 'Anonymous Firebase identity was not created.');
        }
        results.push('two isolated Firebase clients authenticated');

        hostIdentity = await host.evaluate(async name => {
            const profile = CourseCompassStore.updatePlayerProfile(name);
            await CourseCompassSync.processOutbox();
            await CourseCompassSync.upsertUserProfile();
            return { uid: CourseCompassSync.user.uid, playerId: profile.id, deviceId: CourseCompassStore.deviceId, name: profile.name };
        }, `Host ${runId}`);
        guestIdentity = await guest.evaluate(async name => {
            const profile = CourseCompassStore.updatePlayerProfile(name);
            await CourseCompassSync.processOutbox();
            await CourseCompassSync.upsertUserProfile();
            return { uid: CourseCompassSync.user.uid, playerId: profile.id, deviceId: CourseCompassStore.deviceId, name: profile.name };
        }, `Guest ${runId}`);
        assert.notEqual(hostIdentity.uid, guestIdentity.uid);
        assert.notEqual(hostIdentity.deviceId, guestIdentity.deviceId);
        results.push('player and device identities remained distinct');

        const groupCreation = await host.evaluate(async name => {
            const input = document.createElement('input');
            input.id = 'syncGroupName'; input.value = name; document.body.append(input);
            let message = '';
            const originalMessage = CourseCompassSync.setPanelMessage;
            CourseCompassSync.setPanelMessage = value => { message = String(value || ''); };
            await CourseCompassSync.createGroup();
            CourseCompassSync.setPanelMessage = originalMessage;
            input.remove();
            return { groupId: CourseCompassSync.group?.id || '', message, status: CourseCompassSync.status, error: CourseCompassSync.error };
        }, `CourseCompass ${runId}`);
        groupId = groupCreation.groupId;
        assert.match(groupId, /^[A-Z2-9]{6}$/, groupCreation.message || groupCreation.error || 'Group creation failed.');
        const guestJoin = await guest.evaluate(async code => {
            let message = '';
            const originalMessage = CourseCompassSync.setPanelMessage;
            CourseCompassSync.setPanelMessage = value => { message = String(value || ''); };
            await CourseCompassSync.joinGroup(code);
            CourseCompassSync.setPanelMessage = originalMessage;
            return { groupId: CourseCompassSync.group?.id || '', message, memberCount: CourseCompassSync.members.length };
        }, groupId);
        assert.equal(guestJoin.groupId, groupId, guestJoin.message || 'Guest did not join the group.');
        try {
            await waitFor(host, () => CourseCompassSync.members.length === 2, 30000);
            await waitFor(guest, () => CourseCompassSync.members.length === 2, 30000);
        } catch (_) {
            const membershipState = await Promise.all([host, guest].map(page => page.evaluate(() => ({ groupId: CourseCompassSync.group?.id || '', members: CourseCompassSync.members.map(member => ({ uid: member.uid, role: member.role })), error: CourseCompassSync.error }))));
            throw new Error(`Membership subscription timeout: ${JSON.stringify({ guestJoin, membershipState })}`);
        }
        results.push(`group ${groupId} created and joined in real time`);

        await host.evaluate(raw => { CourseCompassStore.setRaw(CourseCompassStore.keys.activeRound, raw); return CourseCompassSync.processOutbox(); }, round(hostIdentity.name, 4));
        await guest.evaluate(raw => { CourseCompassStore.setRaw(CourseCompassStore.keys.activeRound, raw); return CourseCompassSync.processOutbox(); }, round(guestIdentity.name, 5));
        await waitFor(host, () => CourseCompassSync.getLivePlayers().length === 2);
        await waitFor(guest, () => CourseCompassSync.getLivePlayers().length === 2);
        const hostView = await host.evaluate(() => CourseCompassSync.getLivePlayers().map(player => ({ name: player.name, total: player.total })));
        const guestView = await guest.evaluate(() => CourseCompassSync.getLivePlayers().map(player => ({ name: player.name, total: player.total })));
        assert.deepEqual(hostView, guestView);
        assert.ok(hostView.some(player => player.name.includes('Host') && player.total === 4));
        assert.ok(hostView.some(player => player.name.includes('Guest') && player.total === 5));
        results.push('bidirectional live score propagation verified');

        await host.evaluate(() => CourseCompassSync.setLockedThrough(1));
        await waitFor(guest, () => Number(CourseCompassSync.group?.lockedThrough) === 1);
        assert.equal(await guest.evaluate(() => CourseCompassSync.isHoleLocked(1)), true);
        assert.equal(await guest.evaluate(() => CourseCompassSync.isHoleLocked(2)), false);
        results.push('host lock propagated and enforced');

        await guest.setOfflineMode(true);
        await guest.evaluate(raw => CourseCompassStore.setRaw(CourseCompassStore.keys.activeRound, raw), round(guestIdentity.name, 6));
        assert.ok(await guest.evaluate(() => CourseCompassStore.outbox.length > 0));
        await guest.setOfflineMode(false);
        await guest.evaluate(() => CourseCompassSync.processOutbox());
        await waitFor(host, () => CourseCompassSync.getLivePlayers().some(player => player.name.includes('Guest') && player.total === 6), 30000);
        assert.equal(await guest.evaluate(() => CourseCompassStore.outbox.length), 0);
        results.push('offline queue reconciled after reconnect');

        await guest.evaluate(async hostPlayerId => {
            const original = CourseCompassStore.playerProfile;
            CourseCompassStore.setJSON(CourseCompassStore.keys.playerProfile, { ...original, id: hostPlayerId });
            await CourseCompassSync.processOutbox();
            await CourseCompassSync.publishActiveRound();
        }, hostIdentity.playerId);
        await waitFor(host, () => Boolean(CourseCompassSync.syncConflict));
        assert.match(await host.evaluate(() => CourseCompassSync.syncConflict), /Another device/);
        await guest.evaluate(async identity => {
            const current = CourseCompassStore.playerProfile;
            CourseCompassStore.setJSON(CourseCompassStore.keys.playerProfile, { ...current, id: identity.playerId, name: identity.name });
            await CourseCompassSync.processOutbox();
            await CourseCompassSync.publishActiveRound();
        }, guestIdentity);
        await waitFor(host, () => !CourseCompassSync.syncConflict);
        results.push('duplicate-player conflict detected and cleared');

        const deletionResult = await host.evaluate(async () => {
            globalThis.confirm = () => true;
            await CourseCompassSync.deleteCloudAccount();
            return { user: CourseCompassSync.user, group: CourseCompassSync.group, status: CourseCompassSync.status };
        });
        assert.equal(deletionResult.user, null);
        assert.equal(deletionResult.group, null);
        await waitFor(guest, expectedUid => CourseCompassSync.group?.ownerUid === expectedUid && CourseCompassSync.members.some(member => member.uid === expectedUid && member.role === 'owner'), 30000, guestIdentity.uid);
        assert.equal(await guest.evaluate(hostUid => CourseCompassSync.members.some(member => member.uid === hostUid), hostIdentity.uid), false);
        hostAccountDeleted = true;
        results.push('host account deletion transferred group ownership and removed host cloud data');
    } finally {
        if (groupId && hostIdentity && guestIdentity) {
            try {
                const cleanupPage = hostAccountDeleted ? guest : host;
                await cleanupPage.evaluate(async ({ groupId, uids }) => {
                    CourseCompassSync.unsubscribeMembers?.(); CourseCompassSync.unsubscribeRounds?.(); CourseCompassSync.unsubscribeGroup?.(); CourseCompassSync.stopPresenceHeartbeat();
                    const { doc, deleteDoc } = CourseCompassSync.api;
                    for (const uid of uids) await deleteDoc(doc(CourseCompassSync.db, 'groups', groupId, 'roundStates', uid)).catch(() => {});
                    for (const uid of uids) await deleteDoc(doc(CourseCompassSync.db, 'groups', groupId, 'members', uid)).catch(() => {});
                    await deleteDoc(doc(CourseCompassSync.db, 'groups', groupId));
                }, { groupId, uids: [hostIdentity.uid, guestIdentity.uid] });
            } catch (error) { cleanupErrors.push(`group cleanup: ${error.message}`); }
        }
        for (const [page, identity] of [[guest, guestIdentity], [host, hostIdentity]]) {
            if (!identity) continue;
            try {
                await page.evaluate(async uid => {
                    const { doc, deleteDoc } = CourseCompassSync.api;
                    for (const key of CourseCompassStore.syncKeys) await deleteDoc(doc(CourseCompassSync.db, 'users', uid, 'data', key)).catch(() => {});
                    await deleteDoc(doc(CourseCompassSync.db, 'users', uid)).catch(() => {});
                    if (CourseCompassSync.user) await CourseCompassSync.authApi.deleteUser(CourseCompassSync.user);
                }, identity.uid);
            } catch (error) { cleanupErrors.push(`${identity.name} cleanup: ${error.message}`); }
        }
        await hostContext.close(); await guestContext.close(); await browser.close();
        await new Promise(resolve => server.close(resolve));
    }

    assert.deepEqual(cleanupErrors, [], cleanupErrors.join(' | '));
    console.log(JSON.stringify({ status: 'passed', runId, checks: results, cleanup: 'all disposable Firebase data and anonymous users removed' }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
