import { openDB, type DBSchema } from 'idb';
import type { Alias, AuthSession, Card, Claim, DraftStatusCache, FeaturePack, ImageFeature, OutboxDraft, OutboxObservation, OutboxProposal, Print, SyncState, UserCollectionEntry, UserScan } from '../core/types';
import { seedAliases, seedCards, seedFeaturePacks, seedImageFeatures, seedPrints } from '../data/seed';
import type { BundleIncludeOptions, IStorageService, LocalBundle } from './interfaces';

interface ScannerDb extends DBSchema {
  cache_cards: { key: string; value: Card };
  cache_prints: { key: string; value: Print };
  cache_aliases: { key: string; value: Alias };
  cache_image_features: { key: string; value: ImageFeature };
  cache_feature_packs: { key: string; value: FeaturePack };
  cache_claims: { key: string; value: Claim };
  cache_drafts_status: { key: string; value: DraftStatusCache };
  user_collection: { key: string; value: UserCollectionEntry };
  user_scans: { key: string; value: UserScan };
  outbox_proposals: { key: string; value: OutboxProposal };
  outbox_observations: { key: string; value: OutboxObservation };
  outbox_drafts: { key: string; value: OutboxDraft };
  sync_state: { key: string; value: SyncState };
  auth_session: { key: string; value: AuthSession };
}

const defaultSyncState: SyncState = { lastCardsVersion: 1, lastPrintsVersion: 1, lastAliasesVersion: 1, lastImagesVersion: 1 };

export class IndexedDbStorageService implements IStorageService {
  private dbPromise = openDB<ScannerDb>('ygo-scanner', 5, {
    upgrade(db) {
      const create = (name: string, keyPath?: string) => { if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, keyPath ? { keyPath } : undefined); };
      create('cache_cards', 'id');
      create('cache_prints', 'printId');
      create('cache_aliases', 'aliasId');
      create('cache_image_features', 'featureId');
      create('cache_feature_packs', 'packId');
      create('cache_claims', 'claimId');
      create('cache_drafts_status', 'draftId');
      create('user_collection', 'entryId');
      create('user_scans', 'scanId');
      create('outbox_proposals', 'localProposalId');
      create('outbox_observations', 'localObservationId');
      create('outbox_drafts', 'localDraftId');
      create('sync_state');
      create('auth_session');
    },
  });

  async init(): Promise<void> {
    const db = await this.dbPromise;
    if ((await db.count('cache_cards')) === 0) {
      const tx = db.transaction(['cache_cards', 'cache_prints', 'cache_aliases', 'cache_image_features', 'cache_feature_packs', 'sync_state'], 'readwrite');
      await Promise.all(seedCards.map((x) => tx.objectStore('cache_cards').put(x)));
      await Promise.all(seedPrints.map((x) => tx.objectStore('cache_prints').put(x)));
      await Promise.all(seedAliases.map((x) => tx.objectStore('cache_aliases').put(x)));
      await Promise.all(seedImageFeatures.map((x) => tx.objectStore('cache_image_features').put(x)));
      await Promise.all(seedFeaturePacks.map((x) => tx.objectStore('cache_feature_packs').put(x)));
      await tx.objectStore('sync_state').put(defaultSyncState, 'global');
      await tx.done;
    }
  }

  async getCacheCards() { return (await this.dbPromise).getAll('cache_cards'); }
  async getCachePrints() { return (await this.dbPromise).getAll('cache_prints'); }
  async getCacheAliases() { return (await this.dbPromise).getAll('cache_aliases'); }
  async getCacheImageFeatures() {
    const packs = await this.getFeaturePacks();
    const active = new Set(packs.filter((p) => p.status === 'installed').map((p) => p.packId));
    return (await (await this.dbPromise).getAll('cache_image_features')).filter((f) => active.has(f.packId));
  }
  async getFeaturePacks() { return (await this.dbPromise).getAll('cache_feature_packs'); }
  async installFeaturePack(packId: string) {
    const db = await this.dbPromise;
    const p = await db.get('cache_feature_packs', packId);
    if (p) await db.put('cache_feature_packs', { ...p, status: 'installed', installedAt: new Date().toISOString() });
  }
  async removeFeaturePack(packId: string) {
    const db = await this.dbPromise;
    const p = await db.get('cache_feature_packs', packId);
    if (p) await db.put('cache_feature_packs', { ...p, status: 'available', installedAt: undefined });
  }
  async saveScan(scan: UserScan) { await (await this.dbPromise).put('user_scans', scan); }
  async getScans() { return (await this.dbPromise).getAll('user_scans'); }
  async getCollection() { return (await this.dbPromise).getAll('user_collection'); }
  async upsertCollection(entry: UserCollectionEntry) { await (await this.dbPromise).put('user_collection', entry); }
  async queueProposal(proposal: OutboxProposal) { await (await this.dbPromise).put('outbox_proposals', proposal); }
  async listProposals() { return (await this.dbPromise).getAll('outbox_proposals'); }
  async queueObservation(observation: OutboxObservation) { await (await this.dbPromise).put('outbox_observations', observation); }
  async listObservations() { return (await this.dbPromise).getAll('outbox_observations'); }
  async queueDraft(draft: OutboxDraft) { await (await this.dbPromise).put('outbox_drafts', draft); }
  async listDrafts() { return (await this.dbPromise).getAll('outbox_drafts'); }
  async getDraftStatusCache() { return (await this.dbPromise).getAll('cache_drafts_status'); }
  async setDraftStatusCache(status: DraftStatusCache) { await (await this.dbPromise).put('cache_drafts_status', status); }
  async setSyncState(state: SyncState) { await (await this.dbPromise).put('sync_state', state, 'global'); }
  async getSyncState() { return ((await this.dbPromise).get('sync_state', 'global')) ?? defaultSyncState; }
  async setSession(session: AuthSession) { await (await this.dbPromise).put('auth_session', session, 'current'); }
  async getSession() { return (await this.dbPromise).get('auth_session', 'current'); }
  async clearSession() { await (await this.dbPromise).delete('auth_session', 'current'); }

  async exportSnapshot(include: BundleIncludeOptions): Promise<LocalBundle> {
    const db = await this.dbPromise;
    return {
      appVersion: '0.5.0', schemaVersion: 5, exportedAt: new Date().toISOString(),
      cache_cards: include.cache ? await db.getAll('cache_cards') : [],
      cache_prints: include.cache ? await db.getAll('cache_prints') : [],
      cache_aliases: include.cache ? await db.getAll('cache_aliases') : [],
      cache_image_features: include.cache ? await db.getAll('cache_image_features') : [],
      feature_packs: include.cache ? await db.getAll('cache_feature_packs') : [],
      claims: include.cache ? await db.getAll('cache_claims') : [],
      draft_statuses: include.cache ? await db.getAll('cache_drafts_status') : [],
      user_collection: include.collection ? await db.getAll('user_collection') : [],
      user_scans: include.scans ? await db.getAll('user_scans') : [],
      outbox_proposals: include.outbox ? await db.getAll('outbox_proposals') : [],
      outbox_observations: include.outbox ? await db.getAll('outbox_observations') : [],
      outbox_drafts: include.outbox ? await db.getAll('outbox_drafts') : [],
      sync_state: include.syncState ? await this.getSyncState() : undefined,
    };
  }

  async importSnapshot(snapshot: LocalBundle, mode: 'replace' | 'merge'): Promise<void> {
    const db = await this.dbPromise;
    const stores: (keyof ScannerDb)[] = ['cache_cards', 'cache_prints', 'cache_aliases', 'cache_image_features', 'cache_feature_packs', 'cache_claims', 'cache_drafts_status', 'user_collection', 'user_scans', 'outbox_proposals', 'outbox_observations', 'outbox_drafts'];
    const tx = db.transaction([...stores, 'sync_state'], 'readwrite');
    if (mode === 'replace') await Promise.all(stores.map((s) => tx.objectStore(s).clear()));

    await Promise.all(snapshot.cache_cards.map((x) => tx.objectStore('cache_cards').put(x)));
    await Promise.all(snapshot.cache_prints.map((x) => tx.objectStore('cache_prints').put(x)));
    await Promise.all(snapshot.cache_aliases.map((x) => tx.objectStore('cache_aliases').put(x)));
    await Promise.all((snapshot.cache_image_features ?? []).map((x) => tx.objectStore('cache_image_features').put(x)));
    await Promise.all((snapshot.feature_packs ?? []).map((x) => tx.objectStore('cache_feature_packs').put(x)));
    await Promise.all((snapshot.claims ?? []).map((x) => tx.objectStore('cache_claims').put(x)));
    await Promise.all((snapshot.draft_statuses ?? []).map((x) => tx.objectStore('cache_drafts_status').put(x)));
    await Promise.all(snapshot.user_collection.map((x) => tx.objectStore('user_collection').put(x)));
    await Promise.all(snapshot.user_scans.map((x) => tx.objectStore('user_scans').put(x)));
    await Promise.all(snapshot.outbox_proposals.map((x) => tx.objectStore('outbox_proposals').put(x)));
    await Promise.all((snapshot.outbox_observations ?? []).map((x) => tx.objectStore('outbox_observations').put(x)));
    await Promise.all((snapshot.outbox_drafts ?? []).map((x) => tx.objectStore('outbox_drafts').put(x)));
    if (snapshot.sync_state) await tx.objectStore('sync_state').put(snapshot.sync_state, 'global');
    await tx.done;
  }
}
