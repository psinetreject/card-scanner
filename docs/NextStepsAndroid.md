# Next Steps for Native Android

## Camera: replace `ICameraService` web impl with CameraX
- Use CameraX Preview + ImageCapture.
- Keep interface-level parity (`start`, `capture`, `stop`).
- Implement optional torch/zoom/exposure when supported.

## OCR: replace `IOcrService` (Tesseract) with ML Kit text recognition
- Use ROI extraction for card name and set code.
- Keep output schema `{ text, name, setCode }` to avoid touching matching core.

## Storage: replace IndexedDB with Room/SQLite
- Mirror local partitions as SQLite tables:
  - `cache_cards`, `cache_prints`, `cache_aliases`
  - `user_collection`, `user_scans`
  - `outbox_proposals`, `sync_state`
- Keep schema versioning + migration scripts.

## Reuse of core matching modules
- Port current pure TypeScript matching to:
  - Kotlin implementation mirroring algorithm, or
  - shared WASM/JS engine via embedded runtime (optional)
- Keep ranking strategy identical to reduce behavioral drift across platforms.

## Snapshot format recommendation
- Prefer SQLite snapshot bundle for native production.
- Server can ship compressed `.sqlite` with canonical cache tables + metadata.
- Mobile app can import by replacing cache partition transactionally.

## Networking and sync
- Keep `ISyncService` semantics in Android (`Retrofit`/`OkHttp`):
  - pull updates (since version, paginated)
  - push proposals
  - download snapshot bundle
- Handle retries + backoff + idempotency keys for outbox submissions.
