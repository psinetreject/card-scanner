# Architecture Overview

## Central DB is authoritative
Canonical entities (`cards`, `prints`, `aliases`, images metadata) are cloud-owned and versioned.

## Local DB partitions
- `cache_*`: mirrored canonical data (+ claim metadata)
- `user_*`: collection/scans/settings
- `outbox_proposals`: queued moderation proposals
- `outbox_observations`: queued consensus observations

## Auth-gated client shell
- `/login` is public
- Main app routes require authenticated session
- `/admin/*` requires moderator/admin role checks

## Moderation-only canonical writes
Scanning client submits proposals and observations only.
Moderators/admins accept/reject proposals/claims; accepted writes bump canonical versions.

## Consensus model
- `observations`: independent field/value evidence submissions
- `claims`: aggregated winning-value candidates with consensus metrics
- `trust_profiles`: contributor reputation used for score weighting

### MVP policy
- one observation/principal per target+field window (24h)
- weighted consensus score with OCR + capture quality + reputation
- auto-accept high-confidence claims
- otherwise claim remains open for moderation

## Integrity protections
- Validation (name/type required, setCode format, ATK/DEF range, level range)
- Rate limiting proposals per device
- Reputation heuristic and spam controls
- Diff-based audit trail and rollback history
- Soft-delete-ready canonical records (`deprecatedAt`)

## Sync loop
1. Pull canonical updates + claim statuses
2. Upload outbox proposals
3. Upload outbox observations
4. Moderator/consensus outcomes applied to canonical DB
