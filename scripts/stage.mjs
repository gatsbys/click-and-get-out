// Lo que compone la extensión, y una copia de trabajo para cargarla en Chromium desde
// los tests, las capturas y la grabación de la demo.
import { mkdir, cp, readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
export const files = ['manifest.json', 'background.js', 'selectors.js', 'content.js', 'popup.html', 'popup.css', 'popup.js', 'icons', '_locales'];

// Dos ajustes opcionales sobre la extensión real:
//  · hosts concede esos orígenes de entrada: el diálogo nativo de permisos no se puede
//    manejar desde Playwright.
//  · locale fija el idioma de la interfaz. Chrome lo elige según el idioma del navegador,
//    que en macOS sale de las preferencias del sistema y no cede ante --lang; para no
//    depender de la máquina, todas las carpetas de _locales reciben los mensajes pedidos.
export async function stage(dest, { hosts, locale } = {}) {
  await mkdir(dest, { recursive: true });
  for (const file of files) await cp(join(root, file), join(dest, file), { recursive: true });
  if (hosts) {
    const manifest = JSON.parse(await readFile(join(root, 'manifest.json'), 'utf8'));
    await writeFile(join(dest, 'manifest.json'), JSON.stringify({ ...manifest, host_permissions: hosts }));
  }
  if (locale) {
    const messages = await readFile(join(root, '_locales', locale, 'messages.json'));
    for (const folder of await readdir(join(dest, '_locales'), { withFileTypes: true })) {
      if (folder.isDirectory()) await writeFile(join(dest, '_locales', folder.name, 'messages.json'), messages);
    }
  }
  return dest;
}
