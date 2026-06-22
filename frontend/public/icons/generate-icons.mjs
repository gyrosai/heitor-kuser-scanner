/**
 * Gera ícones placeholder CIMI Leads.
 * PLACEHOLDER — substituir quando o logo oficial CIMI360 chegar do Heitor.
 *
 * Design:
 *   fundo  : #002F3F (Azul Noturno)
 *   símbolo: "C" como arco stroke em #FA6800 (Laranja 360)
 *   margem segura maskable: 20% (conteúdo fica dentro de raio 153px num 512×512)
 *
 * Uso:  node generate-icons.mjs
 */

import sharp from "sharp";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── SVG fonte ─────────────────────────────────────────────────────────────────
// Centro 256,256 · raio 120 · stroke 46 → borda externa 143px (< limite 153px)
// Pontas da abertura em ±30° do eixo direito:
//   superior: (256+120·cos30°, 256−120·sin30°) ≈ (360, 196)
//   inferior: (360, 316)
const makeSvg = (size) => {
  const half = size / 2;
  const r = size * 0.234;      // ≈ 120/512 · size
  const sw = size * 0.090;     // ≈ 46/512 · size
  // Pontas da abertura
  const cos30 = Math.cos(Math.PI / 6);
  const sin30 = Math.sin(Math.PI / 6);
  const x1 = (half + r * cos30).toFixed(2);
  const y1 = (half - r * sin30).toFixed(2);
  const x2 = x1;
  const y2 = (half + r * sin30).toFixed(2);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect width="${size}" height="${size}" fill="#002F3F"/>
  <path d="M ${x1} ${y1} A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${x2} ${y2}"
        stroke="#FA6800" stroke-width="${sw.toFixed(2)}" fill="none"
        stroke-linecap="round"/>
</svg>`;
};

// ── Gerador de PNG ────────────────────────────────────────────────────────────
async function png(size, filename) {
  const buf = await sharp(Buffer.from(makeSvg(size)))
    .resize(size, size)
    .png()
    .toBuffer();
  writeFileSync(join(__dirname, filename), buf);
  console.log(`✓ ${filename} (${size}×${size})`);
  return buf;
}

// ── Wrapper ICO (RFC 2616 / Microsoft ICO com PNG embutido) ───────────────────
function wrapIco(pngBuf) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = 1 (ICO)
  header.writeUInt16LE(1, 4); // count = 1

  const entry = Buffer.alloc(16);
  entry[0] = 32; // width
  entry[1] = 32; // height
  entry[2] = 0;  // colorCount (0 = 24/32-bit)
  entry[3] = 0;  // reserved
  entry.writeUInt16LE(1, 4);               // planes
  entry.writeUInt16LE(32, 6);              // bit count
  entry.writeUInt32LE(pngBuf.length, 8);   // data size
  entry.writeUInt32LE(22, 12);             // data offset (6 + 16)

  return Buffer.concat([header, entry, pngBuf]);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const favicon32 = await png(32,  "favicon-32.png");
await png(180, "apple-touch-icon.png");
await png(192, "icon-192.png");
await png(512, "icon-512.png");

// Favicon ICO com PNG 32×32 embutido
writeFileSync(join(__dirname, "favicon.ico"), wrapIco(favicon32));
console.log("✓ favicon.ico (32×32, ICO+PNG)");

// Cópia na raiz /public para que browsers busquem em /favicon.ico automaticamente
writeFileSync(
  join(__dirname, "..", "favicon.ico"),
  wrapIco(favicon32)
);
console.log("✓ ../favicon.ico (cópia na raiz public/)");
