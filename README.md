# LemiCloud

CDN storage minimalista. Vanilla JS + Node.js. Archivos en GitHub (chunked 3MB), metadatos en SQLite.

## Stack
- Node.js puro (sin frameworks)
- better-sqlite3 (metadatos)
- file-type (detección de extensión por magic bytes)
- GitHub Contents API (almacenamiento)

## Features
- Subida por archivo (multipart o raw body)
- Subida por URL remota
- Chunking automático (3MB) en 4 repos round-robin
- Detección real de extensión si el archivo no la tiene
- URLs proxy cortas: `/p/<id>` (302 → `/p/<id>/<name>.<ext>`)
- Sin límite de tamaño (chunking interno, una sola llamada HTTP)
- Galería con preview real (img/video/audio/pdf/texto/otros)
- Tema claro/oscuro
- Apartado docs con ejemplos de API
- Layout app con tabbar (inicio / galería / docs)

## Variables de entorno (REQUERIDAS para producción)
- `CDN_GITHUB_TOKEN` o `GITHUB_TOKEN` — token de GitHub con acceso a los repos de almacenamiento
- `GITHUB_METADATA_REPO` (default: `adonix063/files`)
- `GITHUB_METADATA_PATH` (default: `metadata/db.json`)
- `GITHUB_BRANCH` (default: `main`)
- `PORT` (default: `3000`)

### Deploy en Vercel
1. Importar el repo en vercel.com
2. Setear env var `CDN_GITHUB_TOKEN` con un token de GitHub (scope `repo`)
3. Deploy

## API
- `POST /api/upload` — multipart con `file=...` o raw body con `?name=archivo.ext`
- `POST /api/upload-url` — `{ "url": "https://..." }`
- `GET /api/files` — lista todos
- `GET /api/stats` — `{ files, size }`
- `GET /api/file/:id` — detalle
- `DELETE /api/file/:id` — elimina
- `GET /p/:id` — 302 → `/p/:id/:name.:ext`
- `GET /p/:id/:name` — archivo binario

## Iniciar
```bash
npm install
npm start
```
