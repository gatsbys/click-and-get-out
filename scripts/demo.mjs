import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, join, extname, normalize } from 'node:path';
const root = resolve(import.meta.dirname, '../demo');
const port = Number(process.env.PORT) || 4173;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  // normalize() collapses any ../ before the prefix check, so nothing above demo/ is servable.
  const file = normalize(join(root, path.endsWith('/') ? `${path}index.html` : path));
  if (!file.startsWith(root)) { res.writeHead(403).end('Prohibido'); return; }
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('No encontrado'); }
}).listen(port, () => console.log(`http://localhost:${port}`));
