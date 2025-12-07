const fs = require('fs');
const path = require('path');

// Create a simple SVG icon with a kava cup emoji representation
const createSvgIcon = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#6c5ce7" rx="${size * 0.15}"/>
  <text x="50%" y="55%" font-size="${size * 0.5}" text-anchor="middle" dominant-baseline="middle">🥥</text>
  <text x="50%" y="82%" font-size="${size * 0.1}" fill="white" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">KAVA</text>
</svg>`;
};

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icons (PNG would require additional processing)
sizes.forEach(size => {
  const svg = createSvgIcon(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Created ${filename}`);
});

console.log('\nIcons created! For production, convert SVGs to PNGs using an online tool or image editor.');

