/**
 * 生成 PWA 图标
 * 从 SVG 生成 192x192 和 512x512 的 PNG 图标
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

// 确保 public 目录存在
if (!existsSync(publicDir)) {
  mkdirSync(publicDir, { recursive: true });
}

const svgPath = join(publicDir, 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    const outputPath = join(publicDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${outputPath}`);
  }
  
  // 也生成 favicon.ico (使用 32x32)
  const faviconPath = join(publicDir, 'favicon.ico');
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(faviconPath.replace('.ico', '.png'));
  console.log(`Generated favicon placeholder: ${faviconPath.replace('.ico', '.png')}`);
  
  console.log('\\nPWA icons generated successfully!');
}

generateIcons().catch(console.error);
