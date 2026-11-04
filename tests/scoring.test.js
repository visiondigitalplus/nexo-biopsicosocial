import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProfile, sanitizeAnswers, scoreLittauer, scoreTipi, validateAnswers } from '../server/engine/scoring.js';
import { buildReport } from '../server/engine/reports.js';
import { buildHabitPlan } from '../server/engine/prescriptions.js';

const baseAnswers = {
  SIT_01: 'A',
  SIT_02: 'B',
  SIT_03: 'D',
  SIT_04: 'B',
  SIT_05: 'C',
  SIT_06: 'A',
  TIPI_07: { a: 6, b: 2 },
  TIPI_08: { a: 6, b: 2 },
  TIPI_09: { a: 5, b: 3 },
  TIPI_10: { a: 3, b: 6 },
  TIPI_11: { a: 6, b: 2 },
  LIT_F: ['M1', 'M2', 'C1', 'C2', 'F2'],
  LIT_D: ['M6', 'M7', 'C7'],
  SCR_12: { aq1: 1, aq2: 1, aq3: 0 },
  SCR_13: { as1: 3, as2: 3, as3: 2 },
  SCR_14: { cat1: 3, cat2: 4, cat3: 3 },
  TRG_15: ['vocacion', 'ansiedad'],
  TRG_16: ['insomnio', 'rumiacion'],
  TRG_17: { choice: 'rumbo', text: 'Sé hacia dónde voy' },
  TRG_18: 'min15',
};

test('TIPI: recodificación inversa 8 - x y promedio por factor', () => {
  const tipi = scoreTipi(baseAnswers);
  // Extraversión: (6 + (8-2)) / 2 = 6
  assert.equal(tipi.raw.E, 6);
  // Estabilidad: (3 + (8-6)) / 2 = 2.5
  assert.equal(tipi.raw.ES, 2.5);
  assert.ok(tipi.percent.E >= 0 && tipi.percent.E <= 100);
  assert.ok(tipi.neuroticismPercent > 50, 'N alto esperado con ES baja');
});

test('Littauer: columnas, dominante, ratio y perfil plano', () => {
  const lit = scoreLittauer(['M1', 'M2', 'C1', 'C2', 'F2'], ['M6', 'M7', 'C7']);
  assert.equal(lit.strengths.M, 2);
  assert.equal(lit.weaknesses.M, 2);
  assert.equal(lit.totalMarked, 8);
  assert.equal(lit.dominant, 'M');
  assert.equal(lit.secondary, 'C');
  assert.equal(lit.characterDeficit, false); // 5 fortalezas > 3 debilidades
  assert.ok(lit.ratio > 1);

  const flat = scoreLittauer(['S1', 'C1', 'M1', 'F1'], ['S6', 'C6', 'M6', 'F6']);
  assert.equal(flat.flatProfile, true);
  assert.equal(flat.dominant, 'F');
});

test('Perfil completo: códigos y coordenadas coherentes', () => {
  const profile = buildProfile(baseAnswers);
  assert.match(profile.riasec.code, /^[RIASEC]{3}$/);
  assert.equal(profile.gardner.top2.length, 2);
  assert.ok(['V', 'A', 'K'].includes(profile.vak.dominant));
  assert.ok(['S', 'C', 'M', 'F'].includes(profile.littauer.dominant));
  assert.ok(profile.eysenck.x >= 0 && profile.eysenck.x <= 100);
  assert.ok(profile.cloninger.character.SD >= 0 && profile.cloninger.character.SD <= 100);
  assert.equal(profile.fisher.axes.length, 4);
  // Cribados: 2/3 AQ y 8/12 ASRS => ambos sobre el corte escalado
  assert.equal(profile.screenings.aq10.score, 2);
  assert.equal(profile.screenings.aq10.flag, true);
  assert.equal(profile.screenings.asrs.flag, true);
  assert.ok(profile.screenings.disclaimers.length >= 2);
});

test('Informe: cuatro módulos con contenido prescriptivo', () => {
  const profile = buildProfile(baseAnswers);
  const report = buildReport(profile, []);
  assert.deepEqual(report.modules.map((m) => m.id), ['A', 'B', 'C', 'D']);
  const [A, B, C, D] = report.modules;
  assert.ok(A.archetype.length > 5);
  assert.ok(B.vocational.careers.length === 6);
  assert.ok(C.include.length >= 5 && C.exclude.length >= 3);
  assert.ok(D.habits.length >= 2);
  assert.ok(D.habits[0].recipe.includes('+'));
  assert.ok(D.lowEnergySwitch.collapsed[0].recipe.length > 0);
});

test('Presupuesto de tiempo modula la cantidad de hábitos', () => {
  const profile = buildProfile(baseAnswers);
  const short = buildHabitPlan(profile, { minutes: 5 });
  const long = buildHabitPlan(profile, { minutes: 30 });
  assert.equal(short.target, 2);
  assert.equal(long.target, 5);
  assert.ok(long.habits.length >= short.habits.length);
});

test('Saneamiento: un deslizador sin mover no pierde el test completo', () => {
  const partially = {
    ...baseAnswers,
    TIPI_09: { a: 4 },
    TIPI_10: { b: 5 },
    TIPI_11: { a: 6 },
  };
  // Sin sanear, el servidor rechazaba el envío completo
  assert.ok(validateAnswers(partially).length > 0);

  const { answers, notes } = sanitizeAnswers(partially);
  assert.equal(validateAnswers(answers).length, 0);
  assert.equal(answers.TIPI_09.b, 4); // neutro
  assert.equal(answers.TIPI_10.a, 4);
  assert.ok(notes.length >= 3);

  // Un test completo con este saneamiento genera informe
  const profile = buildProfile(answers);
  assert.match(profile.riasec.code, /^[RIASEC]{3}$/);
});

test('Saneamiento: valores fuera de rango se acotan y datos basura se descartan', () => {
  const dirty = {
    ...baseAnswers,
    TIPI_07: { a: 99, b: 'x' },
    LIT_F: ['M1', 'M2', 'NO_EXISTE', 'C1'],
    SCR_13: { as1: 9, as2: -3 },
    TRG_16: ['inventado'],
    TRG_18: undefined,
  };
  const { answers } = sanitizeAnswers(dirty);
  assert.equal(answers.TIPI_07.a, 7);
  assert.equal(answers.TIPI_07.b, 4);
  assert.ok(!answers.LIT_F.includes('NO_EXISTE'));
  assert.equal(answers.SCR_13.as1, 4);
  assert.equal(answers.SCR_13.as2, 0);
  assert.deepEqual(answers.TRG_16, ['ninguno']);
  assert.equal(answers.TRG_18, 'min15');
});

test('Validación rechaza payloads incompletos', () => {
  assert.ok(validateAnswers({}).length > 5);
  const bad = { ...baseAnswers, SIT_01: 'Z', TIPI_07: { a: 99, b: 1 } };
  const errors = validateAnswers(bad);
  assert.ok(errors.some((e) => e.includes('SIT_01')));
  assert.ok(errors.some((e) => e.includes('TIPI_07')));
  assert.equal(validateAnswers(baseAnswers).length, 0);
});
