# AREQUIPA C5 — Centro de operaciones

Aplicación web para un centro de operaciones de seguridad ciudadana de la provincia de Arequipa.
Frontend y backend van en un solo proyecto Next.js, listo para Vercel.

## Qué hace

| Módulo | Función |
|---|---|
| Operaciones | Mapa de Arequipa en vivo, cola de incidentes por prioridad, registro, despacho de unidades, bitácora por incidente, aviso sonoro de incidentes nuevos |
| Modo unidad (`/unidad`) | Para el celular del efectivo: comparte su GPS real, ve el incidente asignado, marca «en camino», «en sitio» y cierra |
| Historial | Búsqueda con filtros y exportación a CSV |
| Unidades | Registro de unidades PNP, Serenazgo, Bomberos y SAMU; estado y posición |
| Cámaras | Registro en el mapa y visor de transmisiones HLS, MJPEG o visor web |
| Estadísticas | Totales, tiempos de respuesta, por tipo, distrito y hora, mapa de calor |
| Auditoría | Registro de cada acción con usuario, fecha e IP |
| Usuarios | Roles: administrador, supervisor, operador, unidad de campo |

En producción: **https://c5fz.vercel.app**

### Modo demostración

Al abrir la aplicación sin iniciar sesión se muestra Operaciones con emergencias, unidades y cámaras simuladas (códigos `SIM-…`).

- Puedes registrar incidentes, despachar unidades, marcarlas en camino o en sitio, cerrar, cancelar y anotar en la bitácora.
- Las unidades simuladas reportan posición y las que van en camino se acercan al incidente.
- Todo se guarda solo en el almacenamiento local de ese navegador. Nada llega a la base de datos ni a los servicios de emergencia.
- Mientras la página está cerrada, el tiempo de la simulación se pausa.
- **Reiniciar demo** borra lo que agregaste y restaura los ejemplos.
- Los demás módulos (Historial, Unidades, Cámaras, Estadísticas, Auditoría, Usuarios) usan datos reales y piden **Iniciar sesión**.

Con una sesión iniciada, la consola usa los datos reales. Las API siguen exigiendo sesión, así que el modo demostración no expone ningún dato real.

## Lo que NO incluye (requiere convenios o equipos externos)

- Conexión con la central 105 de la PNP, el 116 de Bomberos o el 106 del SAMU.
- Consulta a RENIEC, SUNARP o requisitorias.
- Cámaras RTSP directas: necesitan un servidor de video (por ejemplo MediaMTX) que publique HLS por HTTPS.
- Analítica de video o IA.

## Arquitectura

- **Next.js 16 (App Router) + React 19 + TypeScript**: páginas en `app/`, API en `app/api/`.
- **PostgreSQL**: Neon en Vercel (`DATABASE_URL`). En tu PC, sin `DATABASE_URL`, usa una base embebida en `.data/`.
  Las tablas se crean solas en el primer arranque (`lib/db.ts`).
- **Sesiones**: cookie httpOnly firmada (JWT HS256, 12 h), contraseñas con bcrypt, límite de intentos de ingreso.
- **Tiempo real**: la consola consulta el estado cada 4 s. Vercel no mantiene WebSockets en sus funciones, por eso se usa consulta periódica.
- **Mapa**: Leaflet + OpenStreetMap. Direcciones con Nominatim.

## Probar en tu PC

Necesitas Node.js 20 o superior.

```
npm install
npm run dev
```

Abre http://localhost:3000 para ver el modo demo sin iniciar sesión. Para usar la consola con datos reales, copia `.env.example` a `.env.local`, configura ADMIN_EMAIL, ADMIN_PASSWORD y SESSION_SECRET, y luego ingresa con esas credenciales.

## Subir a Vercel

Sigue `DEPLOY.md`.

## Antes de usarlo con datos reales

- Los mapas y la búsqueda de direcciones usan los servidores públicos de OpenStreetMap, pensados para uso moderado.
  Para operación continua contrata un proveedor de mapas (MapTiler, Stadia, Mapbox) y cambia la URL en `components/MapView.tsx`.
- El sistema guarda datos personales (informantes, teléfonos). Su uso por una entidad está sujeto a la Ley 29733 de Protección de Datos Personales.
- Usa un plan de pago de Vercel y de Neon: los planes gratuitos no están pensados para uso institucional y limitan la base de datos.
