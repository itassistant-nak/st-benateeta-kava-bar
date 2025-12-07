const fs = require('fs');
const path = require('path');

// Create simple colored square PNG icons
// This is a minimal valid PNG file generator

function createPng(size, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(size, 8); // width
  ihdr.writeUInt32BE(size, 12); // height
  ihdr.writeUInt8(8, 16); // bit depth
  ihdr.writeUInt8(2, 17); // color type (RGB)
  ihdr.writeUInt8(0, 18); // compression
  ihdr.writeUInt8(0, 19); // filter
  ihdr.writeUInt8(0, 20); // interlace
  const ihdrCrc = crc32(ihdr.slice(4, 21));
  ihdr.writeUInt32BE(ihdrCrc, 21);

  // IDAT chunk - create image data
  const zlib = require('zlib');
  const rawData = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    rawData[y * (size * 3 + 1)] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const offset = y * (size * 3 + 1) + 1 + x * 3;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
    }
  }
  
  const compressed = zlib.deflateSync(rawData);
  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idat.writeUInt32BE(idatCrc, compressed.length + 8);

  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let crc = 0xffffffff;
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');

// Purple color matching theme (#6c5ce7)
const r = 108, g = 92, b = 231;

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const png = createPng(size, r, g, b);
  const filename = `icon-${size}x${size}.png`;
  fs.writeFileSync(path.join(iconsDir, filename), png);
  console.log(`Created ${filename}`);
});

console.log('\nAll icons created successfully!');

