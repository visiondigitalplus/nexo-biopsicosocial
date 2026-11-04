# API

Todas las rutas son relativas al mismo origen. La sesión viaja en cookie `nexo_session` y, como respaldo, en la cabecera `x-nexo-token` (token devuelto por `/api/access`).

## Acceso

`GET /api/status` → `{ authenticated, openAccess, hasProfile }`

`POST /api/access`
```json
{ "inviteCode": "agpxLcMZywZA", "displayName": "Ana", "utm": { "utm_source": "whatsapp" } }
```
→ `{ ok, token, user }` · Errores: `400` falta código, `403` código inválido/agotado/expirado/revocado, `429` rate limit.

## Test

`GET /api/test` → `{ items: [...], meta: { total, estimatedMinutes } }`. Nunca incluye los vectores de pesos.

`POST /api/test/submit` (sesión requerida)
```json
{ "answers": {
  "SIT_01": "A", "SIT_02": "B", "SIT_03": "D", "SIT_04": "B", "SIT_05": "C", "SIT_06": "A",
  "TIPI_07": { "a": 6, "b": 2 }, "TIPI_08": { "a": 6, "b": 2 }, "TIPI_09": { "a": 5, "b": 3 },
  "TIPI_10": { "a": 3, "b": 6 }, "TIPI_11": { "a": 6, "b": 2 },
  "LIT_F": ["M1","M2","C1","C2","F2"], "LIT_D": ["M6","M7","C7"],
  "SCR_12": { "aq1": 1, "aq2": 1, "aq3": 0 },
  "SCR_13": { "as1": 3, "as2": 3, "as3": 2 },
  "SCR_14": { "cat1": 3, "cat2": 4, "cat3": 3 },
  "TRG_15": ["vocacion","ansiedad"], "TRG_16": ["insomnio","rumiacion"],
  "TRG_17": { "choice": "rumbo", "text": "Sé hacia dónde voy" }, "TRG_18": "min15"
} }
```
→ `{ ok, assessmentId, report, summary }` · `422` con `details` si faltan respuestas.

`GET /api/report` → informe persistido (`report_snapshot`).
`GET /api/media` → catálogo multimedia filtrable por canal VAK.

## Progreso

`POST /api/progress` → `{ mood, energy, sleepHours, habitsDone, habitsPlanned, lowEnergy, notes }`
→ `{ log, history, streak, lowEnergyApplied, message }`. Si `energy <= 2` o `lowEnergy`, el sistema activa la versión mínima viable sin romper la racha.

`GET /api/progress/today` → plan del día, hábitos colapsados y racha.

## Tracking (privacy firewall)

`POST /api/track` → `{ "event": "Quiz_Completed" }`
Allowlist: `Quiz_Started`, `Quiz_Completed`, `Report_Viewed`, `Paywall_Viewed`, `Purchase`, `Daily_Checkin`. Cualquier otro valor → `422`.

## Backoffice (cabecera `x-admin-token`)

- `GET /api/admin/metrics`
- `GET /api/admin/invites` (incluye el enlace listo para compartir)
- `POST /api/admin/invites` → `{ label, maxUses, days }`
- `POST /api/admin/invites/:id/revoke`
- `PUT /api/admin/items/:id` → `{ prompt, helper, isActive }`
- `PUT /api/admin/vectors/:itemId/:optionId` → `{ vector }`
