#!/usr/bin/env node
/**
 * Compila la app a un sitio 100% estático (GitHub Pages / Netlify / cualquier hosting).
 *
 *   npm run build:static
 *
 * Salidas:
 *   docs/                     -> carpeta publicable (Settings > Pages > /docs)
 *   nexo-app-standalone.html  -> un único archivo con todo incrustado
 */
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DOCS = path.join(ROOT, 'docs');
const TMP = path.join(ROOT, '.build-tmp');

const copy = (from, to) => {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
};
const log = (msg) => console.log(`[build] ${msg}`);

fs.rmSync(DOCS, { recursive: true, force: true });
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(path.join(DOCS, 'css'), { recursive: true });
fs.mkdirSync(path.join(DOCS, 'assets'), { recursive: true });
fs.mkdirSync(path.join(TMP, 'js'), { recursive: true });
fs.mkdirSync(path.join(TMP, 'engine'), { recursive: true });

/* 1. Estilos y assets */
copy(path.join(ROOT, 'public/css/styles.css'), path.join(DOCS, 'css/styles.css'));
copy(path.join(ROOT, 'public/assets/favicon.svg'), path.join(DOCS, 'assets/favicon.svg'));

/* 2. Código del motor (idéntico al del servidor) */
for (const file of fs.readdirSync(path.join(ROOT, 'server/engine'))) {
  if (file.endsWith('.js')) copy(path.join(ROOT, 'server/engine', file), path.join(TMP, 'engine', file));
}

/* 3. Interfaz + capa de API local */
for (const file of ['app.js', 'test.js', 'results.js', 'charts.js']) {
  copy(path.join(ROOT, 'public/js', file), path.join(TMP, 'js', file));
}
copy(path.join(ROOT, 'static-src/api-local.js'), path.join(TMP, 'js/api.js'));

/* 4. Empaquetado: un solo archivo JS sin dependencias */
await build({
  entryPoints: [path.join(TMP, 'js/app.js')],
  outfile: path.join(DOCS, 'js/app.bundle.js'),
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: true,
  legalComments: 'none',
  banner: { js: '/* Nexo · build estático — motor psicométrico y UI en un solo archivo */' },
});
log(`bundle: ${(fs.statSync(path.join(DOCS, 'js/app.bundle.js')).size / 1024).toFixed(1)} KB`);

/* 5. HTML publicable */
const template = fs.readFileSync(path.join(ROOT, 'static-src/index.html'), 'utf8');
const docsHtml = template
  .replace('{{CSS}}', '<link rel="stylesheet" href="./css/styles.css" />')
  .replace('{{JS}}', '<script src="./js/app.bundle.js" defer></script>');
fs.writeFileSync(path.join(DOCS, 'index.html'), docsHtml);

/* 6. Archivos de soporte para GitHub Pages */
fs.writeFileSync(path.join(DOCS, '.nojekyll'), '');
fs.writeFileSync(
  path.join(DOCS, '404.html'),
  '<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="0;url=./"><title>Nexo</title>',
);

/* 7. Versión de un solo archivo (doble clic y funciona, sin servidor) */
const css = fs.readFileSync(path.join(DOCS, 'css/styles.css'), 'utf8');
const js = fs.readFileSync(path.join(DOCS, 'js/app.bundle.js'), 'utf8');
const favicon = fs.readFileSync(path.join(DOCS, 'assets/favicon.svg'), 'utf8');
const faviconData = `data:image/svg+xml;base64,${Buffer.from(favicon).toString('base64')}`;
const standalone = template
  .replace('<link rel="icon" href="./assets/favicon.svg" type="image/svg+xml" />', `<link rel="icon" href="${faviconData}" />`)
  .replace('{{CSS}}', `<style>\n${css}\n</style>`)
  .replace('{{JS}}', `<script>\n${js}\n</script>`);
const standalonePath = path.join(ROOT, 'nexo-app-standalone.html');
fs.writeFileSync(standalonePath, standalone);
log(`standalone: ${(fs.statSync(standalonePath).size / 1024).toFixed(1)} KB`);

/* 8. Limpieza */
fs.rmSync(TMP, { recursive: true, force: true });

const totalFiles = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).reduce(
    (acc, entry) => acc + (entry.isDirectory() ? totalFiles(path.join(dir, entry.name)) : 1),
    0,
  );
log(`docs/ listo: ${totalFiles(DOCS)} archivos`);
console.log('\nPublicar en GitHub Pages: Settings > Pages > Source: "Deploy from a branch" > main /docs\n');
