// App icons, generated from one piece of artwork so the sizes cannot drift.
//
//   node scripts/gen-icons.mjs
//
// Source: images/brand/mark.png — the CashFlow mark on transparency, extracted
// from the original icon by unmixing it off its old plate colour (verified to
// within one channel level of the original). Everything else here is drawn.
//
// Why more than one output. The platforms want genuinely different images and
// the old set used the same file for all of them:
//
//   icon-192 / icon-512   purpose "any" — drawn as-is by anything that does not
//                         mask (a desktop shortcut, a browser tab), so these
//                         keep the rounded plate.
//   icon-maskable-512     purpose "maskable" — Android crops this to its own
//                         shape (circle, squircle, teardrop), so it must be
//                         opaque to the edges and keep everything important
//                         inside the 80%-diameter safe circle. The old icon was
//                         declared maskable while being a rounded plate with
//                         transparent corners and an arrow tip reaching 83% of
//                         the half-width — the corners would show through and
//                         the tip would clip.
//   apple-touch-icon      iOS applies its own squircle and composites anything
//                         transparent onto black, so this one is an opaque
//                         square with no rounding of its own. Pointing iOS at
//                         the pre-rounded icon gave doubled corners with dark
//                         fringing.
const { chromium } = await import(process.env.PLAYWRIGHT_LIB || (await import('child_process')).execSync('npm root -g').toString().trim() + '/playwright/index.mjs');
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// The app's navy — src/lib/app-data.js LIGHT.navy / headerBg. The old icons
// were still on #1C2B3A, the pre-redesign navy.
const PLATE = '#14413A';
const markData = 'data:image/png;base64,' + readFileSync(join(ROOT, 'images/brand/mark.png')).toString('base64');

// mark: the mark's width as a fraction of the icon's width.
// radius: corner radius as a fraction; 0 is a full-bleed square.
const ICONS = [
  { file: 'icon-192.png', size: 192, mark: 0.62, radius: 0.22 },
  { file: 'icon-512.png', size: 512, mark: 0.62, radius: 0.22 },
  // 0.55 keeps the whole mark inside the safe circle: its bounding box has to
  // fit the square inscribed in that circle, which is 0.4 × 2 / √2 ≈ 0.566 of
  // the width. 0.62 does not fit, which is what clipped the arrow.
  { file: 'icon-maskable-512.png', size: 512, mark: 0.55, radius: 0 },
  { file: 'apple-touch-icon.png', size: 180, mark: 0.62, radius: 0 }
];

const browser = await chromium.launch();
for (const ic of ICONS) {
  const page = await browser.newPage({ viewport: { width: ic.size, height: ic.size } });
  await page.setContent(`<!doctype html><meta charset="utf-8"><style>
    html,body{margin:0;padding:0;background:transparent;}
    .plate{width:${ic.size}px;height:${ic.size}px;background:${PLATE};
      border-radius:${Math.round(ic.radius * ic.size)}px;
      display:flex;align-items:center;justify-content:center;}
    img{width:${Math.round(ic.mark * ic.size)}px;display:block;}
  </style><div class="plate"><img src="${markData}"></div>`);
  await page.waitForLoadState('networkidle');
  const buf = await page.screenshot({ omitBackground: ic.radius > 0 });
  writeFileSync(join(ROOT, ic.file), buf);
  console.log(String(ic.size).padStart(4) + 'px  ' + ic.file.padEnd(24) +
    'mark ' + Math.round(ic.mark * 100) + '%  radius ' + Math.round(ic.radius * 100) + '%  ' +
    (buf.length / 1024).toFixed(1) + ' KB');
  await page.close();
}
await browser.close();
