import { api, utmFromUrl } from './api.js';
import { TestRunner } from './test.js';
import { renderReport } from './results.js';

const $ = (sel) => document.querySelector(sel);
const views = ['gate', 'intro', 'test', 'result'];
const REPORT_CACHE = 'nexo_report_cache';

const state = {
  status: null,
  streak: 0,
  runner: null,
  lastAnswers: null,
};

function show(name) {
  views.forEach((v) => {
    $(`#view-${v}`)?.classList.toggle('is-active', v === name);
  });
  window.scrollTo({ top: 0, behavior: 'auto' });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* --------------------------- GATE --------------------------- */
async function doAccess(code, name) {
  const error = $('#gate-error');
  error.hidden = true;
  const btn = $('#gate-form button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Verificando…';
  try {
    await api.access(code, name || null, utmFromUrl());
    state.status = await api.status();
    enterIntro();
  } catch (err) {
    error.hidden = false;
    error.textContent =
      err.status === 403 || err.status === 400
        ? err.message
        : 'No pudimos conectar con el servidor. Espera unos segundos y vuelve a intentar.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
}

$('#gate-form').addEventListener('submit', (e) => {
  e.preventDefault();
  doAccess($('#invite-input').value.trim(), $('#name-input').value.trim());
});

/* --------------------------- INTRO --------------------------- */
function enterIntro() {
  const hasProfile = Boolean(state.status?.hasProfile) || Boolean(localStorage.getItem(REPORT_CACHE));
  $('#resume-report').hidden = !hasProfile;
  const startBtn = $('#start-test');
  startBtn.textContent = hasProfile ? 'Volver a hacer el test maestro' : 'Comenzar la evaluación';
  show('intro');
}

$('#start-test').addEventListener('click', async () => {
  const btn = $('#start-test');
  btn.disabled = true;
  btn.textContent = 'Preparando…';
  try {
    const { items } = await api.test();
    show('test');
    api.track('Quiz_Started');
    state.runner = new TestRunner($('#test-stage'), {
      onProgress: (i, total) => {
        $('#step-counter').textContent = `${i} / ${total}`;
        $('#progress-fill').style.width = `${(i / total) * 100}%`;
        $('#test-back').hidden = i <= 1;
      },
      onFinish: submitAnswers,
    });
    await state.runner.start(items);
  } catch (err) {
    alert(`No pudimos cargar el test: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Comenzar la evaluación';
  }
});

$('#test-back').addEventListener('click', () => state.runner?.go(-1));

$('#resume-report').addEventListener('click', async () => {
  const root = $('#result-root');
  root.innerHTML = '<p class="hint" style="padding:40px 0">Cargando tu informe…</p>';
  show('result');
  try {
    const { report } = await api.report();
    if (!report) throw new Error('sin informe');
    localStorage.setItem(REPORT_CACHE, JSON.stringify(report));
    renderSafely(report);
    api.track('Report_Viewed');
  } catch {
    // Respaldo local: el informe se guarda en el navegador al generarse
    const cached = localStorage.getItem(REPORT_CACHE);
    if (cached) {
      try {
        renderReport(root, JSON.parse(cached), { streak: state.streak });
        return;
      } catch { /* sigue al mensaje */ }
    }
    root.innerHTML = `
      <div class="card" style="margin-top:14vh">
        <h3>No encontramos un informe guardado</h3>
        <p class="hint">Puede que hayas entrado desde otro navegador o que la sesión haya caducado. Haz el test maestro otra vez: son menos de 5 minutos.</p>
        <div class="actions-bar"><button class="btn btn-primary" id="to-intro">Ir al test</button></div>
      </div>`;
    $('#to-intro').addEventListener('click', enterIntro);
  }
});

/* --------------------------- RENDER SEGURO --------------------------- */
function renderSafely(report, answers = null) {
  const root = $('#result-root');
  try {
    renderReport(root, report, { streak: state.streak });
  } catch (err) {
    console.error('[informe] fallo al pintar:', err);
    root.innerHTML = `
      <div class="card" style="margin-top:12vh">
        <h3>Tu informe se generó, pero no se pudo mostrar aquí</h3>
        <p class="hint">El cálculo se completó correctamente. Descárgalo en formato de datos y lo revisamos.</p>
        <div class="actions-bar">
          <button class="btn btn-primary" id="download-report">Descargar informe</button>
          <button class="btn btn-ghost" id="reload-app">Recargar la app</button>
        </div>
      </div>`;
    $('#download-report')?.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'informe-nexo.json';
      a.click();
      URL.revokeObjectURL(url);
    });
    $('#reload-app')?.addEventListener('click', () => window.location.reload());
    void answers;
  }
}

/* --------------------------- ENVÍO --------------------------- */
function processingScreen(attempt = 1, total = 3) {
  $('#test-stage').innerHTML = `
    <div class="q-block" style="padding-top:16vh">
      <p class="q-kicker">${attempt === 1 ? 'Procesando' : `Reintentando (${attempt}/${total})`}</p>
      <h2 class="q-title">Cruzando tus dos motores…</h2>
      <p class="q-helper">Sumando vectores, recodificando Big Five y ubicando tu temperamento. Tus respuestas están guardadas en este dispositivo.</p>
      <div class="progress" style="margin-top:18px"><div class="progress-fill" style="width:100%"></div></div>
    </div>`;
}

function errorScreen(err, answers) {
  const details = Array.isArray(err.body?.details) ? err.body.details : [];
  const isAuth = err.status === 401;
  const isValidation = err.status === 422;

  $('#test-stage').innerHTML = `
    <div class="q-block" style="padding-top:10vh">
      <p class="q-kicker">No pudimos generar el informe</p>
      <h2 class="q-title">${isValidation ? 'Faltan respuestas por completar' : isAuth ? 'Tu sesión caducó' : 'No llegamos al servidor'}</h2>
      <p class="q-helper">${
        isValidation
          ? 'El servidor rechazó el envío porque algunos ítems quedaron incompletos.'
          : isAuth
            ? 'Vuelve a entrar con tu enlace de invitación y repite el test. Tus respuestas no se enviaron a nadie.'
            : 'El servidor no respondió a tiempo. Tus respuestas siguen guardadas en este dispositivo: puedes reintentar sin repetir el test.'
      }</p>
      ${details.length ? `<div class="card"><h4>Detalle</h4><ul>${details.map((d) => `<li>${d}</li>`).join('')}</ul></div>` : ''}
      ${!isValidation && !isAuth && err.message ? `<p class="note warm">${err.message}</p>` : ''}
      <div class="stage-actions">
        ${!isValidation && !isAuth ? '<button class="btn btn-primary" id="retry-submit">Reintentar envío</button>' : ''}
        <button class="btn btn-ghost" id="review-answers">Revisar respuestas</button>
      </div>
      <button class="btn btn-ghost btn-lg" id="download-answers" style="margin-top:10px">Descargar mis respuestas</button>
    </div>`;

  $('#retry-submit')?.addEventListener('click', () => submitAnswers(answers));
  $('#review-answers')?.addEventListener('click', () => {
    const firstMissing = state.runner?.firstUnansweredIndex?.() ?? -1;
    show('test');
    if (firstMissing > -1) state.runner.jumpTo(firstMissing);
    else state.runner?.render();
  });
  $('#download-answers')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(answers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mis-respuestas-nexo.json';
    a.click();
    URL.revokeObjectURL(url);
  });
}

async function submitAnswers(answers) {
  state.lastAnswers = answers;

  // 1) Comprobación previa en el cliente: nada se envía incompleto
  const missingIndex = state.runner?.firstUnansweredIndex?.() ?? -1;
  if (missingIndex > -1) {
    const item = state.runner.items[missingIndex];
    state.runner.jumpTo(missingIndex);
    const helper = $('.q-helper');
    if (helper) helper.textContent = `Falta este ítem (${missingIndex + 1} de ${state.runner.items.length}) para generar tu informe.`;
    void item;
    return;
  }

  // 2) Envío con reintentos automáticos ante fallos de red
  processingScreen(1);
  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { report } = await api.submit(answers);
      localStorage.removeItem('nexo_answers_v1');
      try { localStorage.setItem(REPORT_CACHE, JSON.stringify(report)); } catch { /* sin espacio */ }
      api.track('Quiz_Completed');
      if (state.status) state.status.hasProfile = true;
      show('result');
      renderSafely(report, answers);
      api.track('Report_Viewed');
      return;
    } catch (err) {
      lastError = err;
      // Errores de datos o sesión no se reintentan: hay que corregir o volver a entrar
      if (err.status === 422 || err.status === 401 || err.status === 403) break;
      if (attempt < 3) {
        processingScreen(attempt + 1);
        await sleep(900 * attempt);
      }
    }
  }
  show('test');
  errorScreen(lastError || new Error('Error desconocido'), answers);
}

/* --------------------------- BOOT --------------------------- */
async function boot() {
  try {
    state.status = await api.status();
  } catch {
    state.status = { authenticated: false, openAccess: false };
  }

  const invite = new URLSearchParams(window.location.search).get('invite');
  if (invite && !state.status.authenticated) {
    $('#invite-input').value = invite;
    await doAccess(invite, null);
    window.history.replaceState({}, '', window.location.pathname);
    return;
  }

  if (state.status.authenticated) {
    enterIntro();
  } else if (state.status.openAccess) {
    try {
      await api.access(null, null, utmFromUrl());
      state.status = await api.status();
      enterIntro();
    } catch {
      show('gate');
    }
  } else {
    show('gate');
  }
}

boot();
