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
npm run dev:lan:https
npm run dev:lan:5174
npm run preview:lan
```

## Test on Phone over LAN (HTTPS)
1. Start LAN HTTPS dev server:
   ```bash
   npm run dev:lan:https
   ```
2. Find your computer LAN IP:
   - macOS/Linux: `ip a` or `ifconfig`
   - Windows: `ipconfig`
3. Open on phone (same Wi-Fi):
   - `https://<LAN-IP>:5173`
4. Allow camera permission when prompted.

### mkcert local certificate setup (recommended)
Vite dev server is configured for HTTPS and can use local cert files from `certs/`.

Generate certs (example):
```bash
mkcert -install
mkdir -p certs
mkcert -key-file certs/dev-key.pem -cert-file certs/dev-cert.pem localhost 127.0.0.1 ::1 <LAN-IP>
```

If mobile shows certificate warnings, install and trust the mkcert root CA on that device.

> Note: `vite-plugin-mkcert` can also be used in environments where npm registry access allows installing it.

### Firewall & LAN safety
- Allow local firewall port `5173` on **private/LAN** profile only.
- Ensure phone and dev machine are on the same LAN/Wi-Fi.
- **Do not** port-forward router/NAT.
- This setup is for local development only (not public internet exposure).

## Practical browser CV limits
- In-browser CV/hashing is CPU-constrained and less robust on low-end devices.
- Complex feature matching (ORB/SIFT-like) is limited in pure web MVP.
- Architecture is prepared for native upgrade (OpenCV + ML Kit + faster feature extraction).

## Future native path
Keep `core` matching contracts portable; replace hashing/feature extraction with native OpenCV pipeline and keep sync/consensus/draft APIs stable.

## Camera Permissions Troubleshooting
- Open `/scan` and click **Enable Camera** to trigger browser permission prompt.
- If denied, use **Try again** after allowing Camera in site settings (lock/camera icon in address bar).
- If error says no device found, verify your device has an available camera.
- If camera is busy (`NotReadableError`), close other apps/tabs using the camera.
- If `window.isSecureContext` is false, `/scan` shows: **“Camera requires HTTPS. Use LAN HTTPS dev mode.”**
- See **Test on Phone over LAN (HTTPS)** above.
