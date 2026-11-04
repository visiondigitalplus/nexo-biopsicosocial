# Privacidad, cifrado y cumplimiento

## 1. Separación de datos (Privacy Firewall)

| Dato | Dónde vive | Protección |
|---|---|---|
| Identidad, estado comercial, UTMs | `users` | Acceso restringido |
| Perfil psicométrico (VAK, RIASEC, TIPI, Littauer…) | `user_psychometric_profiles` | Cifrado en reposo (Postgres) |
| Cribados AQ-10 / ASRS / CAT-Q, metas afectivas, síntomas | `user_clinical_screenings` | **AES-256-GCM a nivel de aplicación**, AAD = `user_id` |
| Eventos comerciales | Solo log genérico | Sin payload sensible |

Reglas duras:

1. Ningún dato clínico se escribe en `users`, en logs de aplicación ni en parámetros de URL.
2. `/api/track` acepta únicamente eventos de una allowlist; cualquier otro valor responde `422`.
3. El detalle clínico crudo **no** se devuelve al cliente: solo puntuaciones agregadas y banderas necesarias para el informe.
4. La tabla clínica no guarda IP, user-agent ni UTMs: no es atribuible a tráfico comercial.

## 2. Cifrado

- **Formato del blob:** `[version(1) | iv(12) | authTag(16) | ciphertext]`.
- **AAD:** `user_id`, de modo que un blob no puede moverse entre usuarios.
- **Rotación:** `key_version` en la fila permite convivencia de claves; al rotar, re-cifrar por lotes.
- **Cookies de sesión:** HMAC-SHA256 (`SESSION_SECRET`), `httpOnly`, `SameSite=None; Secure` cuando la petición es HTTPS.

## 3. Cribados: lenguaje y límites

- AQ-10 / ASRS / CAT-Q se administran en versión **abreviada** (3 reactivos cada uno). Las banderas usan un **corte equivalente** al instrumento completo y así se declara en el informe.
- Terminología permitida (General Wellness): «cribado», «bandera de soporte», «perfil de bienestar», «ruta de optimización».
- Terminología prohibida en la interfaz y el marketing: «diagnóstico de autismo/TDAH», «tratamiento», «cura», «paciente».
- Si la persona marca impacto funcional o ánimo bajo persistente, el informe invita a buscar acompañamiento profesional y, en crisis, a la línea local de emergencia.

## 4. Retención y derechos

- El usuario puede solicitar borrado: eliminar la fila de `users` propaga por `ON DELETE CASCADE` a perfiles, cribados y registros diarios.
- Recomendado en producción: retención de `daily_progress_logs` a 24 meses y anonimización de perfiles inactivos a 36 meses.
- Consentimiento explícito registrado en `users.consent_gdpr` + `consented_at`.

## 5. Checklist antes de abrir al público

- [ ] `OPEN_ACCESS=false` y `ADMIN_TOKEN` fuerte.
- [ ] `SESSION_SECRET` y `CLINICAL_ENCRYPTION_KEY` generados con `openssl rand -base64 32`.
- [ ] TLS terminado en el proxy; `PGSSL=true` si la base es remota.
- [ ] Activar RLS en `user_clinical_screenings` con rol de aplicación restringido.
- [ ] Copias de seguridad cifradas y prueba de restauración.
- [ ] Revisión por profesional de salud mental del copy y de los cortes de cribado.
