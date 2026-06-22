# Fundación Senderos de Libertad — maqueta web

Maqueta institucional estática para Fundación Senderos de Libertad. No requiere base de datos ni backend para funcionar como sitio informativo.

## Archivos principales

- `index.html`: estructura completa de la web.
- `styles.css`: diseño responsive, colores, grillas y comportamiento visual.
- `script.js`: menú móvil, animaciones suaves y link de WhatsApp.
- `assets/logo-senderos.png`: logo original extraído del documento entregado.
- `assets/*-referencial.svg`: ilustraciones sobrias con texto discreto “imagen referencial”.
- `vercel.json`: configuración mínima para Vercel.

## Qué cambiar antes de publicar

1. Abrir `script.js` y reemplazar:
   ```js
   const WHATSAPP_NUMBER = '56900000000';
   ```
   por el número oficial, sin `+`, espacios ni guiones. Ejemplo Chile:
   ```js
   const WHATSAPP_NUMBER = '56912345678';
   ```

2. En `index.html`, reemplazar los correos de ejemplo:
   ```html
   contacto@senderosdelibertad.cl
   ```
   por el correo real.

3. Cuando tengan dirección, directorio, equipo, fotografías reales o datos de donación, agregarlos en las secciones correspondientes.

4. Las imágenes actuales son referenciales y están marcadas de manera discreta. Cuando existan fotos reales, reemplazar los SVG en la carpeta `assets`.

## Probar localmente

Opción simple:

1. Descomprimir el zip.
2. Abrir `index.html` en el navegador.

Opción recomendada para revisar como sitio:

```bash
cd senderos-libertad-web
python3 -m http.server 8080
```

Luego abrir:

```txt
http://localhost:8080
```

## Desplegar en Vercel con GitHub

1. Crear un repositorio nuevo en GitHub, por ejemplo `senderos-libertad-web`.
2. Subir todos los archivos de esta carpeta al repositorio.
3. Entrar a Vercel y elegir **Add New Project**.
4. Importar el repositorio desde GitHub.
5. Framework Preset: **Other**.
6. Build Command: dejar vacío.
7. Output Directory: dejar vacío o `.`.
8. Deploy.
9. Cuando la preview esté bien, agregar el dominio definitivo desde la configuración del proyecto en Vercel.

## Desplegar desde terminal con Vercel CLI

Instalar la CLI si no está instalada:

```bash
npm i -g vercel
```

Desde la carpeta del proyecto:

```bash
vercel
```

Para producción:

```bash
vercel --prod
```

## Observaciones de contenido pendiente

La maqueta queda armada con el contenido institucional base. Para cerrar una versión 100% lista para público, conviene completar:

- WhatsApp oficial.
- Correo oficial.
- Dirección o zona de atención.
- Datos legales de la fundación, si corresponde mostrarlos.
- Directorio/equipo con nombres autorizados.
- Fotografías reales de espacios o actividades.
- Datos bancarios o link de donación.
- Convenios, respaldos o instituciones asociadas.
- Política de privacidad si se recibe información sensible por formulario.
