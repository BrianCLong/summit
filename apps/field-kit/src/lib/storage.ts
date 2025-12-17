import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { FieldNote, FieldMediaCapture, FieldCaseSnapshot, SyncQueueItem } from '../types';

interface FieldKitDB extends DBSchema {
  cases: {
    key: string;
    value: FieldCaseSnapshot;
  };
  notes: {
    key: string;
    value: FieldNote;
    indexes: { 'by-case': string; 'sync-status': string };
  };
  media: {
    key: string;
    value: FieldMediaCapture;
    indexes: { 'by-case': string; 'sync-status': string };
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: { 'by-timestamp': number };
  };
}

class LocalStorage {
  private dbPromise: Promise<IDBPDatabase<FieldKitDB>>;

  constructor() {
    this.dbPromise = openDB<FieldKitDB>('field-kit-db', 1, {
      upgrade(db) {
        db.createObjectStore('cases', { keyPath: 'id' });

        const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
        noteStore.createIndex('by-case', 'caseId');
        noteStore.createIndex('sync-status', 'syncStatus');

        const mediaStore = db.createObjectStore('media', { keyPath: 'id' });
        mediaStore.createIndex('by-case', 'caseId');
        mediaStore.createIndex('sync-status', 'syncStatus');

        const queueStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        queueStore.createIndex('by-timestamp', 'timestamp');
      },
    });
  }

  async saveCase(caseData: FieldCaseSnapshot) {
    return (await this.dbPromise).put('cases', caseData);
  }

  async getCase(id: string) {
    return (await this.dbPromise).get('cases', id);
  }

  async getAllCases() {
    return (await this.dbPromise).getAll('cases');
  }

  async saveNote(note: FieldNote) {
    return (await this.dbPromise).put('notes', note);
  }

  async getNotesForCase(caseId: string) {
    return (await this.dbPromise).getAllFromIndex('notes', 'by-case', caseId);
  }

  async saveMedia(media: FieldMediaCapture) {
    return (await this.dbPromise).put('media', media);
  }

  async getMediaForCase(caseId: string) {
    return (await this.dbPromise).getAllFromIndex('media', 'by-case', caseId);
  }

  async queueSyncItem(item: SyncQueueItem) {
    return (await this.dbPromise).put('syncQueue', item);
  }

  async getNextSyncItem() {
    const db = await this.dbPromise;
    const tx = db.transaction('syncQueue', 'readonly');
    const index = tx.store.index('by-timestamp');
    const cursor = await index.openCursor();
    return cursor ? cursor.value : null;
  }

  async removeSyncItem(id: string) {
    return (await this.dbPromise).delete('syncQueue', id);
  }
}

export const storage = new LocalStorage();
