// scripts/generate-icons.js
// Generates PWA PNG and SVG icons for BSF THE GYM using sharp
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Crisp SVG Dumbbell + Gym Typography in BSF Amber & Dark Theme
function createSvg(size, paddingRatio = 0.18, isMaskable = false) {
  const pad = Math.round(size * (isMaskable ? 0.24 : paddingRatio));
  const innerSize = size - pad * 2;
  const radius = isMaskable ? 0 : Math.round(size * 0.22);

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#14171D"/>
        <stop offset="100%" stop-color="#0B0C0E"/>
      </linearGradient>
      <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FBBF24"/>
        <stop offset="50%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#D97706"/>
      </linearGradient>
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#F59E0B" flood-opacity="0.3"/>
      </filter>
    </defs>
    
    <!-- Background rounded squircle / rect -->
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bgGrad)"/>
    
    <!-- Subtle amber border -->
    <rect x="2" y="2" width="${size - 4}" height="${size - 4}" rx="${Math.max(0, radius - 2)}" fill="none" stroke="#F59E0B" stroke-opacity="0.25" stroke-width="2"/>
    
    <!-- Centered dumbbell emblem & BSF letters -->
    <g transform="translate(${pad}, ${pad})" filter="url(#glow)">
      <!-- Scaled 24x24 Dumbbell Path -->
      <g transform="scale(${innerSize / 24})">
        <!-- Dumbbell Plates & Bar -->
        <rect x="2" y="7" width="2" height="10" rx="1" fill="url(#amberGrad)"/>
        <rect x="5" y="5" width="2" height="14" rx="1" fill="url(#amberGrad)"/>
        
        <rect x="8" y="10.5" width="8" height="3" rx="1.5" fill="#FFFFFF" fill-opacity="0.95"/>
        
        <rect x="17" y="5" width="2" height="14" rx="1" fill="url(#amberGrad)"/>
        <rect x="20" y="7" width="2" height="10" rx="1" fill="url(#amberGrad)"/>
      </g>
    </g>

    <!-- Gym Brand Acronym -->
    <text x="${size / 2}" y="${size * 0.86}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="${Math.round(size * 0.13)}" fill="#F3F4F6" text-anchor="middle" letter-spacing="2">BSF GYM</text>
  </svg>
  `.trim();
}

async function run() {
  console.log('Generating PWA icons in public/icons/...');

  // 1. Save SVG
  const svg512 = createSvg(512, 0.18, false);
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), svg512);

  // 2. Generate 192x192 PNG
  await sharp(Buffer.from(createSvg(192, 0.16, false)))
    .png()
    .toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('✓ icon-192.png generated');

  // 3. Generate 512x512 PNG
  await sharp(Buffer.from(svg512))
    .png()
    .toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('✓ icon-512.png generated');

  // 4. Generate 512x512 Maskable PNG (more safe margin padding, no corner radius)
  const maskableSvg = createSvg(512, 0.22, true);
  await sharp(Buffer.from(maskableSvg))
    .png()
    .toFile(path.join(iconsDir, 'icon-maskable-512.png'));
  console.log('✓ icon-maskable-512.png generated');

  // 5. Generate 180x180 Apple Touch Icon
  await sharp(Buffer.from(createSvg(180, 0.16, false)))
    .png()
    .toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png generated');

  console.log('All icons generated successfully!');
}

run().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
