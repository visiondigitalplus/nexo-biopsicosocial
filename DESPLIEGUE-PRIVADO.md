# Versión privada con invitaciones (PostgreSQL)

Tienes **dos sitios** que se complementan:

| | Sitio público | Sitio privado (este documento) |
|---|---|---|
| Enlace | <https://visiondigitalplus.github.io/nexo-biopsicosocial/> | el que te dé Render, por ejemplo `https://nexo-privado.onrender.com` |
| Quién entra | cualquiera que tenga el enlace | **solo quien tenga un código de invitación** |
| Dónde vive la información | en el navegador de cada persona | en una base de datos PostgreSQL tuya |
| Para qué sirve | mostrar la app, compartirla, demos | atender personas reales con seguimiento |

> Ambos corren el **mismo motor** y dan **el mismo informe**. El privado añade: invitaciones personales, registro diario guardado, tabla clínica cifrada y un backoffice para ver métricas y revocar accesos.

---

## Antes de empezar: lo que necesitas

- Una cuenta gratuita en **Render** (<https://render.com>) — puedes entrar con tu cuenta de GitHub.
- El repositorio del proyecto ya está en tu GitHub y lo usaremos tal cual.
- **No hay que escribir comandos ni instalar nada.** Todo son clics.

Tiempo estimado: **10 minutos**, casi todos de espera mientras Render construye.

---

## Paso 1 — Crear el despliegue

1. Entra a <https://dashboard.render.com> y pulsa **New +** (arriba a la derecha).
2. Elige **Blueprint**.
3. Pulsa **Connect** junto a `visiondigitalplus/nexo-biopsicosocial` y autoriza a Render si te lo pide.
   - Si el repositorio no aparece, pulsa *Configure account* y dale acceso a ese repositorio.
4. Render detecta solo el archivo `render.yaml` y muestra dos recursos:
   - `nexo-db` (la base de datos, plan **Free**)
   - `nexo-privado` (la aplicación, plan **Free**)
5. En el campo **Blueprint Name** escribe `nexo` (o lo que prefieras).
6. Pulsa **Apply** (o **Create**).

Render empieza a trabajar. Cuando termine (5–10 minutos), la tarjeta `nexo-privado` mostrará arriba una dirección como:

```
https://nexo-privado.onrender.com
```

Esa es tu URL privada. **No la compartas sin código**: sin invitación no se entra.

---

## Paso 2 — Completar un dato que Render no puede adivinar

Render genera solo los secretos (sesión, clave de cifrado clínico y token de administración), pero la dirección pública exacta hay que confirmarla para que los enlaces de invitación salgan completos.

1. Abre `nexo-privado` en Render y ve a **Environment**.
2. Busca la variable `PUBLIC_BASE_URL`, pulsa **Edit** y escribe tu URL, sin barra al final:
   ```
   https://nexo-privado.onrender.com
   ```
3. Pulsa **Save changes**. Render reinicia el servicio (1–2 minutos).

> Si no lo haces, la app funciona igual: los enlaces se arman con la dirección desde la que estés navegando. Este paso solo garantiza que siempre salgan bien, incluso si generas invitaciones desde la terminal.

---

## Paso 3 — Entrar como administrador

1. En Render, dentro de `nexo-privado`, abre **Environment**.
2. Busca `ADMIN_TOKEN` y pulsa el icono del **ojo** para ver su valor. Cópialo.
3. Abre en tu navegador:
   ```
   https://nexo-privado.onrender.com/admin.html
   ```
4. Pega el token y pulsa **Entrar**.

Verás las métricas (personas registradas, tests completados, invitaciones activas) y el generador de enlaces.

> Guarda ese token en tu gestor de contraseñas. Es la llave del backoffice: quien lo tenga puede crear y revocar accesos.

---

## Paso 4 — Crear el primer enlace de invitación

**Opción A — desde el backoffice (recomendada)**

1. En la tarjeta *Nuevo enlace*, escribe para quién es (ej. `María`) y cuántos usos tendrá.
2. Pulsa **Generar**.
3. Copia el enlace que aparece, con esta forma:
   ```
   https://nexo-privado.onrender.com/?invite=AbC123xyz
   ```
4. Envíalo a esa persona por el canal privado que prefieras.

**Cómo funciona el enlace**

- **Un uso** (por defecto): sirve para una persona. Si se filtra después de usarse, ya no abre nada.
- **Varios usos**: útil para una familia, un equipo o un taller.
- **Caducidad**: si indicas días, deja de funcionar en esa fecha.
- **Revocar**: en la lista de invitaciones, pulsa **Revocar** y ese enlace muere al instante.

Quien tenga el enlace entra directo: no crea contraseña ni cuenta.

---

## Paso 5 — Comprobar que todo quedó bien

Haz esta prueba con un enlace tuyo:

1. Abre el enlace `?invite=...` en una ventana de incógnito.
2. Debe aparecer la portada con el botón **Comenzar la evaluación**.
3. Completa el test (unas 20 pantallas, menos de 5 minutos).
4. Al final debe salir el informe con los **cuatro módulos** (A, B, C, D) y el botón **Descargar PDF**.
5. Vuelve al backoffice: *Tests completados* debe haber subido a 1.

Si algo de esto falla, mira la sección **Si algo no funciona** al final.

---

## Qué queda guardado y dónde

```
Navegador de la persona        Tu base de datos (Render)
────────────────────────       ────────────────────────────
copia del informe (caché)      users ....................... quién entró (sin datos clínicos)
                               user_psychometric_profiles .. puntuaciones del test
                               user_clinical_screenings .... cribados, CIFRADOS con AES-256-GCM
                               daily_progress_logs ......... ánimo, energía, racha
                               access_invites .............. los códigos que repartiste
```

- La tabla clínica guarda un **blob cifrado**; el texto de las respuestas no aparece legible en la base. La clave (`CLINICAL_ENCRYPTION_KEY`) vive solo en las variables de Render.
- **Si pierdes esa clave, los datos clínicos no se pueden recuperar.** Guárdala en tu gestor de contraseñas.
- El sitio privado **no** envía nada a Google, Meta ni TikTok. Los eventos comerciales son genéricos y no llevan datos de salud.

---

## Mantenimiento: lo que de verdad importa

**La versión gratuita de Render “duerme”.** Si nadie entra durante ~15 minutos, el servicio se apaga. La primera visita después tarda **30–60 segundos** en cargar (verás una pantalla de espera de Render). Es normal, no está roto. Las visitas siguientes van rápido.

| Quiero… | Cómo |
|---|---|
| Cambiar textos o el motor | Editar en el repositorio y hacer *push*: Render reconstruye solo |
| Crear otro enlace | Backoffice → *Nuevo enlace* → copiar |
| Cortar el acceso a alguien | Backoffice → **Revocar** ese enlace |
| Ver cuántas personas han hecho el test | Backoffice → tarjeta de métricas |
| Ver mis datos crudos | Render → `nexo-db` → **Connect** → *PSQL command* |
| Que no se duerma nunca | Cambiar el plan del servicio a **Starter** (unos 7 USD/mes) |

**Copias de seguridad.** El plan gratuito de Render no incluye respaldos automáticos de la base. Si vas a usarlo con personas reales, activa el plan de pago de `nexo-db` (incluye copias) o exporta de vez en cuando desde la consola PSQL:

```sql
COPY (SELECT * FROM user_psychometric_profiles) TO STDOUT WITH CSV HEADER;
```

---

## Si algo no funciona

| Síntoma | Qué mirar |
|---|---|
| La página tarda mucho la primera vez | Es el “despertar” del plan gratuito. Espera un minuto y recarga |
| “Ese enlace no es válido” | El código se copió incompleto o ya se usó. Genera uno nuevo |
| “Ese enlace ya alcanzó su número máximo de usos” | Era de un solo uso y ya se usó. Crea otro |
| El backoffice dice “Token de administración inválido” | Copia `ADMIN_TOKEN` otra vez desde Render → Environment |
| Error 502 al abrir | El servicio está arrancando o se cayó: Render → `nexo-privado` → **Logs**. Busca líneas que empiecen por `[boot]` |
| El enlace de invitación sale con `localhost` | Falta el Paso 2 (`PUBLIC_BASE_URL`) |

Los registros útiles del arranque se ven así:

```
[db] PostgreSQL conectado
[nexo] Escuchando en http://0.0.0.0:10000 (producción)
[nexo] Acceso libre: no — requiere invitación
[boot] Enlace de acceso inicial: https://tu-sitio/?invite=...
```

Si ves `[wait-db] La base no respondió…`, la base aún estaba despertando: Render reintenta solo.

---

## Alternativas a Render (si algún día quieres mudarte)

El proyecto ya está preparado para los tres:

- **Railway** (<https://railway.app>): *New Project → Deploy from GitHub repo* → añade PostgreSQL → copia `DATABASE_URL` a las variables. Comando de arranque: ver `package.json` (`release` y `start`).
- **Fly.io**: usa el `Dockerfile` incluido (`fly launch` detecta el `fly.toml` que puedes crear después). Necesita `DATABASE_URL` apuntando a una base Postgres de Fly o externa.
- **Tu propio servidor / Docker Compose**: `docker compose up` con el archivo incluido (levanta app + PostgreSQL con volúmenes).

En los tres casos, el arranque aplica el esquema y la semilla solo. Las variables obligatorias son las mismas: `DATABASE_URL`, `SESSION_SECRET`, `CLINICAL_ENCRYPTION_KEY`, `ADMIN_TOKEN`, `PUBLIC_BASE_URL`.

---

## Comprobación técnica (opcional)

Si en algún momento quieres verificar el despliegue completo sin tocar la interfaz:

```bash
cd psicobiosocial
npm run release            # espera la base, aplica esquema y semilla
npm run smoke              # 26 comprobaciones sobre la app real
```

`npm run smoke` levanta el servidor contra la base configurada y verifica la puerta de invitación, el envío del test, el cifrado de la tabla clínica, la racha, el aislamiento entre personas y los archivos estáticos.

---

*Documento en español, escrito para hacerse una vez y no volver a mirarlo. Si algo aquí no coincide con lo que ves en Render, manda captura de la pantalla de Logs y lo ajustamos.*
