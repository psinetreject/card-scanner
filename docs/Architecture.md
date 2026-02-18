# Architecture Overview

## Central DB is authoritative
Canonical entities (`cards`, `prints`, `aliases`, images metadata) are cloud-owned and versioned.

## Local DB partitions
- `cache_*`: mirrored canonical data
- `user_*`: collection/scans/settings
- `outbox_*`: queued proposals

## Moderation-only canonical writes
Scanning client submits proposals only. Moderators/admins accept/reject via dashboard.
Accepted proposals produce version bumps and audit entries.

## RBAC
- `viewer`: read public card data
- `contributor`: submit proposals
- `moderator`: review proposals, accept/reject
- `admin`: moderator powers + direct editor + rollback

## Integrity protections
- Validation (name/type required, setCode format, ATK/DEF range, level range)
- Rate limiting proposals per device
- Reputation heuristic (high rejection contributors flagged)
- Diff-based audit trail and rollback history
- Soft-delete-ready canonical records (`deprecatedAt`)

## Sync loop
1. Pull canonical updates
2. Upload outbox proposals
3. Moderator approval/rejection
4. Next pull returns canonical version increments
