const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const puppeteer = require('puppeteer');

const root = path.resolve(__dirname, '..');
const screenshotDir = path.join(root, 'release-assets', 'screenshots');
const mime = { '.css': 'text/css', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };

function createServer() {
    return http.createServer((request, response) => {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        const target = path.resolve(root, relative);
        if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
            response.writeHead(404).end('Not found');
            return;
        }
        response.setHeader('Content-Type', mime[path.extname(target)] || 'application/octet-stream');
        fs.createReadStream(target).pipe(response);
    });
}

(async () => {
    const server = createServer();
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address();
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    const pageErrors = [];
    const remoteFontRequests = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('request', request => { if (/fonts\.(googleapis|gstatic)\.com/i.test(request.url())) remoteFontRequests.push(request.url()); });
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument(() => localStorage.setItem('coursecompass-onboarding-complete', '1'));

    try {
        await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('#voiceCaddieButton', { visible: true });
        await page.waitForFunction(() => document.getElementById('splash-screen')?.style.display === 'none', { timeout: 5000 });
        assert.equal(await page.evaluate(() => {
            if (typeof globalThis.qrcode !== 'function') return false;
            const qr = globalThis.qrcode(0, 'M');
            qr.addData('https://coursecompass.app/?group=ABC234');
            qr.make();
            return /<svg/i.test(qr.createSvgTag({ cellSize: 2, margin: 2 }));
        }), true, 'Bundled offline QR encoder did not produce an SVG invitation.');
        const audit = await page.evaluate(() => {
            const visible = element => Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
            const controls = [...document.querySelectorAll('button, a[href], input, select, textarea')].filter(visible);
            const unlabeled = controls.filter(element => {
                if (element.matches('input, select, textarea')) return !(element.labels?.length || element.getAttribute('aria-label') || element.getAttribute('title'));
                return !(element.textContent.trim() || element.getAttribute('aria-label') || element.getAttribute('title'));
            }).map(element => element.id || element.className || element.tagName);
            const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
            const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
            const imagesWithoutAlt = [...document.images].filter(image => !image.hasAttribute('alt')).map(image => image.src);
            const nonKeyboardClickTargets = [...document.querySelectorAll('[onclick]')].filter(element => visible(element) && !element.matches('button, a[href], input, select, textarea, [role="button"][tabindex]')).map(element => element.className || element.tagName);
            return {
                unlabeled,
                duplicateIds,
                imagesWithoutAlt,
                nonKeyboardClickTargets,
                horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
            };
        });
        assert.deepEqual(audit.unlabeled, [], `Unlabeled controls: ${audit.unlabeled.join(', ')}`);
        assert.deepEqual(audit.duplicateIds, [], `Duplicate IDs: ${audit.duplicateIds.join(', ')}`);
        assert.deepEqual(audit.imagesWithoutAlt, [], 'All images must provide alt text, including an empty alt for decorative images.');
        assert.deepEqual(audit.nonKeyboardClickTargets, [], `Pointer-only controls: ${audit.nonKeyboardClickTargets.join(', ')}`);
        assert.ok(audit.horizontalOverflow <= 1, `Mobile layout overflows horizontally by ${audit.horizontalOverflow}px.`);

        const quality = await page.evaluate(() => {
            const sameOriginResources = performance.getEntriesByType('resource').filter(entry => new URL(entry.name).origin === location.origin);
            const loadedBytes = sameOriginResources.reduce((total, entry) => total + (entry.transferSize || entry.encodedBodySize || 0), 0);
            const smallTargets = [...document.querySelectorAll('button, a[href], input, select, textarea')]
                .filter(element => element.offsetWidth || element.offsetHeight)
                .map(element => ({ element, rect: element.getBoundingClientRect() }))
                .filter(item => item.rect.width < 24 || item.rect.height < 24)
                .map(item => item.element.id || item.element.textContent.trim().slice(0, 30) || item.element.tagName);
            const parse = color => (color.match(/[\d.]+/g) || []).slice(0, 3).map(Number);
            const luminance = color => {
                const values = parse(color).map(value => { const channel = value / 255; return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4; });
                return values.length === 3 ? 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2] : null;
            };
            const samples = ['body', '.logo-text', '.hero-card p', '.stat-label'].map(selector => document.querySelector(selector)).filter(Boolean).map(element => {
                const style = getComputedStyle(element);
                let ancestor = element;
                let background = style.backgroundColor;
                while (ancestor && (!background || background === 'rgba(0, 0, 0, 0)')) {
                    ancestor = ancestor.parentElement;
                    background = ancestor ? getComputedStyle(ancestor).backgroundColor : 'rgb(255, 255, 255)';
                }
                const foregroundLum = luminance(style.color);
                const backgroundLum = luminance(background);
                const ratio = foregroundLum === null || backgroundLum === null ? 0 : (Math.max(foregroundLum, backgroundLum) + 0.05) / (Math.min(foregroundLum, backgroundLum) + 0.05);
                const large = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700);
                return { selector: element.matches('body') ? 'body' : element.className, ratio, required: large ? 3 : 4.5 };
            });
            return {
                domNodes: document.getElementsByTagName('*').length,
                loadedBytes,
                loadMilliseconds: performance.now(),
                smallTargets,
                contrast: samples
            };
        });
        assert.ok(quality.domNodes < 5000, `Initial DOM contains ${quality.domNodes} nodes.`);
        assert.ok(quality.loadedBytes < 5 * 1024 * 1024, `Same-origin initial transfer is ${quality.loadedBytes} bytes.`);
        assert.ok(quality.loadMilliseconds < 8000, `Initial experience took ${Math.round(quality.loadMilliseconds)}ms in the smoke environment.`);
        assert.deepEqual(quality.smallTargets, [], `Visible targets smaller than 24 CSS px: ${quality.smallTargets.join(', ')}`);
        const lowContrast = quality.contrast.filter(sample => sample.ratio + 0.01 < sample.required);
        assert.deepEqual(lowContrast, [], `Representative text contrast failures: ${JSON.stringify(lowContrast)}`);

        const largeTextOverflow = await page.evaluate(() => {
            document.documentElement.style.fontSize = '200%';
            return new Promise(resolve => requestAnimationFrame(() => resolve({
                pixels: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                offenders: [...document.querySelectorAll('body *')].filter(element => {
                    const rect = element.getBoundingClientRect();
                    return rect.right > document.documentElement.clientWidth + 1 || rect.left < -1;
                }).slice(0, 12).map(element => element.id || String(element.className || element.tagName))
            })));
        });
        assert.ok(largeTextOverflow.pixels <= 1, `Layout overflows horizontally at 200% root text by ${largeTextOverflow.pixels}px: ${largeTextOverflow.offenders.join(', ')}.`);
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });

        const navigate = async section => {
            const selector = `.nav-btn[data-section="${section}"]`;
            if (!(await page.$eval(selector, element => Boolean(element.offsetWidth || element.offsetHeight)))) {
                await page.click('.menu-toggle');
                await page.waitForSelector(selector, { visible: true });
            }
            await page.click(selector);
        };
        for (const section of ['learn', 'caddie', 'scoring', 'leaderboard', 'trivia', 'glossary', 'home']) {
            await navigate(section);
            assert.equal(await page.$eval(`#section-${section}`, element => element.classList.contains('active')), true, `${section} navigation did not activate its section.`);
        }

        fs.mkdirSync(screenshotDir, { recursive: true });
        await page.screenshot({ path: path.join(screenshotDir, 'phone-home.png'), fullPage: true });
        await navigate('caddie');
        await page.screenshot({ path: path.join(screenshotDir, 'phone-caddie.png'), fullPage: true });
        await page.setViewport({ width: 1024, height: 1366, deviceScaleFactor: 1 });
        await navigate('home');
        await page.screenshot({ path: path.join(screenshotDir, 'tablet-home.png'), fullPage: true });

        const serviceWorkerReady = await page.evaluate(async () => {
            if (!('serviceWorker' in navigator)) return false;
            await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Service worker timeout')), 5000))]);
            return true;
        });
        assert.equal(serviceWorkerReady, true, 'Service worker did not become ready.');
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
        assert.equal(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)), true, 'Service worker did not take control after reload.');
        await page.setOfflineMode(true);
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForSelector('#voiceCaddieButton', { visible: true, timeout: 5000 });
        await page.waitForFunction(() => document.getElementById('splash-screen')?.style.display === 'none', { timeout: 5000 });
        assert.equal(await page.$eval('#app', element => !element.classList.contains('hidden')), true, 'Offline app shell did not start.');
        await page.setOfflineMode(false);
        assert.deepEqual(pageErrors, [], `Page errors: ${pageErrors.join(' | ')}`);
        assert.deepEqual(remoteFontRequests, [], 'Typography must remain self-hosted and available offline.');
        const report = { generatedAt: new Date().toISOString(), status: 'passed', sections: 7, screenshots: 3, accessibility: audit, quality, offlineStartup: true };
        const reportDir = path.join(root, 'release-assets', 'reports');
        fs.mkdirSync(reportDir, { recursive: true });
        fs.writeFileSync(path.join(reportDir, 'e2e-smoke.json'), `${JSON.stringify(report, null, 2)}\n`);
        console.log(JSON.stringify(report, null, 2));
    } finally {
        await browser.close();
        await new Promise(resolve => server.close(resolve));
    }
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
