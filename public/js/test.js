/**
 * Runner del test maestro: 20 pantallas, mobile-first, con auto-advance
 * en reactivos de selección única para eliminar la fatiga cognitiva.
 */
const STORAGE_KEY = 'nexo_answers_v1';

// Orden de presentación (la numeración del prompt se mantiene en el copy)
const DISPLAY_ORDER = {
  SIT_01: 1, SIT_02: 2, SIT_03: 3, SIT_04: 4, SIT_05: 5, SIT_06: 6,
  TIPI_07: 7, TIPI_08: 8, TIPI_09: 9, TIPI_10: 10, TIPI_11: 11,
  LIT_F: 12, LIT_D: 13,
  SCR_12: 14, SCR_13: 15, SCR_14: 16,
  TRG_15: 17, TRG_16: 18, TRG_17: 19, TRG_18: 20,
};

const KICKER = {
  situational: 'Bloque 1 · Juicio situacional',
  likert: 'Bloque 2 · Personalidad',
  adjective: 'Bloque 2 · Matriz de temperamento',
  binary: 'Bloque 2 · Cribado',
  scale4: 'Bloque 2 · Cribado',
  multi: 'Bloque 3 · Triaje afectivo',
  choice: 'Bloque 3 · Estado futuro',
};

export class TestRunner {
  constructor(stage, { onFinish, onProgress }) {
    this.stage = stage;
    this.onFinish = onFinish;
    this.onProgress = onProgress;
    this.items = [];
    this.answers = this.load();
    this.index = 0;
    this.busy = false;
  }

  load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.answers));
    } catch { /* modo privado */ }
  }

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* noop */ }
    this.answers = {};
  }

  async start(items) {
    this.items = [...items].sort((a, b) => {
      const ao = DISPLAY_ORDER[a.id] ?? 99;
      const bo = DISPLAY_ORDER[b.id] ?? 99;
      return ao - bo;
    });
    // Retoma donde quedó si hay respuestas previas
    const firstUnanswered = this.items.findIndex((item) => !this.isAnswered(item));
    this.index = firstUnanswered === -1 ? 0 : firstUnanswered;
    this.render();
  }

  get current() {
    return this.items[this.index];
  }

  /** Índice del primer ítem sin responder, o -1 si todo está completo. */
  firstUnansweredIndex() {
    return this.items.findIndex((item) => !this.isAnswered(item));
  }

  jumpTo(index) {
    if (index < 0 || index >= this.items.length) return;
    this.index = index;
    this.render();
  }

  /** Posición (1-20) de un ítem por id, para mensajes claros. */
  positionOf(itemId) {
    return DISPLAY_ORDER[itemId] ?? this.items.findIndex((i) => i.id === itemId) + 1;
  }

  indexOf(itemId) {
    return this.items.findIndex((i) => i.id === itemId);
  }

  isAnswered(item) {
    const a = this.answers[item.id];
    if (a === undefined || a === null) return false;
    switch (item.kind) {
      case 'situational':
        return Boolean(a);
      case 'choice':
        return typeof a === 'string' ? Boolean(a) : Boolean(a?.choice);
      case 'multi':
        return Array.isArray(a) && a.length > 0;
      case 'adjective':
        return Array.isArray(a) && a.length >= (item.config?.minSelect || 1);
      case 'likert':
        return Boolean(a && item.options.every((p) => Number.isFinite(Number(a[p.id]))));
      case 'binary':
      case 'scale4':
        return item.options.length > 0 && item.options.every((s) => a?.[s.id] !== undefined && a?.[s.id] !== null);
      default:
        return Boolean(a);
    }
  }

  go(delta) {
    const next = this.index + delta;
    if (next < 0) return;
    if (next >= this.items.length) return this.finish();
    this.index = next;
    this.render();
  }

  advance(delay = 300) {
    if (this.busy) return;
    this.busy = true;
    setTimeout(() => {
      this.busy = false;
      this.go(1);
    }, delay);
  }

  async finish() {
    this.onProgress(this.items.length, this.items.length);
    this.onFinish(this.answers);
  }

  render() {
    const item = this.current;
    if (!item) return;
    this.onProgress(this.index + 1, this.items.length);

    const header = `
      <div class="q-block">
        <p class="q-kicker">${KICKER[item.kind] || 'Evaluación'} · ítem ${DISPLAY_ORDER[item.id] ?? this.index + 1}</p>
        <h2 class="q-title">${item.prompt}</h2>
        ${item.helper ? `<p class="q-helper">${item.helper}</p>` : ''}
      </div>`;

    const body = this[`render_${item.kind}`] ? this[`render_${item.kind}`](item) : '';
    this.stage.innerHTML = header + body;
    this.stage.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    this.wire(item);
  }

  /* ---------------- renderizadores ---------------- */
  render_situational(item) {
    const picked = this.answers[item.id];
    return `
      <div class="options">
        ${item.options
          .map(
            (o) => `
          <button class="option ${picked === o.id ? 'is-picked' : ''}" data-option="${o.id}">
            <span class="letter">${o.id}</span>
            <span>${o.label}</span>
          </button>`,
          )
          .join('')}
      </div>`;
  }

  render_likert(item) {
    const { min = 1, max = 7 } = item.config || {};
    const mid = Math.round((min + max) / 2);
    // Garantiza que el ítem quede respondido aunque no se muevan los deslizadores:
    // sin esto, pulsar "Continuar" enviaba TIPI incompleto y el servidor lo rechazaba.
    if (!this.answers[item.id]) this.answers[item.id] = {};
    for (const pair of item.options) {
      if (!Number.isFinite(Number(this.answers[item.id][pair.id]))) this.answers[item.id][pair.id] = mid;
    }
    this.save();
    const entry = this.answers[item.id] || {};
    return `
      ${item.options
        .map((pair) => {
          const value = Number.isFinite(Number(entry[pair.id])) ? Number(entry[pair.id]) : Math.round((min + max) / 2);
          const touched = Number.isFinite(Number(entry[pair.id]));
          return `
          <div class="slider-card">
            <p>${pair.text}</p>
            <input type="range" min="${min}" max="${max}" step="1" value="${value}"
                   data-slider="${pair.id}" ${touched ? 'data-touched="1"' : ''} aria-label="${pair.text}" />
            <div class="scale-ends"><span>${min} · nada</span><span class="value" data-value-for="${pair.id}">${value}</span><span>${max} · totalmente</span></div>
          </div>`;
        })
        .join('')}
      <div class="stage-actions"><button class="btn btn-primary" data-continue>Continuar</button></div>`;
  }

  render_adjective(item) {
    const picked = new Set(this.answers[item.id] || []);
    const isWeak = item.id === 'LIT_D';
    return `
      <div class="chips">
        ${item.options
          .map(
            (a) => `<button class="chip ${picked.has(a.id) ? 'is-picked' : ''} ${isWeak ? 'danger' : ''}" data-chip="${a.id}">${a.label}</button>`,
          )
          .join('')}
      </div>
      <p class="counter" data-counter></p>
      <div class="stage-actions"><button class="btn btn-primary" data-continue disabled>Continuar</button></div>`;
  }

  render_binary(item) {
    const entry = this.answers[item.id] || {};
    return `
      <div class="card">
        ${item.options
          .map(
            (s) => `
          <div class="stack-row">
            <p>${s.text}</p>
            <div class="scale-btns">
              <button class="scale-btn ${entry[s.id] === 1 ? 'is-picked' : ''}" data-statement="${s.id}" data-value="1">Sí</button>
              <button class="scale-btn ${entry[s.id] === 0 ? 'is-picked' : ''}" data-statement="${s.id}" data-value="0">No</button>
            </div>
          </div>`,
          )
          .join('')}
      </div>`;
  }

  render_scale4(item) {
    const entry = this.answers[item.id] || {};
    const labels = item.config?.labels || ['Nunca', 'Casi nunca', 'A veces', 'Casi siempre', 'Siempre'];
    return `
      <div class="card">
        ${item.options
          .map(
            (s) => `
          <div class="stack-row">
            <p>${s.text}</p>
            <div class="scale-btns">
              ${labels
                .map(
                  (label, value) => `
                <button class="scale-btn ${Number(entry[s.id]) === value ? 'is-picked' : ''}"
                        data-statement="${s.id}" data-value="${value}">${label}</button>`,
                )
                .join('')}
            </div>
          </div>`,
          )
          .join('')}
      </div>`;
  }

  render_multi(item) {
    const picked = new Set(this.answers[item.id] || []);
    const max = item.config?.maxSelect || 3;
    return `
      <div class="chips">
        ${item.options
          .map(
            (o) => `<button class="chip ${picked.has(o.id) ? 'is-picked' : ''}" data-multi="${o.id}" data-exclusive="${o.exclusive ? '1' : '0'}">${o.label}</button>`,
          )
          .join('')}
      </div>
      <p class="counter" data-counter>Máximo ${max}</p>
      <div class="stage-actions"><button class="btn btn-primary" data-continue ${picked.size ? '' : 'disabled'}>Continuar</button></div>`;
  }

  render_choice(item) {
    const stored = this.answers[item.id];
    const choice = typeof stored === 'string' ? stored : stored?.choice;
    const text = typeof stored === 'object' && stored ? stored.text || '' : '';
    return `
      <div class="options">
        ${item.options
          .map(
            (o) => `
          <button class="option ${choice === o.id ? 'is-picked' : ''}" data-choice="${o.id}">
            <span class="letter">${choice === o.id ? '✓' : ''}</span>
            <span>${o.label}</span>
          </button>`,
          )
          .join('')}
      </div>
      ${
        item.config?.allowText
          ? `<label class="field" style="margin-top:14px">
               <span>Tu frase, con tus palabras <em>(opcional)</em></span>
               <textarea data-free-text placeholder="${item.config.textPlaceholder || 'Escríbela aquí…'}">${text}</textarea>
             </label>`
          : ''
      }
      <div class="stage-actions"><button class="btn btn-primary" data-continue ${choice ? '' : 'disabled'}>Continuar</button></div>`;
  }

  /* ---------------- interacción ---------------- */
  wire(item) {
    const stage = this.stage;

    stage.querySelectorAll('[data-option]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.answers[item.id] = btn.dataset.option;
        this.save();
        stage.querySelectorAll('[data-option]').forEach((b) => b.classList.toggle('is-picked', b === btn));
        this.advance(280);
      });
    });

    stage.querySelectorAll('[data-slider]').forEach((input) => {
      const out = stage.querySelector(`[data-value-for="${input.dataset.slider}"]`);
      input.addEventListener('input', () => {
        if (out) out.textContent = input.value;
        this.answers[item.id] = { ...(this.answers[item.id] || {}), [input.dataset.slider]: Number(input.value) };
        this.save();
        const allTouched = [...stage.querySelectorAll('[data-slider]')].every((el) => el.dataset.touched === '1' || el === input);
        if (allTouched && [...stage.querySelectorAll('[data-slider]')].every((el) => Number.isFinite(Number(this.answers[item.id]?.[el.dataset.slider])))) {
          this.advance(900);
        }
      });
      input.addEventListener('change', () => {
        input.dataset.touched = '1';
      });
      input.addEventListener('pointerdown', () => {
        input.dataset.touched = '1';
      });
    });

    // chips: adjetivos
    stage.querySelectorAll('[data-chip]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const set = new Set(this.answers[item.id] || []);
        const id = chip.dataset.chip;
        if (set.has(id)) set.delete(id);
        else if (set.size < (item.config?.maxSelect || 10)) set.add(id);
        this.answers[item.id] = [...set];
        this.save();
        chip.classList.toggle('is-picked');
        this.updateCounter(item);
        const ok = set.size >= (item.config?.minSelect || 1);
        const cont = stage.querySelector('[data-continue]');
        if (cont) cont.disabled = !ok;
        if (set.size >= (item.config?.maxSelect || 10)) this.advance(500);
      });
    });
    this.updateCounter(item);

    // multi
    stage.querySelectorAll('[data-multi]').forEach((chip) => {
      chip.addEventListener('click', () => {
        const set = new Set(this.answers[item.id] || []);
        const id = chip.dataset.multi;
        const exclusive = chip.dataset.exclusive === '1';
        if (set.has(id)) set.delete(id);
        else {
          if (exclusive) set.clear();
          else set.delete([...set].find((x) => item.options.find((o) => o.id === x && o.exclusive)));
          if (set.size < (item.config?.maxSelect || 3)) set.add(id);
        }
        this.answers[item.id] = [...set];
        this.save();
        stage.querySelectorAll('[data-multi]').forEach((b) => b.classList.toggle('is-picked', set.has(b.dataset.multi)));
        this.updateCounter(item);
        const cont = stage.querySelector('[data-continue]');
        if (cont) cont.disabled = set.size === 0;
        if (set.size >= (item.config?.maxSelect || 3)) this.advance(500);
      });
    });

    // escalas por frase
    stage.querySelectorAll('[data-statement]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.statement;
        this.answers[item.id] = { ...(this.answers[item.id] || {}), [sid]: Number(btn.dataset.value) };
        this.save();
        stage.querySelectorAll(`[data-statement="${sid}"]`).forEach((b) => b.classList.toggle('is-picked', b === btn));
        if (this.isAnswered(item)) this.advance(360);
      });
    });

    // opciones simples de bloque 3
    stage.querySelectorAll('[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const prev = this.answers[item.id];
        const prevText = typeof prev === 'object' && prev ? prev.text || '' : '';
        this.answers[item.id] = item.config?.allowText
          ? { choice: btn.dataset.choice, text: prevText }
          : btn.dataset.choice;
        this.save();
        stage.querySelectorAll('[data-choice]').forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-picked', on);
          b.querySelector('.letter').textContent = on ? '✓' : '';
        });
        const cont = stage.querySelector('[data-continue]');
        if (cont) cont.disabled = false;
        if (!item.config?.allowText) this.advance(300);
      });
    });

    const freeText = stage.querySelector('[data-free-text]');
    if (freeText) {
      freeText.addEventListener('input', () => {
        const prev = this.answers[item.id];
        this.answers[item.id] = { choice: typeof prev === 'string' ? prev : prev?.choice || null, text: freeText.value };
        this.save();
      });
    }

    const cont = stage.querySelector('[data-continue]');
    if (cont) cont.addEventListener('click', () => this.go(1));
  }

  updateCounter(item) {
    const counter = this.stage.querySelector('[data-counter]');
    if (!counter) return;
    const n = (this.answers[item.id] || []).length;
    const min = item.config?.minSelect ?? 1;
    const max = item.config?.maxSelect ?? 10;
    counter.textContent = `${n} seleccionadas · mínimo ${min}, máximo ${max}`;
  }
}
