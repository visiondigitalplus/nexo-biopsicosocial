# Nexo · Plataforma integrada de evaluación biopsicosocial

**Sitio en vivo:** https://visiondigitalplus.github.io/nexo-biopsicosocial/

Aplicación web (mobile-first) que ejecuta una **tanda única de evaluación — Test Maestro de 18 ítems** — y cruza, con la misma jerarquía, dos marcos:

1. **Motor psicotécnico y conductual:** VAK, Inteligencias Múltiples de Gardner, RIASEC (Holland), TKI (Thomas-Kilmann), Big Five (TIPI) y cribados abreviados AQ-10 / ASRS / CAT-Q.
2. **Motor psicobiológico:** temperamentos hipocrático-galénicos, ejes de Eysenck, Cloninger TCI, neurobiología de Helen Fisher, matriz Littauer de 40 adjetivos, dietoterapia Unani/Waldorf (Ley de Compensación Alopática) y protocolos de sanación del carácter.

La salida es un **informe integrado de 4 módulos** (Diagnóstico · Estrategia · Dieta y vida · Hábitos) exportable a PDF, más un motor de microhábitos BJ Fogg con **conmutador de día de baja energía**.

---

## 1. Arranque rápido

```bash
cp .env.example .env         # completa SESSION_SECRET y CLINICAL_ENCRYPTION_KEY
npm install
npm start                    # http://localhost:3000
```

En el primer arranque la base se siembra sola (ítems, vectores, microhábitos, media) y se imprime un **enlace de acceso inicial**:

```
[boot] Enlace de acceso inicial: http://localhost:3000/?invite=XXXXXXXXXXXX
```

Generar más enlaces privados:

```bash
npm run invite -- "María Pérez" 1 30     # nombre, usos, días de validez
```

Backoffice: `/admin.html` → pega `ADMIN_TOKEN` del `.env`. Ahí se crean, listan y revocan enlaces, y se ven métricas del embudo.

### Con PostgreSQL (producción)

```bash
export DATABASE_URL=postgres://user:pass@host:5432/nexo
npm run migrate     # aplica server/db/schema.sql
npm run seed        # siembra catálogos
npm start
```

Sin `DATABASE_URL` el sistema usa un **driver de archivo** (`data/db.json`) con la misma interfaz que el driver PostgreSQL: desarrollo y demo sin infraestructura, producción en Postgres sin cambiar una línea de los repositorios.

### Docker

```bash
docker compose up --build      # app + postgres 16
```

---

## 2. Arquitectura

```
server/
  index.js              Express, cabeceras de seguridad, boot + semilla
  config.js             Configuración por entorno (.env sin dependencias)
  lib/crypto.js         AES-256-GCM (tabla clínica), cookies firmadas HMAC
  db/
    schema.sql          Esquema PostgreSQL: 8 tablas + access_invites
    schemaMeta.js       Metadatos de columnas (allowlist para SQL generado)
    pgDriver.js         Driver PostgreSQL (SQL parametrizado, CRUD genérico)
    fileDriver.js       Driver de archivo para desarrollo/demo
    repositories.js     Única capa que conoce nombres de tablas
    seed.js             Semilla idempotente
    migrate.js          Aplica schema.sql
  engine/
    catalog.js          Test maestro: 18 ítems + 40 adjetivos Littauer
    scoring.js          Motor psicométrico (funciones puras, testeables)
    prescriptions.js    Carreras, playbook de comunicación, dietas, hábitos
    reports.js          Informe integrado (módulos A-D)
  routes/
    session.js          Sesión, admin, rate limit
    access.js           Acceso por enlace de invitación
    assessment.js       Catálogo del test, submit, informe, media
    progress.js         Registro diario + tracking con privacy firewall
    admin.js            Métricas, invitaciones, items/vectores
public/
  index.html            SPA: gate → intro → test → resultados
  js/test.js            Runner de 20 pantallas con auto-advance
  js/charts.js          SVG generados a mano (Eysenck, hexágono RIASEC, barras)
  js/results.js         Informe interactivo + check-in diario
  admin.html            Backoffice
tests/scoring.test.js   6 suites del motor (npm test)
```

### El test maestro

| Bloque | Ítems | Qué mide |
|---|---|---|
| 1. Juicio situacional | 1-6 | VAK, Gardner, RIASEC, TKI, ejecutivo, Eysenck, Cloninger vía vectores cruzados |
| 2. Personalidad y cribado | 7-14 | TIPI (5 factores, 10 declaraciones con recodificación inversa), matriz Littauer (20 fortalezas / 20 debilidades), AQ-10, ASRS, CAT-Q |
| 3. Triaje y compromiso | 15-18 | Prioridades afectivas, somatización, visualización a 6 semanas, tiempo diario |

**20 pantallas** en móvil. Los reactivos de selección única avanzan solos; los bloques con selección múltiple muestran *Continuar*. El progreso se persiste en `localStorage` y se retoma donde quedó.

### Vector de pesos cruzados

Cada opción de los ítems 1-6 porta:

```json
{
  "vak":       { "V": 2, "A": 0, "K": 1 },
  "gardner":   { "esp": 2, "logmat": 1 },
  "riasec":    { "I": 1, "C": 1, "A": 1 },
  "tki":       { "evit": 1, "colab": 1 },
  "ejecutivo": { "focus": 1 },
  "eysenck":   { "E": 0, "N": 0, "P": 0 },
  "cloninger": { "NS": 1, "HA": 1, "PS": 1 }
}
```

El motor los suma (`server/engine/scoring.js`), normaliza a 0-100 respecto del máximo observado y deriva dominantes, códigos y coordenadas. Los vectores viven en `option_weight_vectors` (JSONB) y son editables desde el backoffice sin desplegar código.

### Algoritmos clave

- **VAK:** `max(V, A, K)` con mezcla ordinal.
- **Gardner:** top-2 sobre 8 inteligencias.
- **RIASEC:** código de 3 letras (`top_3`).
- **TKI:** estilo dominante entre Tiburón / Búho / Zorro / Tortuga / Oso.
- **TIPI:** `Score = (x + (8 - x_inverso)) / 2` por factor; `N = 8 - ES`.
- **Littauer:** suma de columnas `F_i`, `D_i`; dominante y secundario por totales; **distribución plana → Flemático Polifacético**; `ratio = F/D` normalizado por densidad de selección; `D_i > F_i` → déficit sugerido en SD/CO.
- **Eysenck:** cuadrante y reactividad (inmediata/retardada × efímera/duradera).
- **Cloninger:** NS, HA, RD, PS desde vectores; SD, CO, ST derivados de la regulación del carácter y Big Five.
- **Fisher:** cuatro ejes neuroquímicos normalizados (explorador, constructor, director, negociador).
- **Cribados:** puntuación y banderas con corte **equivalente** al instrumento completo (AQ-10 ≥ 6/10; ASRS parte A ≥ 4/6). El informe lo declara explícitamente como cribado, nunca como diagnóstico.

---

## 2.b Versión estática para GitHub Pages (sin servidor)

La app también se compila como **sitio 100% estático**: mismo motor psicométrico, mismos 18 ítems y mismo informe, ejecutándose por completo en el navegador.

```bash
npm run build:static      # genera docs/ y nexo-app-standalone.html
npm run preview:static    # revisa el sitio en http://localhost:4173
npm run test:static       # prueba E2E del sitio (20 pantallas + informe)
```

| Salida | Qué es | Cómo se publica |
|---|---|---|
| `docs/` | Sitio completo (HTML + CSS + bundle de 86 KB) | GitHub Pages con `/docs` |
| raíz (`index.html`, `css/`, `js/`, `assets/`) | Copia publicable que genera el build | GitHub Pages sirviendo desde `/` (configuración actual) |
| `nexo-app-standalone.html` | Todo en un archivo, sin servidor | Se abre con doble clic o se sube solo |

Diferencias con la versión con servidor: no hay cuentas, ni invitaciones, ni base de datos; el informe y el registro diario se guardan en `localStorage` del propio dispositivo y nada se envía a ninguna parte.

---

## 3. Esquema de base de datos

| Tabla | Contenido |
|---|---|
| `users` | Identidad, estado comercial, UTMs, consentimiento |
| `assessment_items` | Ítems editables (JSONB de opciones y configuración) |
| `option_weight_vectors` | Vectores multirrasgo JSONB por opción |
| `user_psychometric_profiles` | Perfiles VAK/Gardner/RIASEC/TKI/TIPI/Littauer/Eysenck/Cloninger/Fisher + `report_snapshot` |
| `user_clinical_screenings` | **Segregada y cifrada** (AES-256-GCM, AAD = user_id) |
| `habit_prescriptions` | Microhábitos, recetas Fogg, versión baja energía, dietas Unani |
| `media_assets` | Audios, vídeos, retos y guías filtrados por canal VAK |
| `daily_progress_logs` | Ánimo, energía, sueño, racha, bandera de baja energía |
| `access_invites` | Extensión: enlaces privados de un solo uso |

Detalle completo en `server/db/schema.sql` (índices, triggers, RLS comentado).

---

## 4. Cumplimiento y privacidad

- **FDA General Wellness:** el copy usa solo lenguaje de bienestar (“Perfilado Neuro-Conductual”, “Ruta de Optimización Personal”). Los avisos se muestran al superar los cortes de cribado y si hay impacto funcional.
- **FTC Privacy Firewall:** las respuestas clínicas viven en una tabla aparte, cifrada, sin IP, sin user-agent y sin UTMs. El endpoint `/api/track` acepta **solo** eventos comerciales genéricos (`Quiz_Started`, `Quiz_Completed`, `Report_Viewed`, `Paywall_Viewed`, `Purchase`, `Daily_Checkin`); cualquier otro evento devuelve 422.
- **Acceso privado:** `OPEN_ACCESS=false` obliga a canjear un código de invitación. Cada enlace tiene usos máximos, caducidad y revocación. La sesión viaja en cookie `httpOnly` firmada, con fallback por cabecera para navegadores que bloquean cookies de terceros.
- **Cifrado:** clave maestra en `CLINICAL_ENCRYPTION_KEY`; el blob incluye versión de clave para permitir rotación.

Detalle en `docs/PRIVACIDAD.md`.

---

## 5. Embudo Web2App

1. La persona entra con su enlace → corre el test (antes de cualquier cobro).
2. Al terminar, evento comercial genérico `Quiz_Completed`.
3. Pantalla de oferta con Stripe (`STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`) y deep link a la app móvil tras la compra.
4. `Purchase` se envía sin ningún dato clínico.

El cobro es opcional: la app funciona completa sin claves de Stripe (el botón queda en modo informativo).

---

## 6. Pruebas

```bash
npm test
```

Cubre recodificación TIPI, matriz Littauer (incluido el perfil plano), códigos y coordenadas del perfil, existencia de los 4 módulos, presupuesto de tiempo de hábitos y validación de payloads.

---

## 7. Aviso

Herramienta de bienestar y autoconocimiento. No sustituye evaluación, diagnóstico ni tratamiento médico o psicológico. Los cribados incluidos son abreviados y no diagnósticos.
