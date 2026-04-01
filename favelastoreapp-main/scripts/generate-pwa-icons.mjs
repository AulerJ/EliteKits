/**
 * Gera ícones PWA com o logo contido (reduzido) e centralizado em fundo preto.
 * Evita que o ícone fique esticado ao adicionar o app à tela inicial do celular.
 *
 * Uso: node scripts/generate-pwa-icons.mjs
 * Requer: npm install sharp --save-dev
 */

import sharp from "sharp";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const logoPath = join(publicDir, "logo.png");

const SIZES = [192, 512];
// Zoom: 1 = cabendo todo | 1.05 = um pouquinho maior | 1.2+ = mais zoom (bordas cortadas)
const LOGO_ZOOM = 1.9;

if (!existsSync(logoPath)) {
  console.error("Arquivo não encontrado: public/logo.png");
  process.exit(1);
}

const logoBuffer = readFileSync(logoPath);
console.log("LOGO_ZOOM =", LOGO_ZOOM, "→ altere no script e rode de novo: npm run icons");
const meta = await sharp(logoBuffer).metadata();
const logoW = meta.width || 1;
const logoH = meta.height || 1;

for (const size of SIZES) {
  const maxLogoSide = Math.floor(size * LOGO_ZOOM);
  const scale = Math.min(maxLogoSide / logoW, maxLogoSide / logoH);
  const w = Math.round(logoW * scale);
  const h = Math.round(logoH * scale);

  let iconImg = await sharp(logoBuffer).resize(w, h, { fit: "inside" });

  const outPath = join(publicDir, `icon-${size}.png`);
  if (w > size || h > size) {
    const extractLeft = Math.floor((w - size) / 2);
    const extractTop = Math.floor((h - size) / 2);
    iconImg = iconImg.extract({
      left: Math.max(0, extractLeft),
      top: Math.max(0, extractTop),
      width: Math.min(size, w),
      height: Math.min(size, h),
    });
  }

  const iconBuffer = await iconImg.toBuffer();
  const iconMeta = await sharp(iconBuffer).metadata();
  const iw = iconMeta.width || size;
  const ih = iconMeta.height || size;
  const left = Math.floor((size - iw) / 2);
  const top = Math.floor((size - ih) / 2);

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .composite([{ input: iconBuffer, left, top }])
    .png()
    .toFile(outPath);

  console.log("Gerado:", outPath);
}

console.log("Pronto. Se não mudou no celular: remova o app da tela inicial e adicione de novo (ícone fica em cache).");
