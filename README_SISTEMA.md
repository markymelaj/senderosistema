# Senderos de Libertad - web + sistema

## Rutas

- Web pública: `/`
- Sistema interno: `/sistema/`
- Portal de pacientes/familiares: `/portal/`

La web pública mantiene su contenido institucional. Desde el menú y el inicio se accede al portal y al sistema interno.

## Variables en Vercel

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
ENABLE_DEMO_SETUP=true
```

`SUPABASE_SERVICE_ROLE_KEY` se usa solo en funciones server-side para crear credenciales desde el panel y preparar accesos demo.

## Supabase SQL Editor

Ejecutar en este orden:

1. `supabase/sql/001_schema.sql`
2. `supabase/sql/002_seed_demo.sql`

Para borrar los datos de prueba antes de iniciar la operación real:

3. `supabase/sql/003_cleanup_demo.sql`

## Accesos demo

Después de ejecutar los SQL y desplegar en Vercel:

1. Entrar a `/sistema/`.
2. Presionar `Preparar accesos demo`.
3. Ingresar con uno de estos usuarios:

| Perfil | Email | Contraseña |
|---|---|---|
| Dirección | direccion@senderos.demo | Senderos2026! |
| Profesional | profesional@senderos.demo | Senderos2026! |
| Paciente | paciente@senderos.demo | Senderos2026! |
| Auditoría | auditoria@senderos.demo | Senderos2026! |

El mismo botón está disponible en `/portal/` para facilitar la presentación.

## Qué datos demo quedan cargados

- Programas: prevención, orientación/tratamiento, acompañamiento familiar, reinserción social/laboral y programa online.
- Profesionales: psiquiatría, psicología, trabajo social, asistencia terapéutica, nutrición, musicoterapia, educación física, asesoría legal y voluntariado.
- Pacientes ficticios con turnos, programas, documentos, una solicitud de portal y movimientos administrativos de prueba.

## Operación desde el sistema

Desde `/sistema/` se puede:

- dar de alta pacientes;
- asignar programa inicial;
- asignar profesional responsable;
- crear acceso al portal;
- dar de alta profesionales;
- crear acceso al sistema para profesionales;
- agendar turnos;
- registrar evolución clínica;
- cargar documentos;
- liberar documentos al portal;
- registrar movimientos financieros;
- revisar auditoría.

## Auditoría sin historia clínica confidencial

El usuario de auditoría puede revisar actividad, pacientes, agenda, profesionales y programas. No tiene acceso al módulo de historia clínica ni a documentos privados clínicos.

Los perfiles clínicos y de coordinación sí pueden registrar y consultar información clínica según permisos.

## Imagen de familias

La imagen de familias queda tomada desde la URL indicada por el cliente: https://www.magnific.com/es/fotos-vectores-gratis/manos-familia
