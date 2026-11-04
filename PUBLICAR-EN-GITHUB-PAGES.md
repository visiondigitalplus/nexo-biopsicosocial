# Publicar la app como sitio web en GitHub (gratis)

La app ya está compilada como **sitio estático**: no necesita servidor ni base de datos.
Todo el cálculo (los 18 ítems, los dos motores y el informe de 4 módulos) ocurre dentro
del navegador de quien la usa.

---

## Opción rápida: un solo archivo

1. Descarga de tu espacio de trabajo el archivo **`nexo-app-standalone.html`**.
2. Crea un repositorio **público** llamado, por ejemplo, `nexo-biopsicosocial`.
3. Dentro del repo, pulsa **Add file → Upload files** y sube ese único archivo.
4. **Renómbralo a `index.html`** (o súbelo ya renombrado): GitHub Pages muestra el
   `index.html` como página de inicio.
5. Ve a **Settings → Pages**.
   - *Source*: **Deploy from a branch**
   - *Branch*: **main** y carpeta **/ (root)**
   - **Save**
6. Espera 1-2 minutos y recarga esa misma página: arriba aparecerá tu dirección:

   ```
   https://TU-USUARIO.github.io/nexo-biopsicosocial/
   ```

Listo: la app queda visible como sitio web, para cualquiera con ese enlace.

---

## Opción recomendada: el proyecto completo (con la carpeta `docs/`)

Así subes también el código legible, el servidor con PostgreSQL y las pruebas.

1. Descarga **`nexo-biopsychosocial.zip`** y descomprímelo.
2. Crea el repositorio **público** en GitHub.
3. Sube **todo el contenido** de la carpeta `psicobiosocial`
   (arrastrando en *Add file → Upload files*, o con GitHub Desktop).
4. **Settings → Pages**
   - *Source*: **Deploy from a branch**
   - *Branch*: **main**, carpeta **/docs**
   - **Save**
5. Tu web queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`

> La carpeta `docs/` ya viene compilada. Si cambias el código, ejecuta
> `npm run build:static` y vuelve a subir.

---

## Preguntas frecuentes

**¿Dónde quedan los datos de quien hace el test?**
En su propio navegador (`localStorage`). No hay servidor, no hay base de datos y no se
envía nada a terceros. Si borra los datos del navegador, pierde su informe.

**¿Sirve para uso profesional con pacientes?**
Para eso usa la versión con servidor (la del `npm start`), que sí tiene cuentas,
invitaciones privadas, base de datos PostgreSQL y la tabla clínica cifrada.

**¿Puedo poner mi propio dominio?**
Sí: en *Settings → Pages → Custom domain*.

**¿Y si quiero la versión privada por invitación, en internet?**
Ese caso requiere un servicio que ejecute Node (Render, Railway, Fly.io). Se despliega
desde el mismo repositorio; dime y te preparo los archivos de despliegue.

**¿Puedo actualizar el sitio después?**
Sí: cambia lo que quieras, corre `npm run build:static`, y sube los cambios. GitHub Pages
se actualiza solo en un minuto.
