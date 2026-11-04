import { api } from './api.js';
import { barList, eysenckChart, neuroBars, riasecHexagon } from './charts.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const list = (items, cls = '') => `<ul class="${cls}">${(items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;

function badge(label, variant = '') {
  return `<span class="badge ${variant}">${esc(label)}</span>`;
}

/* ----------------------------- MODULO A ----------------------------- */
function panelA(a) {
  const bigFiveLabels = {
    E: 'Extraversión', A: 'Amabilidad', C: 'Responsabilidad', ES: 'Estabilidad emocional', O: 'Apertura',
  };
  const bigFive = Object.entries(a.eysenck.bigFive).map(([k, v]) => ({ label: bigFiveLabels[k] || k, value: v }));
  const vak = a.channel.vak.ranking.map((r) => ({ label: r.name, value: r.score }));
  const char = a.neurochemistry.cloninger.character;

  return `
  <div class="card">
    <h3>Coordenadas de Eysenck y biotipo</h3>
    <p class="hint">${esc(a.eysenck.quadrant)} · ${esc(a.eysenck.mizaj)}</p>
    ${eysenckChart({ ...a.eysenck.coordinates, biotypeName: a.eysenck.biotypeName })}
    <p class="chart-caption">Extraversión ${a.eysenck.coordinates.extraversion} · Estabilidad ${a.eysenck.coordinates.stability} · Neuroticismo ${a.eysenck.coordinates.neuroticism}</p>
    <p class="note">${esc(a.eysenck.reactivity)}</p>
    <p class="note ${a.eysenck.consistency.startsWith('Coherencia alta') ? '' : 'warm'}">${esc(a.eysenck.consistency)}</p>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Big Five (TIPI)</h3>
      <p class="hint">Percentiles sobre la escala 1-7 recodificada.</p>
      ${barList(bigFive)}
    </div>
    <div class="card">
      <h3>Perfil neuroquímico</h3>
      <p class="hint">Helen Fisher (FTI) y ejes de Cloninger.</p>
      ${neuroBars(a.neurochemistry.axes)}
      <h4>Carácter (TCI)</h4>
      <div class="stat-row">
        <div class="stat"><span>Autodirección</span><strong>${char.SD}</strong></div>
        <div class="stat"><span>Cooperación</span><strong>${char.CO}</strong></div>
        <div class="stat"><span>Autotrascendencia</span><strong>${char.ST}</strong></div>
      </div>
    </div>
  </div>

  <div class="card">
    <h3>Código vocacional RIASEC · ${esc(a.vocational.code)}</h3>
    <p class="hint">Holland + inteligencias múltiples de Gardner.</p>
    ${riasecHexagon(a.vocational.riasec.scores)}
    <h4>Inteligencias dominantes</h4>
    ${barList(a.vocational.top2.map((g) => ({ label: g.name, value: g.score })))}
    ${barList(a.vocational.gardner.ranking.slice(2, 5).map((g) => ({ label: g.name, value: g.score })))}
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Canal de comunicación VAK</h3>
      <p class="hint">Dominante: <strong>${esc(a.channel.vak.dominantName)}</strong> · mezcla ${esc(a.channel.vak.mix)}</p>
      ${barList(vak)}
      <p class="note">${esc(a.channel.adaptation.toSelf)}</p>
    </div>
    <div class="card">
      <h3>Estilo de conflicto (TKI)</h3>
      <p class="hint">Dominante: <strong>${esc(a.conflict.tki.styleName)}</strong></p>
      ${barList(a.conflict.tki.ranking.map((r) => ({ label: r.name, value: r.score })))}
      <p class="note">${esc(a.conflict.guide.tactic)}</p>
    </div>
  </div>

  <div class="card">
    <h3>Matriz de temperamento (Littauer)</h3>
    <p class="hint">${a.temperament.flatProfile ? 'Distribución plana: perfil polifacético.' : `Dominante ${esc(a.temperament.dominantName)} · secundario ${esc(a.temperament.secondaryName)}`}</p>
    ${a.temperament.matrix
      .map(
        (m) => `
      <div class="bar">
        <div class="bar-head"><span>${esc(m.name)}</span><span>${m.strengths} F · ${m.weaknesses} D</span></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.min(100, (m.total / 20) * 100)}%"></div></div>
      </div>`,
      )
      .join('')}
    <div class="stat-row" style="margin-top:12px">
      <div class="stat"><span>Ratio F/D</span><strong>${a.temperament.regulationRatio}</strong></div>
      <div class="stat"><span>Regulación</span><strong>${Math.round(a.temperament.regulationIndex * 100)}%</strong></div>
      <div class="stat"><span>Marcas</span><strong>${a.temperament.matrix.reduce((s, m) => s + m.total, 0)}/40</strong></div>
    </div>
    <h4>Fortalezas reconocidas</h4>
    <p class="hint">${a.temperament.strengths.map(esc).join(' · ') || '—'}</p>
    <h4>Debilidades reconocidas</h4>
    <p class="hint">${a.temperament.weaknesses.map(esc).join(' · ') || '—'}</p>
    ${
      a.temperament.characterDeficit
        ? `<p class="note warm">Índice de regulación bajo: la matriz sugiere déficit en Autodirección (SD) y Cooperación (CO). Es material de trabajo, no una condena.</p>`
        : `<p class="note">Buena relación fortalezas/debilidades: tienes margen de autorregulación para sostener el plan.</p>`
    }
  </div>

  <div class="card">
    <h3>Banderas de soporte neurodivergente y afectivo</h3>
    <p class="hint">Cribados abreviados. Información clínica aislada y cifrada; nunca se envía a plataformas publicitarias.</p>
    <div class="stat-row" style="margin-bottom:12px">
      <div class="stat"><span>AQ-10</span><strong>${a.flags.aq10.score}/3</strong></div>
      <div class="stat"><span>ASRS</span><strong>${a.flags.asrs.score}/12</strong></div>
      <div class="stat"><span>CAT-Q masking</span><strong>${a.flags.catq.maskingIndex}%</strong></div>
    </div>
    <div class="stat-row">
      ${badge(a.flags.aq10.flagged ? 'AQ-10 elevado' : 'AQ-10 en rango', a.flags.aq10.flagged ? 'clinic' : 'ok')}
      ${badge(a.flags.asrs.flagged ? 'Carga ejecutiva alta' : 'Función ejecutiva estable', a.flags.asrs.flagged ? 'flag' : 'ok')}
      ${badge(a.flags.highMasking ? 'Enmascaramiento alto' : 'Enmascaramiento bajo', a.flags.highMasking ? 'flag' : 'ok')}
    </div>
    <h4>Límites de esta información</h4>
    ${list(a.disclaimers, 'dont-list')}
  </div>`;
}

/* ----------------------------- MODULO B ----------------------------- */
function panelB(b) {
  return `
  <div class="card">
    <h3>Orientación vocacional y desarrollo profesional</h3>
    <p class="hint">${esc(b.vocational.headline)} — ${esc(b.vocational.note)}</p>
    ${b.vocational.careers
      .map(
        (c) => `
      <div class="career">
        <div><strong>${esc(c.name)}</strong><small>${esc(c.why)}</small></div>
        <span class="fit">${esc(c.fit)}</span>
      </div>`,
      )
      .join('')}
  </div>

  <div class="card">
    <h3>Comunicación: tu palanca y tu riesgo</h3>
    <p class="hint">${esc(b.communication.adaptiveSelf)}</p>
    <div class="stat-row" style="margin-bottom:12px">
      <div class="stat"><span>Palanca</span><strong style="font-size:.85rem">${esc(b.communication.playbook.lever)}</strong></div>
    </div>
    <p class="note warm"><strong>Vigila:</strong> ${esc(b.communication.playbook.watchOut)}</p>
    <h4>Guiones tácticos</h4>
    ${list(b.communication.playbook.scripts)}
    <h4>Micro-objetivo de la semana</h4>
    <p class="hint">${esc(b.communication.playbook.microGoal)}</p>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Adaptación al canal del otro</h3>
      <p class="hint">Tu canal: ${esc(b.communication.vakAdaptation.label)}</p>
      <p>${esc(b.communication.vakAdaptation.toOther)}</p>
    </div>
    <div class="card">
      <h3>Tu sesgo de conflicto</h3>
      <p class="hint">${esc(b.communication.tki.style)}</p>
      <p><strong>Fortaleza:</strong> ${esc(b.communication.tki.strength)}</p>
      <p><strong>Riesgo:</strong> ${esc(b.communication.tki.risk)}</p>
      <p class="note">${esc(b.communication.tki.tactic)}</p>
    </div>
  </div>

  <div class="card">
    <h3>Ventas y negociación: guion táctico</h3>
    ${list(b.sales)}
  </div>

  <div class="card">
    <h3>Relaciones y vínculos</h3>
    ${list(b.relations)}
  </div>`;
}

/* ----------------------------- MODULO C ----------------------------- */
function panelC(c) {
  return `
  <div class="card">
    <h3>${esc(c.biotype)} · ${esc(c.mizaj)}</h3>
    <p class="hint">${esc(c.framework)}</p>
    <p class="note"><strong>${esc(c.principle)}</strong></p>
    <div class="do-dont" style="margin-top:14px">
      <div class="card">
        <h4>Prescribir (cualidad opuesta)</h4>
        ${list(c.include, 'do-list')}
      </div>
      <div class="card">
        <h4>Retirar</h4>
        ${list(c.exclude, 'dont-list')}
      </div>
    </div>
    <h4>Movimiento</h4>
    <p class="hint">${esc(c.exercise)}</p>
    <h4>Sueño</h4>
    <p class="hint">${esc(c.sleep)}</p>
    <h4>Protocolo de sanación del carácter</h4>
    ${list(c.healing)}
    <p class="note warm">${esc(c.note)}</p>
  </div>`;
}

/* ----------------------------- MODULO D ----------------------------- */
function panelD(d) {
  return `
  <div class="card">
    <h3>Microhábitos de hoy</h3>
    <p class="hint">${esc(d.model)} · presupuesto ${d.minutesBudget} min/día</p>
    <div class="switch">
      <p id="low-energy-copy"><strong>Versión de día de baja energía</strong><br />Contrae cada hábito a su mínimo viable y mantiene la racha.</p>
      <button class="toggle" id="low-energy-toggle" aria-pressed="false" aria-label="Activar versión de baja energía"></button>
    </div>
    <div id="habit-list">
      ${d.habits
        .map(
          (h) => `
        <div class="habit" data-habit="${esc(h.id)}">
          <h4>${esc(h.title)} <span class="badge ok">${h.minutes} min</span></h4>
          <div class="recipe">
            <div><b>Ancla</b><span>${esc(h.details.anchor)}</span></div>
            <div><b>Micro-acción</b><span>«${esc(h.details.microAction)}»</span></div>
            <div><b>Celebración</b><span>${esc(h.details.celebration)}</span></div>
          </div>
          <p class="hint" style="margin:10px 0 0">${esc(h.rationale)}</p>
        </div>`,
        )
        .join('')}
    </div>
  </div>

  <div class="grid-2">
    <div class="card">
      <h3>Qué hacer</h3>
      ${list(d.doList, 'do-list')}
    </div>
    <div class="card">
      <h3>Qué no hacer</h3>
      ${list(d.dontList, 'dont-list')}
    </div>
  </div>

  ${
    d.media.length
      ? `<div class="card">
          <h3>Recursos para tu canal</h3>
          <p class="hint">Filtrados por tu canal VAK y temperamento.</p>
          ${d.media
            .map(
              (m) => `
            <div class="career">
              <div><strong>${esc(m.title)}</strong><small>${esc(m.description || '')}</small></div>
              <span class="fit">${esc(m.kind)}</span>
            </div>`,
            )
            .join('')}
        </div>`
      : ''
  }`;
}

/* ----------------------------- MI DIA ----------------------------- */
function panelToday(streak = 0) {
  return `
  <div class="card">
    <h3>Registro de hoy</h3>
    <p class="hint">Racha actual: <strong>${streak} día${streak === 1 ? '' : 's'}</strong>. Reportar un día bajo no rompe la racha: la contrae.</p>
    <form id="checkin-form">
      <label class="field"><span>Ánimo (1-5)</span>
        <div class="mood-scale" data-scale="mood">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-val="${n}">${['Bajo', 'Flojo', 'Normal', 'Bien', 'Muy bien'][n - 1]}</button>`).join('')}
        </div>
      </label>
      <label class="field"><span>Energía (1-5)</span>
        <div class="mood-scale" data-scale="energy">
          ${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-val="${n}">${n}</button>`).join('')}
        </div>
      </label>
      <label class="field"><span>Horas de sueño</span>
        <input type="number" step="0.5" min="0" max="14" name="sleepHours" placeholder="7.5" />
      </label>
      <label class="field"><span>Hábitos completados</span>
        <input type="number" min="0" max="20" name="habitsDone" placeholder="0" />
      </label>
      <p id="checkin-msg" class="hint" hidden></p>
      <button class="btn btn-primary btn-lg" type="submit">Guardar el día</button>
    </form>
  </div>`;
}

/* ----------------------------- RENDER ----------------------------- */
export function renderReport(root, report, { streak = 0 } = {}) {
  const [A, B, C, D] = report.modules;
  root.innerHTML = `
    <div class="res-hero">
      <p class="eyebrow">Informe integrado · ${new Date(report.generatedAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
      <h2>${esc(report.profileMeta.archetype)}</h2>
      <p>${esc(A.summary)}</p>
      <span class="code">${esc(report.profileMeta.code)}</span>
    </div>

    <nav class="tabs" id="report-tabs">
      <button class="tab is-active" data-tab="A">Diagnóstico</button>
      <button class="tab" data-tab="B">Estrategia</button>
      <button class="tab" data-tab="C">Dieta y vida</button>
      <button class="tab" data-tab="D">Hábitos</button>
      <button class="tab" data-tab="T">Mi día</button>
    </nav>

    <div class="tab-panel" data-panel="A">${panelA(A)}</div>
    <div class="tab-panel" data-panel="B" hidden>${panelB(B)}</div>
    <div class="tab-panel" data-panel="C" hidden>${panelC(C)}</div>
    <div class="tab-panel" data-panel="D" hidden>${panelD(D)}</div>
    <div class="tab-panel" data-panel="T" hidden>${panelToday(streak)}</div>

    <div class="actions-bar no-print">
      <button class="btn btn-primary" id="download-pdf">Descargar PDF</button>
      <button class="btn btn-ghost" id="restart-test">Repetir evaluación</button>
    </div>
    <p class="micro">${esc(report.wellnessNotice)}</p>
  `;

  const tabs = root.querySelectorAll('.tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.toggle('is-active', t === tab));
      root.querySelectorAll('.tab-panel').forEach((p) => {
        p.hidden = p.dataset.panel !== tab.dataset.tab;
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // Conmutador de baja energía
  const toggle = root.querySelector('#low-energy-toggle');
  const habitList = root.querySelector('#habit-list');
  let low = false;
  const originalHTML = habitList.innerHTML;
  toggle?.addEventListener('click', () => {
    low = !low;
    toggle.classList.toggle('on', low);
    toggle.setAttribute('aria-pressed', String(low));
    habitList.innerHTML = low
      ? D.habits
          .map(
            (h) => `
        <div class="habit">
          <h4>${esc(h.title)} <span class="badge flag">mínimo viable</span></h4>
          <div class="recipe">
            <div><b>Ancla</b><span>${esc(h.lowEnergy.details.anchor)}</span></div>
            <div><b>Micro-acción</b><span>«${esc(h.lowEnergy.details.microAction)}»</span></div>
            <div><b>Celebración</b><span>${esc(h.lowEnergy.details.celebration)}</span></div>
          </div>
        </div>`,
          )
          .join('')
      : originalHTML;
  });

  root.querySelector('#download-pdf')?.addEventListener('click', () => {
    api.track('Report_Viewed', 'pdf_export');
    window.print();
  });

  root.querySelector('#restart-test')?.addEventListener('click', () => {
    localStorage.removeItem('nexo_answers_v1');
    window.location.reload();
  });

  // Check-in diario
  const form = root.querySelector('#checkin-form');
  if (form) {
    let mood = 0;
    let energy = 0;
    root.querySelectorAll('.mood-scale').forEach((scale) => {
      scale.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          scale.querySelectorAll('button').forEach((b) => b.classList.toggle('is-picked', b === btn));
          if (scale.dataset.scale === 'mood') mood = Number(btn.dataset.val);
          else energy = Number(btn.dataset.val);
        });
      });
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const msg = root.querySelector('#checkin-msg');
      if (!mood || !energy) {
        msg.hidden = false;
        msg.textContent = 'Elige ánimo y energía para guardar.';
        return;
      }
      const data = new FormData(form);
      try {
        const res = await api.logProgress({
          mood,
          energy,
          sleepHours: data.get('sleepHours') ? Number(data.get('sleepHours')) : null,
          habitsDone: Number(data.get('habitsDone') || 0),
          habitsPlanned: D.habits.length,
        });
        msg.hidden = false;
        msg.textContent = res.message;
        api.track('Daily_Checkin', res.streak);
      } catch (err) {
        msg.hidden = false;
        msg.textContent = err.message;
      }
    });
  }
}
