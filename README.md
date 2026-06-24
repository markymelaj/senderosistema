# Fundación Senderos de Libertad - Web + Sistema

Proyecto integrado para presentar la web institucional y un sistema interno clínico-administrativo conectado a Supabase.

## Rutas principales

- `/` Web institucional.
- `/sistema/` Sistema interno para dirección, profesionales, administración y auditoría.
- `/portal/` Portal para pacientes y familiares autorizados.

## Estado actual

La web pública conserva su estructura original. El sistema se agregó en rutas separadas para no interferir con la página institucional.

Incluye:

- Login con Supabase Auth.
- Datos demo cargables por SQL.
- Creación de usuarios demo desde la app.
- Alta de pacientes desde el admin.
- Alta de profesionales desde el admin.
- Creación de credenciales para pacientes y profesionales desde el admin.
- Agenda y turnos.
- Historia clínica básica.
- Documentos y liberación a portal.
- Programas terapéuticos.
- Finanzas básicas.
- Auditoría operativa.
- Perfil auditor con acceso limitado: puede controlar operación y trazabilidad, sin acceder a historia clínica ni documentos clínicos confidenciales.

## Instalación local

```bash
npm install
cp .env.example .env.local
```

Completar `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
ENABLE_DEMO_SETUP=true
```

Para correr localmente se puede usar Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

## Supabase

Ejecutar en Supabase SQL Editor:

1. `supabase/sql/001_schema.sql`
2. `supabase/sql/002_seed_demo.sql`

Para limpiar datos demo cuando se pase a operación real:

3. `supabase/sql/003_cleanup_demo.sql`

## Usuarios demo

Después de desplegar y ejecutar SQL:

1. Entrar a `/sistema/`.
2. Presionar `Preparar accesos demo`.
3. Ingresar con:

| Perfil | Email | Contraseña |
|---|---|---|
| Dirección | direccion@senderos.demo | Senderos2026! |
| Profesional | profesional@senderos.demo | Senderos2026! |
| Paciente | paciente@senderos.demo | Senderos2026! |
| Auditoría | auditoria@senderos.demo | Senderos2026! |

## Variables en Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
ENABLE_DEMO_SETUP=true
```

En producción real cambiar:

```env
ENABLE_DEMO_SETUP=false
```

## Archivos principales

- `index.html`: web institucional.
- `styles.css`: estilos de la web pública.
- `script.js`: comportamiento simple de la web pública.
- `assets/familia-acompanamiento.png`: imagen del bloque Acompañamiento familiar.
- `sistema/index.html`: entrada del sistema interno.
- `sistema/app.js`: lógica del sistema interno.
- `sistema/styles.css`: estilos del sistema interno.
- `portal/index.html`: entrada del portal.
- `portal/app.js`: lógica del portal.
- `portal/styles.css`: estilos del portal.
- `api/create-user.js`: creación segura de usuarios desde el admin.
- `api/update-user-access.js`: activación/desactivación y cambio de contraseña.
- `api/init-demo-users.js`: creación de usuarios demo.
- `api/public-config.js`: expone variables públicas al frontend.
- `supabase/sql/001_schema.sql`: estructura completa.
- `supabase/sql/002_seed_demo.sql`: datos demo.
- `supabase/sql/003_cleanup_demo.sql`: limpieza de datos demo.
- `docs/CODEX_HANDOFF.md`: documentación para continuar el desarrollo.
