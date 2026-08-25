const fs = require('node:fs');
const path = require('node:path');
const { createCanvas } = require('canvas');

const root = __dirname;
const output = path.join(root, 'release-assets', 'store');
fs.mkdirSync(output, { recursive: true });

function drawBrand(width, height, destination) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#071e18'); gradient.addColorStop(0.55, '#0b3b2e'); gradient.addColorStop(1, '#146149');
    context.fillStyle = gradient; context.fillRect(0, 0, width, height);

    context.globalAlpha = 0.14; context.strokeStyle = '#d5bf92'; context.lineWidth = Math.max(1, width / 900);
    for (let index = 0; index < 7; index += 1) {
        context.beginPath();
        const y = height * (0.15 + index * 0.115);
        context.moveTo(width * 0.5, y);
        context.bezierCurveTo(width * 0.68, y - height * 0.12, width * 0.8, y + height * 0.15, width * 1.05, y - height * 0.02);
        context.stroke();
    }
    context.globalAlpha = 1;

    const unit = width / 1024;
    context.strokeStyle = '#d5bf92'; context.lineWidth = 9 * unit; context.lineCap = 'round';
    context.beginPath(); context.arc(128 * unit, height / 2, 64 * unit, Math.PI * 0.28, Math.PI * 1.72); context.stroke();
    context.strokeStyle = '#f7f6f1'; context.lineWidth = 7 * unit; context.beginPath(); context.moveTo(129 * unit, height / 2); context.lineTo(179 * unit, height / 2); context.stroke();

    context.fillStyle = '#d5bf92'; context.font = `700 ${18 * unit}px Arial`; context.letterSpacing = `${3 * unit}px`; context.fillText('COURSE INTELLIGENCE', 230 * unit, height * 0.30);
    context.fillStyle = '#f7f6f1'; context.font = `700 ${58 * unit}px Georgia`; context.fillText('Play with clarity.', 226 * unit, height * 0.50);
    context.fillStyle = '#dce7e2'; context.font = `400 ${24 * unit}px Arial`; context.fillText('Live conditions  ·  Personal distances  ·  Group scoring', 230 * unit, height * 0.64);
    context.fillStyle = '#d5bf92'; context.fillRect(230 * unit, height * 0.72, 96 * unit, 3 * unit);

    fs.writeFileSync(destination, canvas.toBuffer('image/png'));
}

drawBrand(1024, 500, path.join(output, 'feature-graphic-1024x500.png'));
drawBrand(1200, 630, path.join(output, 'social-preview-1200x630.png'));
console.log(`Generated store assets in ${output}`);
