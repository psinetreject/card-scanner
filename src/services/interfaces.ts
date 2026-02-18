import type {
  Alias,
  AuditLogEntry,
  AuthSession,
  Card,
  MatchResult,
  ModerationProposal,
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
  setSyncState(state: SyncState): Promise<void>;
  getSyncState(): Promise<SyncState>;
  importSnapshot(snapshot: LocalBundle, mode: 'replace' | 'merge'): Promise<void>;
  exportSnapshot(include: BundleIncludeOptions): Promise<LocalBundle>;
  setSession(session: AuthSession): Promise<void>;
  getSession(): Promise<AuthSession | undefined>;
}

export interface IAuthService {
  login(role: Role): Promise<AuthSession>;
  getSession(): Promise<AuthSession | undefined>;
}

export interface ISyncService {
  pullUpdates(session: AuthSession): Promise<{ cards: Card[]; prints: Print[]; aliases: Alias[]; syncState: SyncState }>;
  pushProposals(session: AuthSession, proposals: OutboxProposal[]): Promise<{ acceptedIds: string[]; failed: { id: string; error: string }[] }>;
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
  user_collection: UserCollectionEntry[];
  user_scans: UserScan[];
  outbox_proposals: OutboxProposal[];
  sync_state?: SyncState;
};

export interface IBundleService {
  exportToFile(include: BundleIncludeOptions): Promise<void>;
  importFromFile(file: File, mode: 'replace' | 'merge'): Promise<void>;
}
