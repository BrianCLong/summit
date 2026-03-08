"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.storage = void 0;
const idb_1 = require("idb");
class LocalStorage {
    dbPromise;
    constructor() {
        this.dbPromise = (0, idb_1.openDB)('field-kit-db', 1, {
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
    async saveCase(caseData) {
        return (await this.dbPromise).put('cases', caseData);
    }
    async getCase(id) {
        return (await this.dbPromise).get('cases', id);
    }
    async getAllCases() {
        return (await this.dbPromise).getAll('cases');
    }
    async saveNote(note) {
        return (await this.dbPromise).put('notes', note);
    }
    async getNotesForCase(caseId) {
        return (await this.dbPromise).getAllFromIndex('notes', 'by-case', caseId);
    }
    async saveMedia(media) {
        return (await this.dbPromise).put('media', media);
    }
    async getMediaForCase(caseId) {
        return (await this.dbPromise).getAllFromIndex('media', 'by-case', caseId);
    }
    async queueSyncItem(item) {
        return (await this.dbPromise).put('syncQueue', item);
    }
    async getNextSyncItem() {
        const db = await this.dbPromise;
        const tx = db.transaction('syncQueue', 'readonly');
        const index = tx.store.index('by-timestamp');
        const cursor = await index.openCursor();
        return cursor ? cursor.value : null;
    }
    async removeSyncItem(id) {
        return (await this.dbPromise).delete('syncQueue', id);
    }
}
exports.storage = new LocalStorage();
