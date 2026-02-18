export type Role = 'viewer' | 'contributor' | 'moderator' | 'admin';

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
  action: 'accepted' | 'rejected' | 'rollback' | 'admin_edit';
  actorUserId: string;
  actorRole: Role;
  entity: 'card' | 'print' | 'alias';
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
  userId: string;
  deviceId: string;
  role: Role;
};
