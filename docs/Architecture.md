# Architecture Overview (Visual-First Pivot)

## Core principle
- Central DB authoritative.
- Client is offline-first mirror + local user data + outboxes.
- Canonical writes are moderation-gated.

## Visual-first recognition
Primary identification is local visual matching against `cache_image_features`.
OCR is secondary for validation/disambiguation only.

### Local matching pipeline
1. Capture and preprocess frame.
2. Generate full-card + art-box crops.
3. Compute perceptual hash-like features.
4. Compare against local cached features (Hamming distance).
5. Re-rank using weighted full/art scores.
6. Apply OCR assist only after visual shortlist is built.

## Data model additions for visual matching
- `cache_image_features`
- `cache_feature_packs`

## Moderation publishing additions
- `outbox_drafts` on client
- central `drafts` + `publish_events`
- moderator publish path writes canonical records with validation + version bump

## Sync loop
1. Pull canonical + image features + consensus + draft status updates.
2. Upload proposals.
3. Upload observations.
4. Upload drafts.
5. Consume moderation outcomes in next pull.

## Scalability path
- Web MVP: hash-based matching + pack management.
- Native Android: OpenCV/NN feature extraction, richer descriptors, faster re-ranking.
