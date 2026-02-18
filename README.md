# Yu-Gi-Oh! Card Scanner MVP (Visual-First Offline Matching)

This MVP now uses **image recognition/matching as primary identification** and OCR only as secondary assist.

## Recognition priority
1. **Visual match (primary)** via local cached image features (`pHash`)
2. Set code OCR (assist/validation)
3. Name OCR (assist/validation)
4. Manual confirmation / draft fallback

## Login + Test Accounts
Dedicated `/login` with manual form + one-click test logins:
- Admin: `admin / admin123`
- Moderator: `mod / mod123`
- User (contributor): `user / user123`
- Guest (read-only sync writes): `guest / guest`

## Routes
- Public: `/login`
- Authenticated: `/scan`, `/results/:scanId`, `/collection`, `/sync`, `/data`, `/settings`
- Admin/mod only: `/admin/*`

## Offline data partitions
- Canonical cache: `cache_cards`, `cache_prints`, `cache_aliases`, `cache_image_features`
- Pack metadata: `cache_feature_packs`
- User data: `user_collection`, `user_scans`
- Outboxes: `outbox_proposals`, `outbox_observations`, `outbox_drafts`

## Visual matching pipeline (MVP)
- Capture frame
- Normalize and generate:
  - full-card crop
  - art-box heuristic crop
- Compute hashes (aHash used as MVP pHash-style proxy in-browser)
- Stage A: coarse top-N by Hamming distance
- Stage B: weighted re-rank (full + art distances)
- OCR runs in parallel only to validate/disambiguate

## Draft publishing flow
- Low-confidence or edited scan results can produce draft records.
- Draft includes:
  - evidence image thumb
  - extracted OCR hints
  - computed visual hashes
  - proposed canonical payload
- Moderators can review/edit/publish/reject/request-changes.

## Feature packs (scaffold)
- Supports installed/available pack metadata.
- Sync page allows install/remove pack toggles.
- MVP ships with a small seed pack.

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
2. Find LAN IP:
   - macOS/Linux: `ip a` or `ifconfig`
   - Windows: `ipconfig`
3. Open on phone (same Wi-Fi):
   - `http://<LAN-IP>:5173`

### Mobile camera notes
- Camera permission must be granted in browser.
- Some mobile browsers require HTTPS for camera on non-localhost origins.
- Prefer HTTPS dev certs for reliability on iOS.

### Firewall & safety
- Open local firewall port 5173 for LAN only.
- Do **not** port-forward router/NAT.
- Keep testing LAN-only.

## Optional HTTPS (local-only)
Use mkcert and Vite `server.https` config with local cert/key, then open `https://<LAN-IP>:5173`.

## Practical browser CV limits
- In-browser CV/hashing is CPU-constrained and less robust on low-end devices.
- Complex feature matching (ORB/SIFT-like) is limited in pure web MVP.
- Architecture is prepared for native upgrade (OpenCV + ML Kit + faster feature extraction).

## Future native path
Keep `core` matching contracts portable; replace hashing/feature extraction with native OpenCV pipeline and keep sync/consensus/draft APIs stable.
