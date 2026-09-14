import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const svg = await readFile(resolve(root, 'icons/icon.svg'), 'utf8');
const browser = await chromium.launch({ channel: 'chromium' });
try {
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>body{margin:0}svg{width:100%;height:100%}</style>${svg}`);
    await page.screenshot({ path: resolve(root, `icons/${size}.png`), omitBackground: true });
  }
} finally { await browser.close(); }
