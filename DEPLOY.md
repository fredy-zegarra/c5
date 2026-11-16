# Subir AREQUIPA C5 a Vercel

Frontend y backend se despliegan juntos: es un solo proyecto.

## 1. Subir el código a GitHub

1. Crea una cuenta en https://github.com y un repositorio **privado** llamado `arequipa-c5`.
2. En la carpeta del proyecto, abre una terminal:

```
git init
git add .
git commit -m "AREQUIPA C5"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/arequipa-c5.git
git push -u origin main
```

## 2. Crear el proyecto en Vercel

1. Entra a https://vercel.com con tu cuenta de GitHub.
2. **Add New → Project**, elige `arequipa-c5` y pulsa **Import**. Vercel detecta Next.js solo; no cambies nada.
3. Antes de pulsar Deploy, abre **Environment Variables** y agrega:

| Nombre | Valor |
|---|---|
| `SESSION_SECRET` | Una cadena aleatoria de 40 caracteres o más |
| `ADMIN_EMAIL` | Tu correo de administrador |
| `ADMIN_PASSWORD` | Una contraseña de 10 caracteres o más |
| `GEOCODER_CONTACT` | Un correo de contacto (opcional) |

4. Pulsa **Deploy**. El primer despliegue abre, pero aún no deja ingresar porque falta la base de datos.

## 3. Crear la base de datos

1. En el proyecto de Vercel: pestaña **Storage → Create Database → Neon (Postgres)**.
2. Acepta los valores por defecto y conéctala al proyecto. Vercel agrega sola la variable `DATABASE_URL`.
3. Pestaña **Deployments → ⋯ del último despliegue → Redeploy**.

## 4. Primer ingreso

1. Abre la dirección que te da Vercel (`https://arequipa-c5-xxxx.vercel.app`).
2. Ingresa con `ADMIN_EMAIL` y `ADMIN_PASSWORD`. Las tablas y el administrador se crean solos.
3. En **Usuarios** crea las cuentas del personal. En **Unidades** registra los vehículos.
4. Para cada efectivo de campo crea un usuario con rol «Unidad de campo» vinculado a su unidad; desde su celular entra a la misma dirección.

## Actualizar

Cada `git push` a `main` publica una nueva versión automáticamente.

## Si algo falla

- **«Falta DATABASE_URL»**: no conectaste la base (paso 3) o no volviste a desplegar.
- **«Falta SESSION_SECRET»**: la variable no existe o tiene menos de 32 caracteres.
- **«Aún no hay usuarios»**: faltan `ADMIN_EMAIL` / `ADMIN_PASSWORD`; agrégalas y vuelve a desplegar.
- Si olvidas la clave del administrador: borra la fila en la tabla `users` desde el panel de Neon y vuelve a desplegar; se recrea con las variables.
