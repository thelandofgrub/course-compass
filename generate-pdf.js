const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer');

const root = __dirname;
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const inline = value => escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

function markdownToHtml(markdown) {
    let inList = false;
    const output = [];
    const closeList = () => { if (inList) { output.push('</ul>'); inList = false; } };
    for (const rawLine of markdown.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) { closeList(); continue; }
        if (/^---+$/.test(line)) { closeList(); output.push('<hr>'); continue; }
        const heading = line.match(/^(#{1,3})\s+(.+)$/);
        if (heading) { closeList(); output.push(`<h${heading[1].length}>${inline(heading[2])}</h${heading[1].length}>`); continue; }
        const item = line.match(/^[-*]\s+(.+)$/);
        if (item) { if (!inList) { output.push('<ul>'); inList = true; } output.push(`<li>${inline(item[1])}</li>`); continue; }
        closeList();
        output.push(`<p>${inline(line)}</p>`);
    }
    closeList();
    return output.join('\n');
}

(async () => {
    const markdown = fs.readFileSync(path.join(root, 'PROMOTIONAL.md'), 'utf8');
    const css = fs.readFileSync(path.join(root, 'pdf-style.css'), 'utf8');
    const browser = await puppeteer.launch({ headless: true });
    try {
        const page = await browser.newPage();
        await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${markdownToHtml(markdown)}</body></html>`, { waitUntil: 'load' });
        await page.pdf({ path: path.join(root, 'CourseCompass_Promotional.pdf'), format: 'Letter', printBackground: true, margin: { top: '0.65in', right: '0.7in', bottom: '0.65in', left: '0.7in' } });
        console.log('PDF created: CourseCompass_Promotional.pdf');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
