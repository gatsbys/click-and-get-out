import { mkdtemp, mkdir, cp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { files } from './stage.mjs';
const root = resolve(import.meta.dirname, '..');
const temp = await mkdtemp(join(tmpdir(), 'click-and-get-out-pack-'));
const folder = join(temp, 'click-and-get-out');
const unpacked = resolve(root, 'dist/click-and-get-out.zip');
// Chrome Web Store reads manifest.json from the archive root and rejects a
// nested folder, so the store build is zipped from inside the staged folder.
const store = resolve(root, 'dist/click-and-get-out-store.zip');
// Copia ya descomprimida: se carga una vez con «Cargar descomprimida» y, al
// mantener la misma ruta, conserva el identificador y las reglas guardadas.
const extracted = resolve(root, 'dist/click-and-get-out');
try {
  await mkdir(folder);
  await mkdir(resolve(root, 'dist'), { recursive: true });
  for (const file of [...files, 'README.md', 'LICENSE']) {
    await cp(resolve(root, file), join(folder, file), { recursive: true });
  }
  await rm(unpacked, { force: true });
  await rm(store, { force: true });
  execFileSync('zip', ['-qrX', unpacked, 'click-and-get-out'], { cwd: temp });
  execFileSync('zip', ['-qrX', store, '.', '-x', '.*', '*/.*'], { cwd: folder });
  await rm(extracted, { recursive: true, force: true });
  await cp(folder, extracted, { recursive: true });
  console.log(unpacked);
  console.log(store);
  console.log(extracted);
} finally { await rm(temp, { recursive: true, force: true }); }
