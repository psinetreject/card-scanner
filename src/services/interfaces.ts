import type {
  Alias,
  AuditLogEntry,
  AuthSession,
  Card,
  Claim,
  MatchResult,
  ModerationProposal,
  Observation,
  OutboxObservation,
  OutboxProposal,
  Print,
  Role,
  ScanInput,
  SyncState,
  UserCollectionEntry,
  UserScan,
  UserTrustStats,
} from '../core/types';

export interface ICameraService {
  start(video: HTMLVideoElement, deviceId?: string): Promise<void>;
  stop(): void;
  capture(video: HTMLVideoElement): Promise<Blob>;
  listDevices(): Promise<MediaDeviceInfo[]>;
  isTorchSupported(): boolean;
}

export interface IOcrService {
  extract(image: Blob): Promise<{ text: string; name?: string; setCode?: string; confidence?: number }>;
}

export interface IStorageService {
  init(): Promise<void>;
  getCacheCards(): Promise<Card[]>;
  getCachePrints(): Promise<Print[]>;
  getCacheAliases(): Promise<Alias[]>;
  saveScan(scan: UserScan): Promise<void>;
  getScans(): Promise<UserScan[]>;
  getCollection(): Promise<UserCollectionEntry[]>;
  upsertCollection(entry: UserCollectionEntry): Promise<void>;
  queueProposal(proposal: OutboxProposal): Promise<void>;
  listProposals(): Promise<OutboxProposal[]>;
  queueObservation(observation: OutboxObservation): Promise<void>;
  listObservations(): Promise<OutboxObservation[]>;
  setSyncState(state: SyncState): Promise<void>;
  getSyncState(): Promise<SyncState>;
  importSnapshot(snapshot: LocalBundle, mode: 'replace' | 'merge'): Promise<void>;
  exportSnapshot(include: BundleIncludeOptions): Promise<LocalBundle>;
  setSession(session: AuthSession): Promise<void>;
  getSession(): Promise<AuthSession | undefined>;
  clearSession(): Promise<void>;
}

export interface IAuthService {
  login(identifier: string, password: string): Promise<AuthSession>;
  continueAsGuest(): Promise<AuthSession>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | undefined>;
}

export interface ISyncService {
  pullUpdates(session: AuthSession): Promise<{ cards: Card[]; prints: Print[]; aliases: Alias[]; claims: Claim[]; syncState: SyncState }>;
  pushProposals(session: AuthSession, proposals: OutboxProposal[]): Promise<{ acceptedIds: string[]; failed: { id: string; error: string }[] }>;
  pushObservations(session: AuthSession, observations: OutboxObservation[]): Promise<{ acceptedIds: string[]; failed: { id: string; error: string }[] }>;
  downloadSnapshotBundle(session: AuthSession): Promise<LocalBundle & { checksum?: string }>;
}

export interface IModerationService {
  getPendingProposals(session: AuthSession, filter?: { type?: string; userId?: string; minConfidence?: number }): Promise<ModerationProposal[]>;
  getAuditLog(session: AuthSession): Promise<AuditLogEntry[]>;
  getTrustStats(session: AuthSession): Promise<UserTrustStats[]>;
  getCardHistory(session: AuthSession, cardId: string): Promise<AuditLogEntry[]>;
  approveProposal(session: AuthSession, proposalId: string, note?: string): Promise<void>;
  rejectProposal(session: AuthSession, proposalId: string, note?: string): Promise<void>;
  rollbackCard(session: AuthSession, cardId: string, toVersion: number): Promise<void>;
  adminEditCard(session: AuthSession, card: Card, note?: string): Promise<void>;
  getConsensusQueue(session: AuthSession): Promise<Claim[]>;
  setClaimStatus(session: AuthSession, claimId: string, action: 'accepted' | 'rejected' | 'superseded', note?: string): Promise<void>;
  getObservationsForClaim(session: AuthSession, claimId: string): Promise<Observation[]>;
}

export interface IMatchingService {
  run(input: ScanInput): Promise<MatchResult>;
}

export type BundleIncludeOptions = {
  cache: boolean;
  collection: boolean;
  scans: boolean;
  outbox: boolean;
  syncState: boolean;
};

export type LocalBundle = {
  appVersion: string;
  schemaVersion: number;
  exportedAt: string;
  cache_cards: Card[];
  cache_prints: Print[];
  cache_aliases: Alias[];
  claims?: Claim[];
  user_collection: UserCollectionEntry[];
  user_scans: UserScan[];
  outbox_proposals: OutboxProposal[];
  outbox_observations?: OutboxObservation[];
  sync_state?: SyncState;
};

export interface IBundleService {
  exportToFile(include: BundleIncludeOptions): Promise<void>;
  importFromFile(file: File, mode: 'replace' | 'merge'): Promise<void>;
}
