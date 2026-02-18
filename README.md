# Yu-Gi-Oh! Card Scanner MVP (Offline-First + Centralized Sync + Moderation + Consensus)

A React + Vite + TypeScript prototype for scanning Yu-Gi-Oh! cards with local-first usage, centralized moderated sync, and crowdsourced consensus scoring.

## What this version adds
- Dedicated `/login` route + auth gating for all app routes
- Mock auth interface ready for real API auth swap (`IAuthService`)
- Role-based access model (`viewer`, `contributor`, `moderator`, `admin`)
- Proposal-only canonical write pipeline (no direct canonical writes from scanner clients)
- Observation outbox + `/observations` sync path for consensus aggregation
- Consensus model entities: `observations`, `claims`, `trust_profiles`
- Admin dashboard adds **Consensus Queue** + claim detail/evidence view
- Community verification indicators in collection UI

## Auth & routes
- Public: `/login`
- Authenticated: `/scan`, `/results/:scanId`, `/collection`, `/sync`, `/data`, `/settings`
- Role-protected: `/admin/*` for moderator/admin

## Offline-first behavior
- Canonical cache mirrors central DB in IndexedDB (`cache_*`).
- User collection/scans are local (`user_*`).
- Outboxes:
  - `outbox_proposals` for moderation proposals
  - `outbox_observations` for consensus evidence
- Sync uploads proposals to `/proposals`, observations to `/observations`, and fetches claims in pull updates.

## Consensus scoring (MVP)
- Group by `(targetId + fieldPath + valueNorm)`
- Weight:
  - `(0.5 + 0.5*ocrConfidence) * (0.6 + 0.4*captureQualityScore) * (0.5 + 0.5*reputationScore)`
- `consensusScore = winningValueWeight / totalWeight`
- Auto-accept policy:
  - `consensusScore >= 0.85 && consensusCount >= 3 && disagreementCount <= 1`

## Security model (MVP)
- Auth required for writes
- Admin routes require role checks
- OCR input treated as untrusted
- Validation + rate limiting + trust/reputation heuristics + audit logging

## API integration
- `GET /sync/pull`
- `POST /proposals`
- `POST /observations`
- `GET /snapshot/latest`
