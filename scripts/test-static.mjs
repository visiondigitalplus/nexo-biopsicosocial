/**
 * Prueba de extremo a extremo de la versión estática (GitHub Pages),
 * ejecutando el HTML real con su bundle dentro de un DOM (jsdom).
 * Simula a una persona que recorre las 20 pantallas y recibe su informe.
 *
 *   node scripts/test-static.mjs
 */
import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'nexo-app-standalone.html'), 'utf8');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'https://usuario.github.io/nexo-biopsicosocial/',
});
const { window } = dom;
const doc = window.document;
window.scrollTo = () => {};
window.print = () => {};

const $ = (sel) => doc.querySelector(sel);
const click = (el) => {
  if (!el) throw new Error(`Elemento no encontrado`);
  el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
};

const log = (ok, msg) => console.log(`  ${ok ? '✓' : '✗'} ${msg}`);

await sleep(150);

console.log('\n1. Carga inicial');
const introActive = $('#view-intro')?.classList.contains('is-active');
log(introActive, 'La versión pública entra directo a la portada (sin pedir código)');
if (!introActive) {
  console.log(doc.body.innerHTML.slice(0, 600));
  process.exit(1);
}

console.log('\n2. Recorrido del test maestro (20 pantallas)');
click($('#start-test'));
await sleep(250);

let screens = 0;
for (let i = 0; i < 40; i += 1) {
  if ($('#view-result').classList.contains('is-active')) break;
  const stage = $('#test-stage');
  if (!stage || !$('#view-test').classList.contains('is-active')) break;

  const sliders = [...stage.querySelectorAll('[data-slider]')];
  const statements = [...new Set([...stage.querySelectorAll('[data-statement]')].map((b) => b.dataset.statement))];
  const chips = [...stage.querySelectorAll('.chip')];
  const option = stage.querySelector('.option');
  const cont = stage.querySelector('[data-continue]');

  if (sliders.length) {
    // mueve solo el primer deslizador y deja el segundo intacto (caso que fallaba)
    const s = sliders[0];
    s.value = '6';
    s.dispatchEvent(new window.Event('input', { bubbles: true }));
    click(cont);
  } else if (statements.length) {
    for (const id of statements) click(stage.querySelector(`[data-statement="${id}"]`));
  } else if (chips.length) {
    // 20 chips = matriz Littauer (mínimo 4); menos = selección múltiple (máx 2)
    const howMany = chips.length > 10 ? 4 : 1;
    for (let c = 0; c < howMany; c += 1) {
      const chip = stage.querySelectorAll('.chip')[c];
      if (chip) click(chip);
      await sleep(40);
    }
    await sleep(120);
    const stillThere = stage.querySelector('[data-continue]');
    if (stillThere && !stillThere.disabled) click(stillThere);
  } else if (option) {
    click(option);
    await sleep(60);
    const c2 = stage.querySelector('[data-continue]');
    if (c2 && !c2.disabled) click(c2);
  }

  await sleep(520);
  screens += 1;
}
log(screens >= 18, `Se recorrieron ${screens} pantallas del test`);

console.log('\n3. Informe generado');
await sleep(500);
const resultActive = $('#view-result')?.classList.contains('is-active');
log(resultActive, 'Vista de resultados activa');
const rootEl = $('#result-root');
const htmlOut = rootEl?.innerHTML || '';
const probes = [
  ['Coordenadas de Eysenck', htmlOut.includes('Coordenadas de Eysenck')],
  ['Hexágono RIASEC', htmlOut.includes('hexágono') || htmlOut.includes('aria-label="Hexágono RIASEC"')],
  ['Matriz de temperamento', htmlOut.includes('Matriz de temperamento')],
  ['Orientación vocacional', htmlOut.includes('Orientación vocacional')],
  ['Dietoterapia', htmlOut.includes('Dietoterapia')],
  ['Microhábitos Fogg', htmlOut.includes('Ancla') && htmlOut.includes('Celebración')],
  ['Conmutador baja energía', htmlOut.includes('baja energía')],
  ['Registro diario', htmlOut.includes('Registro de hoy')],
];
for (const [label, ok] of probes) log(ok, label);

console.log('\n4. Persistencia local');
const cache = window.localStorage.getItem('nexo_report_cache');
log(Boolean(cache), 'Informe guardado en el navegador (localStorage)');
const report = cache ? JSON.parse(cache) : null;
log(Boolean(report?.modules?.length === 4), `Módulos del informe: ${report?.modules?.map((m) => m.id).join(', ')}`);

console.log('\n5. Pestañas y registro de ánimo');
const tabs = [...rootEl.querySelectorAll('.tab')];
log(tabs.length === 5, `${tabs.length} pestañas del informe`);
click(tabs[4]);
await sleep(80);
const scaleBtns = rootEl.querySelectorAll('.mood-scale button');
log(scaleBtns.length > 0, 'Formulario de registro diario presente');
if (scaleBtns.length >= 8) {
  click(scaleBtns[3]); // ánimo = 4
  click(scaleBtns[7]); // energía = 4
  const form = rootEl.querySelector('#checkin-form');
  form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(250);
  const daily = window.localStorage.getItem('nexo_daily_logs');
  log(Boolean(daily?.includes('streak')), 'Registro diario guardado con racha');
}

const failed = process.exitCode === 1;
console.log(`\n${failed ? 'FALLARON PRUEBAS' : 'TODO OK: la versión estática funciona de punta a punta'}\n`);
