import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create clean, high-contrast SVG
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" />
      <stop offset="100%" stop-color="#f4f4f5" />
    </linearGradient>
  </defs>
  <!-- Background with crisp accessible border -->
  <rect width="512" height="512" rx="104" fill="url(#bg)" stroke="#18181b" stroke-width="16" />
  
  <!-- Outer Sensory Sonar Waves -->
  <circle cx="256" cy="256" r="190" fill="none" stroke="#2563eb" stroke-width="14" stroke-linecap="round" stroke-dasharray="16 28" opacity="0.8" />
  <circle cx="256" cy="256" r="140" fill="none" stroke="#2563eb" stroke-width="18" stroke-linecap="round" stroke-dasharray="14 24" />

  <!-- Vision Eye Shape (bold high contrast) -->
  <path d="M 100 256 C 150 170, 362 170, 412 256 C 362 342, 150 342, 100 256 Z" fill="#ffffff" stroke="#18181b" stroke-width="24" stroke-linejoin="round" />
  
  <!-- Iris & Pupil (Guidance aperture) -->
  <circle cx="256" cy="256" r="64" fill="#18181b" />
  <circle cx="256" cy="256" r="32" fill="#2563eb" />
  <circle cx="270" cy="242" r="10" fill="#ffffff" />
  
  <!-- Sound / Voice Beams -->
  <path d="M 256 100 L 256 70" stroke="#18181b" stroke-width="16" stroke-linecap="round" />
  <path d="M 366 146 L 388 124" stroke="#18181b" stroke-width="16" stroke-linecap="round" />
  <path d="M 146 146 L 124 124" stroke="#18181b" stroke-width="16" stroke-linecap="round" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent, 'utf8');

// Function to generate raw uncompressed RGBA PNG
function createPng(width, height, isMaskable = false) {
  // Simple PNG encoder using node's zlib
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type (RGBA)
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method

  function makeChunk(type, data) {
    const len = data.length;
    const buf = Buffer.alloc(4 + 4 + len + 4);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);

    // CRC32
    let crc = 0xffffffff;
    for (let i = 4; i < 8 + len; i++) {
      const byte = buf[i];
      crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    }
    crc = (crc ^ 0xffffffff) >>> 0;
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  // Generate CRC table
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raster data (height rows, each starting with filter byte 0)
  const rawData = Buffer.alloc(height * (1 + width * 4));
  const cx = width / 2;
  const cy = height / 2;
  const maxR = width / 2;
  const safePadding = isMaskable ? 0.2 : 0.05;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // White clean base
      let r = 255;
      let g = 255;
      let b = 255;
      let a = 255;

      // Safe outer circle/frame
      if (!isMaskable && dist > maxR - 4) {
        a = dist > maxR ? 0 : Math.round((maxR - dist) * 60);
      }

      // Draw high contrast eye / blue iris
      const scale = (width / 512) * (1 - safePadding);
      const scaledDist = dist / scale;

      // Sonar rings
      if (scaledDist > 130 && scaledDist < 155) {
        r = 37; g = 99; b = 235; // #2563eb
      } else if (scaledDist > 180 && scaledDist < 198) {
        r = 37; g = 99; b = 235; // outer sonar
      }

      // Eye contour (approx ellipse)
      const ex = Math.abs(dx) / (160 * scale);
      const ey = Math.abs(dy) / (90 * scale);
      if (ex * ex + ey * ey < 1.05 && ex * ex + ey * ey > 0.85) {
        r = 24; g = 24; b = 27; // dark border
      } else if (ex * ex + ey * ey <= 0.85) {
        // Inside eye
        if (scaledDist < 30) {
          r = 37; g = 99; b = 235; // pupil blue
        } else if (scaledDist < 65) {
          r = 24; g = 24; b = 27; // iris dark
        } else {
          r = 255; g = 255; b = 255; // sclera white
        }
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180));
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(48, 48));

console.log('PWA icons created successfully in public/');
