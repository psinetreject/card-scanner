# Architecture Overview

## Central DB is authoritative
Canonical entities (`cards`, `prints`, `aliases`) are cloud-owned and versioned.

## Auth + route gating
- `/login` is public
- Main routes require authenticated session
- `/admin/*` requires moderator/admin role checks

## Local DB partitions
- `cache_*`: canonical mirror + consensus/draft status metadata
- `user_*`: local collection/scans/settings
- `outbox_proposals`: moderated edit proposals
- `outbox_observations`: consensus evidence submissions
- `outbox_drafts`: publishable card/print drafts from uncertain scans

## Write safety model
- No direct canonical writes from scanner flow.
- Contributors submit observations/proposals/drafts.
- Moderators/Admin review and publish.

## Consensus entities
- `observations`
- `claims`
- `trust_profiles`

## Draft publishing entities
- `drafts`
- `publish_events`

## Sync loop
1. Pull canonical + claim + draft status updates.
2. Upload proposals.
3. Upload observations.
4. Upload drafts.
5. Moderator/admin decisions become visible on next sync.

## Role policy
- Guest: local scanning/collection only (no sync writes)
- Contributor: can submit observations/proposals/drafts
- Moderator/Admin: can review claims/drafts and publish
- Admin: rollback and privileged canonical management
