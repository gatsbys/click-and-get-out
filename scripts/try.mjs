// Abre Chromium con la extensión cargada y la web de demostración delante, para
// probarla a mano sin tocar tu Chrome.
//
//   npm run try        interfaz en inglés, edición inglesa de la demo
//   npm run try es     lo mismo en español
//
// El idioma se fija como en los tests (ver stage.mjs), así que no depende del idioma
// del sistema. Aquí no se concede ningún permiso de antemano: «Recordar en esta web»
// saca el diálogo de Chrome, como en una instalación real. La copia de la extensión y
// el perfil viven en dist/try/, de modo que lo guardado sigue ahí la próxima vez.
import { chromium } from 'playwright';
import { rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { spawn } from 'node:child_process';
import { stage } from './stage.mjs';

const root = resolve(import.meta.dirname, '..');
const locale = process.argv[2] === 'es' ? 'es' : 'en';
const home = resolve(root, 'dist/try', locale);
const server = spawn(process.execPath, [resolve(root, 'scripts/demo.mjs')], { env: { ...process.env, PORT: '4196' }, stdio: 'ignore' });
try {
  // Misma ruta en cada arranque: es lo que conserva el identificador de la extensión
  // y, con él, sus reglas guardadas.
  await rm(join(home, 'extension'), { recursive: true, force: true });
  const extPath = await stage(join(home, 'extension'), { locale });
  const context = await chromium.launchPersistentContext(join(home, 'profile'), {
    channel: 'chromium', headless: false, viewport: null,
    args: [`--disable-extensions-except=${extPath}`, `--load-extension=${extPath}`]
  });
  context.on('close', () => server.kill());
  const page = context.pages()[0] || await context.newPage();
  await page.goto(`http://localhost:4196/${locale === 'en' ? 'en.html' : ''}`);
  console.log(`Extensión en ${locale === 'en' ? 'inglés' : 'español'}. Ancla el icono desde la pieza de puzle y pruébala; cierra la ventana para terminar.`);
} catch (error) {
  server.kill();
  throw error;
}
