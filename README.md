# Yu-Gi-Oh! Card Scanner MVP (Offline-First + Centralized Sync + Moderation)

A React + Vite + TypeScript prototype for scanning Yu-Gi-Oh! cards with local-first usage and centralized moderated sync.

## What this version adds
- Role-based access model (`viewer`, `contributor`, `moderator`, `admin`)
- Token/session-based auth (mocked for MVP)
- Proposal-only write pipeline: no direct canonical writes from scanning clients
- Moderator/admin dashboard pages:
  - Pending Proposals Queue
  - Card Editor (admin only)
  - Audit Log
  - User/Device Trust View
  - Rollback / Version History
- Validation + anti-defacement controls:
  - setCode, ATK/DEF, required fields checks
  - rate limiting per device
  - low-confidence and high-rejection-rate flagging
  - soft-delete-friendly canonical schema (`deprecatedAt`)
  - version + updatedAt increment on accepted edits

## Install / Run
```bash
npm install
npm run dev
```

## Offline-first behavior
- Canonical cache mirrors central DB in IndexedDB (`cache_*`).
- User collection/scans are local (`user_*`).
- Edits/corrections are queued in `outbox_proposals`.
- Sync uploads outbox proposals to `/proposals`; moderators approve/reject before canonical changes apply.

## Security model (MVP)
- All write-like endpoints require authenticated session/token.
- Client never writes canonical tables directly.
- Admin routes protected by role checks.
- OCR is treated as untrusted input and validated in proposal moderation.

## Bundle portability
- Export/import local bundle JSON (cache only / with user data).
- Central snapshot download returns checksum metadata (placeholder signing path).

## API integration
- `HttpSyncService` expects:
  - `GET /sync/pull`
  - `POST /proposals`
  - `GET /snapshot/latest`
- Add moderator APIs matching `IModerationService` for real backend.
