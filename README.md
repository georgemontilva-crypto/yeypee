# YEYPEE

Sitio web oficial de la marca de figuras coleccionables **YEYPEE** (blind box, estilo Pop Mart): presenta las colecciones, los personajes, el secret rare, dónde comprar (retail y online) y captura leads de coleccionistas.

El sitio arranca **vacío**: todo el contenido (colecciones, personajes, productos, videos, imágenes, noticias, partners y tiendas) se crea desde el panel de administración propio, y cada sección del sitio lee su contenido de la base de datos mostrando un estado vacío elegante cuando no hay datos.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Estilos | Tailwind CSS (tokens personalizados) |
| Routing | React Router v6 |
| Backend | Node.js + Express (TypeScript), mismo repo |
| ORM | Drizzle ORM |
| Base de datos | MySQL |
| Auth | Propia: bcrypt + JWT en cookie `httpOnly` + tabla de sesiones revocables |
| Email | Resend (verificación de cuenta y bienvenida al club) |
| Media | Cloudflare R2 (S3-compatible, presigned URLs, el archivo nunca pasa por el servidor) |
| Deploy | Railway |

## Estructura del repo

```
/
├── client/              # React + Vite
│   └── src/
│       ├── pages/       # páginas públicas + admin/
│       ├── components/
│       ├── styles/
│       └── lib/
├── server/              # Express + Drizzle
│   └── src/
│       ├── routes/      # públicas, auth y admin/
│       ├── db/          # schema.ts, seed.ts, client.ts
│       ├── middleware/   # auth, audit
│       ├── services/    # email (Resend), r2
│       └── index.ts
├── drizzle/             # migraciones generadas por drizzle-kit
├── tailwind.config.js
├── drizzle.config.ts
├── railway.json
├── .env.example
└── package.json         # dev, build, start, db:push, db:seed
```

En producción, Express sirve el build estático de Vite (`client/dist`) **y** las rutas `/api/*` desde el mismo proceso, escuchando en `process.env.PORT` en `0.0.0.0`.

## Requisitos

- Node.js 20+ (recomendado 22)
- MySQL 8+ (local o Railway)
- pnpm o npm (el repo usa npm en los scripts; pnpm es compatible)

## Instalación local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Edita .env: DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
# (puedes dejar RESEND_API_KEY y las variables de R2 vacías para probar localmente)

# 3. Crear la base de datos y el esquema
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS yeypee CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
npm run db:push

# 4. Crear el administrador inicial y los ajustes del sitio
npm run db:seed

# 5. (Opcional) Poblar la base con contenido de ejemplo:
#    3 colecciones, 10 personajes, noticias, productos y tiendas
npm run db:seed:demo
```

### Modos de ejecución

```bash
# Desarrollo: Vite en el puerto 5173 (proxy a la API) + server en 3000
npm run dev

# Producción: build completo (cliente + servidor)
npm run build

# Levantar el sitio completo en un solo proceso
npm start
```

El health check está en `GET /api/health`.

## Credenciales de prueba (tras db:seed)

El admin inicial se crea con `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env`. En Railway configúralas como variables del servicio **antes** de correr el seed, o créalas luego con `db:seed` apuntando a la BD de Railway.

## Despliegue en Railway

1. Crea un servicio nuevo en Railway desde este repositorio (GitHub).
2. Añade el **plugin MySQL** de Railway y copia la `DATABASE_URL` que genera.
3. En *Variables*, agrega:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | La del plugin MySQL |
| `JWT_SECRET` | Salida de `openssl rand -hex 32` |
| `RESEND_API_KEY` | Tu API key de Resend (opcional: sin ella, los emails se registran en el log del servidor) |
| `MAIL_FROM` | `hello@yeypee.com` (o el dominio verificado en Resend) |
| `APP_URL` | La URL pública que asigne Railway, p. ej. `https://yeypee.up.railway.app` |
| `NODE_ENV` | `production` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Credenciales de tu bucket Cloudflare R2 |
| `R2_BUCKET` | `yeypee-media` (o el nombre de tu bucket) |
| `R2_ENDPOINT` | `https://<account_id>.r2.cloudflarestorage.com` |
| `R2_PUBLIC_URL` | El dominio público de tu bucket, p. ej. `https://media.yeypee.com` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Credenciales del administrador inicial |
| `ENABLE_CHECKOUT` | `false` (el checkout queda pendiente de pasarela de pago) |

4. Despliega. Si el repo no tiene deploy automático, corre manualmente en la consola del servicio:

```bash
npm run db:push   # aplica el esquema a la BD de Railway
npm run db:seed   # crea el admin inicial
```

Con el `railway.json` incluido, Railway usa Nixpacks con el comando `npm run build` y el health check `/api/health` está configurado.

### Cómo entran las órdenes

El módulo de órdenes funciona en dos modos:

| Modo | Requisito | Descripción |
|---|---|---|
| **Manual (siempre activo)** | `ENABLE_CHECKOUT` en cualquier valor | Desde **Admin → Orders → New Order** se crean órdenes por venta directa o wholesale. El admin las actualiza de estado, añade notas y número de guía; al marcar `shipped` se envía el email de envío (si Resend está configurado). |
| **Checkout público** | `ENABLE_CHECKOUT=true` | La tienda habilita el flujo de compra del sitio. Con el flag en `false` (valor por defecto), las compras se canalizan a los retailers externos (Store Locator + redirección a tiendas online). |

### Nota sobre el media

Sin credenciales de R2, el sitio funciona con **placeholders locales** organizados en el cliente y el servidor cae a ellos cuando una entidad no tiene un asset asignado. Sube los archivos definitivos desde el panel de administración (**Media** → subir a R2) y asócialos a las entidades con el **Media Picker**.

## Panel de administración

Acceso en `/admin` (solo usuarios con `role = admin`):

1. **Dashboard** — KPIs y últimas órdenes.
2. **Órdenes** — lista con filtros, detalle, cambio de estado, notas, guía de envío, export CSV y creación manual.
3. **Clientes** — usuarios registrados, roles, activación/desactivación, detalle con órdenes y progreso.
4. **Leads** — suscriptores del Collector Club, export CSV.
5. **Media** — biblioteca R2: subida con presigned URLs, filtros, edición y borrado seguro.
6. **Colecciones** — CRUD completo + reordenamiento.
7. **Personajes** — CRUD con ficha (candy, best friend, birthday), 3 vistas (front/side/back) y rarezas.
8. **Productos** — CRUD con precio, stock, alertas de stock bajo y galería.
9. **Noticias, Retail Partners y Tiendas** — CRUD completo; tiendas con importación masiva por CSV.
10. **Settings** — configuración del sitio (hero, featured collection, textos estructurales).

Toda acción de escritura queda registrada en `admin_audit_log`.

## Seguridad

- Contraseñas con bcrypt (cost 12), mínimo 8 caracteres.
- JWT firmado en cookie `httpOnly; secure; sameSite=lax`, 7 días, con sesión espejo revocable.
- Rate limiting en `/api/auth/*` y `/api/leads`.
- Validación de todos los inputs con Zod.
- Helmet + CORS restringido a `APP_URL`.
- `password_hash` y tokens nunca se exponen en respuestas.
- Credenciales de R2 solo en el backend; las presigned URLs se firman en el servidor.

## Convenciones de contenido

- Todo string del mockup que sea contenido (nombres de colecciones, personajes, noticias…) sale de la base de datos. Los únicos textos fijos son los estructurales de la interfaz (`EXPLORE THE WORLDS`, `MEET THE CHARACTERS`, `FEATURED COLLECTION`, `SECRET RARE`, etc.).
- Raridades de personajes: `common`, `rare`, `ultra_rare`, `secret_rare`.
- Los personajes y colecciones usan referencias a `media_assets` (imágenes de R2) y caen a placeholder local cuando no hay asset asignado.
