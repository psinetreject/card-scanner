# Yu-Gi-Oh! Card Scanner MVP (Offline-First + Centralized Sync + Moderation + Consensus + Draft Publishing)

A React + Vite + TypeScript prototype for scanning Yu-Gi-Oh! cards with local-first operation, moderated central sync, consensus scoring, and draft-based publishing.

## Login + Test Accounts (MVP)
The app has a dedicated `/login` page and all main routes are auth-gated.

### Test accounts
- Admin: `admin / admin123` (role: `admin`)
- Moderator: `mod / mod123` (role: `moderator`)
- User: `user / user123` (role: `contributor`)
- Guest: `guest / guest` (role: `guest`, read-only for sync writes)

Manual login and one-click test buttons are both available.

## Routes
- Public: `/login`
- Authenticated: `/scan`, `/results/:scanId`, `/collection`, `/sync`, `/data`, `/settings`
- Role-protected: `/admin/*` (moderator/admin)

## Offline-first data model
- Canonical cache: `cache_*`
- User data: `user_*`
- Outboxes:
  - `outbox_proposals`
  - `outbox_observations`
  - `outbox_drafts`

## Consensus scoring (MVP)
- Observations grouped by `(targetId + fieldPath + valueNorm)`.
- Weight:
  - `(0.5 + 0.5*ocrConfidence) * (0.6 + 0.4*captureQualityScore) * (0.5 + 0.5*reputationScore)`
- `consensusScore = winningValueWeight / totalWeight`
- Auto-accept claim if:
  - `consensusScore >= 0.85`
  - `consensusCount >= 3`
  - `disagreementCount <= 1`

## Draft publishing flow
- Low-confidence/edited scans can create drafts.
- Drafts are uploaded to moderation queue and never directly mutate canonical data.
- Moderator/Admin can review, edit payload, publish/reject/request-changes.
- Publish writes canonical updates (with validation + version bump) and emits publish events.

## Dev scripts
```bash
npm run dev
npm run dev:lan
npm run dev:lan:5174
npm run preview:lan
```

## Test on Phone (LAN)
1. Start LAN server:
   ```bash
   npm run dev:lan
   ```
2. Find machine LAN IP (examples):
   - macOS/Linux: `ip a` or `ifconfig`
   - Windows: `ipconfig`
3. On phone (same Wi-Fi), open:
   - `http://<LAN-IP>:5173`

### Mobile camera notes
- Grant camera permission in browser settings.
- Some mobile browsers require HTTPS for camera access on non-localhost URLs.
- If camera fails, test another browser (Chrome/Safari/Firefox mobile differences).

### Firewall notes
- Open local firewall port **5173** for LAN only.
- Do **not** port-forward router/NAT.
- Keep testing LAN-only, not internet-exposed.

## Optional local HTTPS setup (recommended for mobile camera)
You can run Vite with local certs (e.g., mkcert):
1. Generate local cert/key via mkcert.
2. Configure `vite.config.ts` `server.https` with those files.
3. Run LAN dev server and open `https://<LAN-IP>:5173`.

(Use local dev certs only; no paid cert required.)

## API integration targets
- `GET /sync/pull`
- `POST /proposals`
- `POST /observations`
- `POST /drafts`
- `GET /snapshot/latest`
