export type Role = 'guest' | 'viewer' | 'contributor' | 'moderator' | 'admin';

export type ConsensusMeta = {
  consensusScore: number;
  consensusCount: number;
  disagreementCount: number;
  lastComputedAt: string;
};

export type Card = {
  id: string;
  name: string;
  type: string;
  attribute?: string;
  level_rank_link?: number;
  atk?: number;
  def?: number;
  text: string;
  archetype?: string;
  imageKey?: string;
  updatedAt: string;
  version: number;
  deprecatedAt?: string;
  consensus?: Record<string, ConsensusMeta>;
};

export type Print = {
  printId: string;
  cardId: string;
  setCode: string;
  setName: string;
  rarity?: string;
  edition?: string;
  language: string;
  releaseDate?: string;
  updatedAt: string;
  version: number;
  deprecatedAt?: string;
  consensus?: Record<string, ConsensusMeta>;
};

export type Alias = {
  aliasId: string;
  cardId: string;
  aliasText: string;
  locale: string;
  updatedAt: string;
  version: number;
};

export type UserCollectionEntry = {
  entryId: string;
  cardId: string;
  printId?: string;
  quantity: number;
  condition?: string;
  language?: string;
  acquiredAt?: string;
  notes?: string;
};

export type UserScan = {
  scanId: string;
  timestamp: string;
  extractedName?: string;
  extractedSetCode?: string;
  imageThumb?: string;
  confidence: number;
  matchedCardId?: string;
  matchedPrintId?: string;
  notes?: string;
};

export type ProposalType = 'new_card' | 'edit_card' | 'new_print' | 'edit_print' | 'alias' | 'correction';
export type ProposalStatus = 'new' | 'reviewing' | 'accepted' | 'rejected' | 'more_info';

export type ProposalDiff = {
  entity: 'card' | 'print' | 'alias';
  entityId?: string;
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
};

export type ProposalPayload = {
  diff: ProposalDiff;
  note?: string;
  confidence?: number;
  scanImageRef?: string;
  ocrExtractedName?: string;
  ocrExtractedSetCode?: string;
};

export type OutboxProposal = {
  localProposalId: string;
  createdAt: string;
  createdByDeviceId: string;
  userId?: string;
  type: ProposalType;
  payload: ProposalPayload;
  relatedScanId?: string;
  status: 'queued' | 'sent' | 'failed';
  lastError?: string;
};

export type ObservationStatus = 'active' | 'withdrawn' | 'spam';

export type OutboxObservation = {
  localObservationId: string;
  createdAt: string;
  targetType?: 'card' | 'print';
  targetId?: string;
  fieldPath: string;
  value: string | number;
  ocrConfidence: number;
  captureQualityScore: number;
  status: 'queued' | 'sent' | 'failed';
  scanRef?: string;
  lastError?: string;
};

export type Observation = {
  observationId: string;
  createdAt: string;
  principalId: string;
  scanRef?: string;
  cardId?: string;
  printId?: string;
  fieldPath: string;
  value: string | number;
  valueNorm: string;
  ocrConfidence: number;
  captureQualityScore: number;
  evidenceImageKey?: string;
  status: ObservationStatus;
};

export type Claim = {
  claimId: string;
  createdAt: string;
  targetType: 'card' | 'print';
  targetId: string;
  fieldPath: string;
  proposedValue: string | number;
  proposedValueNorm: string;
  generatedFrom: string[];
  status: 'open' | 'accepted' | 'rejected' | 'superseded';
  consensusScore: number;
  consensusCount: number;
  disagreementCount: number;
  lastComputedAt: string;
  competingValues: Array<{ valueNorm: string; totalWeight: number; principals: number }>;
};

export type TrustProfile = {
  principalId: string;
  createdAt: string;
  lastUpdatedAt: string;
  reputationScore: number;
  acceptedCount: number;
  rejectedCount: number;
  spamFlagCount: number;
};

export type Draft = {
  draftId: string;
  createdAt: string;
  createdBy: string;
  sourceScanRef?: string;
  targetType: 'card' | 'print' | 'unknown';
  targetId?: string;
  extractedFields: Record<string, unknown>;
  proposedPayload: Record<string, unknown>;
  status: 'new' | 'reviewing' | 'published' | 'rejected' | 'request_changes';
  reviewNotes?: string;
  publishedAt?: string;
  publishedBy?: string;
  confidence?: number;
};

export type OutboxDraft = {
  localDraftId: string;
  createdAt: string;
  sourceScanId: string;
  proposedPayload: Record<string, unknown>;
  extractedFields: Record<string, unknown>;
  targetType: 'card' | 'print' | 'unknown';
  targetId?: string;
  status: 'queued' | 'sent' | 'failed';
  lastError?: string;
};

export type DraftStatusCache = {
  draftId: string;
  status: Draft['status'];
  updatedAt: string;
  reviewNotes?: string;
};

export type PublishEvent = {
  eventId: string;
  draftId: string;
  timestamp: string;
  action: 'publish' | 'reject' | 'request_changes';
  actorRole: Role;
  actorId: string;
  diffApplied: Record<string, unknown>;
  resultingTargetIds: string[];
};

export type ModerationProposal = {
  proposalId: string;
  createdAt: string;
  createdByDeviceId: string;
  userId?: string;
  type: ProposalType;
  payload: ProposalPayload;
  status: ProposalStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewerNotes?: string;
  flagged?: boolean;
};

export type AuditLogEntry = {
  auditId: string;
  timestamp: string;
  proposalId?: string;
  action: 'accepted' | 'rejected' | 'rollback' | 'admin_edit' | 'claim_accepted' | 'claim_rejected' | 'claim_superseded' | 'draft_published' | 'draft_rejected';
  actorUserId: string;
  actorRole: Role;
  entity: 'card' | 'print' | 'alias' | 'claim' | 'draft';
  entityId: string;
  diff: ProposalDiff;
  notes?: string;
};

export type UserTrustStats = {
  userId: string;
  deviceId?: string;
  acceptedCount: number;
  rejectedCount: number;
  rejectionRate: number;
  trustScore: number;
};

export type SyncState = {
  lastSyncAt?: string;
  lastCardsVersion: number;
  lastPrintsVersion: number;
  lastAliasesVersion: number;
  lastImagesVersion: number;
};

export type ScanInput = {
  extractedName?: string;
  extractedSetCode?: string;
};

export type MatchCandidate = {
  card: Card;
  print?: Print;
  score: number;
  reason: 'set_code' | 'ocr_name' | 'alias' | 'phash';
};

export type MatchResult = {
  top?: MatchCandidate;
  alternatives: MatchCandidate[];
  needsConfirmation: boolean;
};

export type AuthSession = {
  token: string;
  username: string;
  userId: string;
  deviceId: string;
  role: Role;
};
