const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist', 'pages');
const files = ['index.html', 'manifest.json', 'sw.js'];
const directories = ['assets', 'css', 'data', 'icons', 'js', 'legal'];

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const relative of files) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source)) throw new Error(`Missing Pages file: ${relative}`);
    fs.copyFileSync(source, path.join(output, relative));
}

for (const relative of directories) {
    const source = path.join(root, relative);
    if (!fs.existsSync(source)) throw new Error(`Missing Pages directory: ${relative}`);
    fs.cpSync(source, path.join(output, relative), { recursive: true });
}

fs.writeFileSync(path.join(output, '.nojekyll'), '');
console.log(`GitHub Pages bundle created at ${output}`);

