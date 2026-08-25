/**
 * generate-icons.js
 * Generates PNG app icons at all required sizes using the Canvas API.
 * Run: node generate-icons.js
 * Requires: npm install canvas
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512, 1024];
const outDir = path.join(__dirname, 'icons');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background gradient (green)
  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#2d5016');
  grad.addColorStop(0.5, '#4a8526');
  grad.addColorStop(1, '#1a3409');
  ctx.fillStyle = grad;

  // Rounded rectangle
  const r = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Flag pole
  const cx = size * 0.5;
  const poleTop = size * 0.15;
  const poleBottom = size * 0.72;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, size * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx, poleTop);
  ctx.lineTo(cx, poleBottom);
  ctx.stroke();

  // Flag triangle
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.moveTo(cx, poleTop);
  ctx.lineTo(cx + size * 0.18, poleTop + size * 0.08);
  ctx.lineTo(cx, poleTop + size * 0.16);
  ctx.closePath();
  ctx.fill();

  // Hole (circle)
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.ellipse(cx, poleBottom + size * 0.02, size * 0.08, size * 0.035, 0, 0, Math.PI * 2);
  ctx.fill();

  // Golf ball
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx + size * 0.15, poleBottom - size * 0.02, size * 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = Math.max(0.5, size * 0.004);
  ctx.stroke();

  // "CC" text
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.16)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CC', cx, size * 0.88);

  // Save
  const buf = canvas.toBuffer('image/png');
  const filePath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, buf);
  console.log(`Created ${filePath} (${size}x${size})`);
}

console.log('\nAll icons generated!');
