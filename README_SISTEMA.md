# Sistema interno Senderos de Libertad

La web pública original se conserva en la raíz del proyecto.

Rutas agregadas:

- `/sistema` panel interno.
- `/portal` portal de pacientes y familiares.
- `/api/public-config` configuración pública de Supabase.
- `/api/create-user` creación segura de credenciales desde el panel.
- `/api/update-user-access` activación, bloqueo y cambio de contraseña.

## Instalación Supabase

Ejecutar en SQL Editor:

1. `supabase/sql/001_schema.sql`
2. `supabase/sql/002_seed_demo.sql`

Para eliminar los datos de prueba:

3. `supabase/sql/003_cleanup_demo.sql`

## Variables en Vercel

```env
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
```

`SUPABASE_SERVICE_ROLE_KEY` se usa solo en funciones de servidor para crear usuarios. No debe ir en archivos públicos.

## Primer administrador

1. Crear un usuario desde Supabase Authentication.
2. Entrar a `/sistema`.
3. Iniciar sesión.
4. Presionar el botón para crear el primer administrador.

## Alta de pacientes

Desde `/sistema > Pacientes`:

- cargar la ficha;
- asignar programa inicial;
- asignar profesional responsable;
- opcionalmente crear acceso al portal en el mismo formulario.

## Alta de profesionales

Desde `/sistema > Profesionales`:

- cargar ficha profesional;
- indicar cargo, especialidad y matrícula;
- opcionalmente crear acceso interno con rol y contraseña inicial.

## Portal

Los pacientes y familiares entran por `/portal`.

Solo ven turnos, solicitudes y documentos liberados desde el sistema interno.
