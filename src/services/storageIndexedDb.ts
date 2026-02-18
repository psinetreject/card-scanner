import { openDB, type DBSchema } from 'idb';
import type { Alias, AuthSession, Card, Claim, OutboxObservation, OutboxProposal, Print, SyncState, UserCollectionEntry, UserScan } from '../core/types';
import { seedAliases, seedCards, seedPrints } from '../data/seed';
import type { BundleIncludeOptions, IStorageService, LocalBundle } from './interfaces';

interface ScannerDb extends DBSchema {
  cache_cards: { key: string; value: Card };
  cache_prints: { key: string; value: Print };
  cache_aliases: { key: string; value: Alias };
  cache_claims: { key: string; value: Claim };
  user_collection: { key: string; value: UserCollectionEntry };
  user_scans: { key: string; value: UserScan };
  outbox_proposals: { key: string; value: OutboxProposal };
  outbox_observations: { key: string; value: OutboxObservation };
  sync_state: { key: string; value: SyncState };
  auth_session: { key: string; value: AuthSession };
}

const defaultSyncState: SyncState = { lastCardsVersion: 1, lastPrintsVersion: 1, lastAliasesVersion: 1, lastImagesVersion: 0 };

export class IndexedDbStorageService implements IStorageService {
  private dbPromise = openDB<ScannerDb>('ygo-scanner', 3, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('cache_cards', { keyPath: 'id' });
        db.createObjectStore('cache_prints', { keyPath: 'printId' });
        db.createObjectStore('cache_aliases', { keyPath: 'aliasId' });
        db.createObjectStore('user_collection', { keyPath: 'entryId' });
        db.createObjectStore('user_scans', { keyPath: 'scanId' });
        db.createObjectStore('outbox_proposals', { keyPath: 'localProposalId' });
        db.createObjectStore('sync_state');
      }
      if (!db.objectStoreNames.contains('auth_session')) db.createObjectStore('auth_session');
      if (!db.objectStoreNames.contains('outbox_observations')) db.createObjectStore('outbox_observations', { keyPath: 'localObservationId' });
      if (!db.objectStoreNames.contains('cache_claims')) db.createObjectStore('cache_claims', { keyPath: 'claimId' });
    },
  });

  async init(): Promise<void> {
    const db = await this.dbPromise;
    if ((await db.count('cache_cards')) === 0) {
      const tx = db.transaction(['cache_cards', 'cache_prints', 'cache_aliases', 'sync_state'], 'readwrite');
      await Promise.all(seedCards.map((x) => tx.objectStore('cache_cards').put(x)));
      await Promise.all(seedPrints.map((x) => tx.objectStore('cache_prints').put(x)));
      await Promise.all(seedAliases.map((x) => tx.objectStore('cache_aliases').put(x)));
      await tx.objectStore('sync_state').put(defaultSyncState, 'global');
      await tx.done;
    }
  }

  async getCacheCards() { return (await this.dbPromise).getAll('cache_cards'); }
  async getCachePrints() { return (await this.dbPromise).getAll('cache_prints'); }
  async getCacheAliases() { return (await this.dbPromise).getAll('cache_aliases'); }
  async saveScan(scan: UserScan) { await (await this.dbPromise).put('user_scans', scan); }
  async getScans() { return (await this.dbPromise).getAll('user_scans'); }
  async getCollection() { return (await this.dbPromise).getAll('user_collection'); }
  async upsertCollection(entry: UserCollectionEntry) { await (await this.dbPromise).put('user_collection', entry); }
  async queueProposal(proposal: OutboxProposal) { await (await this.dbPromise).put('outbox_proposals', proposal); }
  async listProposals() { return (await this.dbPromise).getAll('outbox_proposals'); }
  async queueObservation(observation: OutboxObservation) { await (await this.dbPromise).put('outbox_observations', observation); }
  async listObservations() { return (await this.dbPromise).getAll('outbox_observations'); }
  async setSyncState(state: SyncState) { await (await this.dbPromise).put('sync_state', state, 'global'); }
  async getSyncState() { return ((await this.dbPromise).get('sync_state', 'global')) ?? defaultSyncState; }
  async setSession(session: AuthSession) { await (await this.dbPromise).put('auth_session', session, 'current'); }
  async getSession() { return (await this.dbPromise).get('auth_session', 'current'); }
  async clearSession() { await (await this.dbPromise).delete('auth_session', 'current'); }

  async exportSnapshot(include: BundleIncludeOptions): Promise<LocalBundle> {
    const db = await this.dbPromise;
    return {
      appVersion: '0.3.0',
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      cache_cards: include.cache ? await db.getAll('cache_cards') : [],
      cache_prints: include.cache ? await db.getAll('cache_prints') : [],
      cache_aliases: include.cache ? await db.getAll('cache_aliases') : [],
      claims: include.cache ? await db.getAll('cache_claims') : [],
      user_collection: include.collection ? await db.getAll('user_collection') : [],
      user_scans: include.scans ? await db.getAll('user_scans') : [],
      outbox_proposals: include.outbox ? await db.getAll('outbox_proposals') : [],
      outbox_observations: include.outbox ? await db.getAll('outbox_observations') : [],
      sync_state: include.syncState ? await this.getSyncState() : undefined,
    };
  }

  async importSnapshot(snapshot: LocalBundle, mode: 'replace' | 'merge'): Promise<void> {
    const db = await this.dbPromise;
    const stores: (keyof ScannerDb)[] = ['cache_cards', 'cache_prints', 'cache_aliases', 'cache_claims', 'user_collection', 'user_scans', 'outbox_proposals', 'outbox_observations'];
    const tx = db.transaction([...stores, 'sync_state'], 'readwrite');
    if (mode === 'replace') await Promise.all(stores.map((s) => tx.objectStore(s).clear()));

    await Promise.all(snapshot.cache_cards.map((x) => tx.objectStore('cache_cards').put(x)));
    await Promise.all(snapshot.cache_prints.map((x) => tx.objectStore('cache_prints').put(x)));
    await Promise.all(snapshot.cache_aliases.map((x) => tx.objectStore('cache_aliases').put(x)));
    await Promise.all((snapshot.claims ?? []).map((x) => tx.objectStore('cache_claims').put(x)));
    await Promise.all(snapshot.user_collection.map((x) => tx.objectStore('user_collection').put(x)));
    await Promise.all(snapshot.user_scans.map((x) => tx.objectStore('user_scans').put(x)));
    await Promise.all(snapshot.outbox_proposals.map((x) => tx.objectStore('outbox_proposals').put(x)));
    await Promise.all((snapshot.outbox_observations ?? []).map((x) => tx.objectStore('outbox_observations').put(x)));

    if (snapshot.sync_state) await tx.objectStore('sync_state').put(snapshot.sync_state, 'global');
    await tx.done;
  }
}
