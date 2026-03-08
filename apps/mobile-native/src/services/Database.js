"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeDatabase = exports.getCachedEntity = exports.cacheEntity = exports.deleteMediaUpload = exports.updateMediaUploadStatus = exports.getPendingMediaUploads = exports.addMediaToUploadQueue = exports.markLocationsAsSynced = exports.getUnsyncedLocations = exports.storeLocationUpdate = exports.updateMutationRetryCount = exports.deletePendingMutation = exports.getPendingMutations = exports.storePendingMutation = exports.initializeDatabase = exports.storage = void 0;
// @ts-nocheck
const react_native_sqlite_storage_1 = __importDefault(require("react-native-sqlite-storage"));
const react_native_mmkv_1 = require("react-native-mmkv");
const react_native_config_1 = __importDefault(require("react-native-config"));
// Enable debugging for SQLite
react_native_sqlite_storage_1.default.enablePromise(true);
react_native_sqlite_storage_1.default.DEBUG(false);
let db = null;
// SECURITY: Encryption key must be provided via react-native-config or secure storage
// For production: Use react-native-keychain or device secure storage
const getEncryptionKey = () => {
    // Try to get from react-native-config first
    const configKey = react_native_config_1.default.MMKV_ENCRYPTION_KEY;
    if (configKey) {
        return configKey;
    }
    // In production, this should throw an error or use device keychain
    if (react_native_config_1.default.ENV === 'production') {
        throw new Error('MMKV_ENCRYPTION_KEY not configured. Mobile app encryption keys must be ' +
            'provisioned through react-native-config or device secure storage (Keychain/Keystore).');
    }
    // Development fallback - log warning
    console.warn('MMKV_ENCRYPTION_KEY not set - using insecure key for development only. ' +
        'NEVER deploy to production without proper key management!');
    return 'dev-insecure-key-do-not-use-in-production';
};
// Initialize MMKV for fast key-value storage
exports.storage = new react_native_mmkv_1.MMKV({
    id: 'intelgraph-storage',
    encryptionKey: getEncryptionKey(),
});
// Initialize database
const initializeDatabase = async () => {
    try {
        db = await react_native_sqlite_storage_1.default.openDatabase({
            name: 'intelgraph.db',
            location: 'default',
        });
        console.log('Database opened successfully');
        // Create tables
        await createTables();
        console.log('Database initialized successfully');
    }
    catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
    }
};
exports.initializeDatabase = initializeDatabase;
// Create tables
const createTables = async () => {
    if (!db)
        return;
    // Pending mutations table (for offline sync)
    await db.executeSql(`
    CREATE TABLE IF NOT EXISTS pending_mutations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      operation TEXT NOT NULL,
      variables TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      retry_count INTEGER DEFAULT 0,
      error TEXT
    )
  `);
    // Location history table
    await db.executeSql(`
    CREATE TABLE IF NOT EXISTS location_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      altitude REAL,
      accuracy REAL NOT NULL,
      speed REAL,
      heading REAL,
      timestamp INTEGER NOT NULL,
      synced INTEGER DEFAULT 0
    )
  `);
    // Media upload queue table
    await db.executeSql(`
    CREATE TABLE IF NOT EXISTS media_upload_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      entity_id TEXT,
      case_id TEXT,
      metadata TEXT,
      timestamp INTEGER NOT NULL,
      upload_status TEXT DEFAULT 'pending',
      upload_progress INTEGER DEFAULT 0,
      error TEXT
    )
  `);
    // Cached entities table
    await db.executeSql(`
    CREATE TABLE IF NOT EXISTS cached_entities (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      ttl INTEGER
    )
  `);
    // Cached cases table
    await db.executeSql(`
    CREATE TABLE IF NOT EXISTS cached_cases (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      ttl INTEGER
    )
  `);
    // Search history table
    await db.executeSql(`
    CREATE TABLE IF NOT EXISTS search_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query TEXT NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
    console.log('Tables created successfully');
};
// Store pending mutation
const storePendingMutation = async (operation, variables) => {
    if (!db)
        throw new Error('Database not initialized');
    const result = await db.executeSql('INSERT INTO pending_mutations (operation, variables, timestamp) VALUES (?, ?, ?)', [operation, JSON.stringify(variables), Date.now()]);
    return result[0].insertId || 0;
};
exports.storePendingMutation = storePendingMutation;
// Get pending mutations
const getPendingMutations = async () => {
    if (!db)
        throw new Error('Database not initialized');
    const result = await db.executeSql('SELECT * FROM pending_mutations ORDER BY timestamp ASC');
    const mutations = [];
    for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        mutations.push({
            id: row.id,
            operation: row.operation,
            variables: JSON.parse(row.variables),
            timestamp: row.timestamp,
            retryCount: row.retry_count,
            error: row.error,
        });
    }
    return mutations;
};
exports.getPendingMutations = getPendingMutations;
// Delete pending mutation
const deletePendingMutation = async (id) => {
    if (!db)
        throw new Error('Database not initialized');
    await db.executeSql('DELETE FROM pending_mutations WHERE id = ?', [id]);
};
exports.deletePendingMutation = deletePendingMutation;
// Update mutation retry count
const updateMutationRetryCount = async (id, error) => {
    if (!db)
        throw new Error('Database not initialized');
    await db.executeSql('UPDATE pending_mutations SET retry_count = retry_count + 1, error = ? WHERE id = ?', [error || null, id]);
};
exports.updateMutationRetryCount = updateMutationRetryCount;
// Store location update
const storeLocationUpdate = async (location) => {
    if (!db)
        throw new Error('Database not initialized');
    await db.executeSql(`INSERT INTO location_history
     (latitude, longitude, altitude, accuracy, speed, heading, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        location.latitude,
        location.longitude,
        location.altitude || null,
        location.accuracy,
        location.speed || null,
        location.heading || null,
        location.timestamp,
    ]);
};
exports.storeLocationUpdate = storeLocationUpdate;
// Get unsynced location updates
const getUnsyncedLocations = async () => {
    if (!db)
        throw new Error('Database not initialized');
    const result = await db.executeSql('SELECT * FROM location_history WHERE synced = 0 ORDER BY timestamp ASC LIMIT 100');
    const locations = [];
    for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        locations.push({
            latitude: row.latitude,
            longitude: row.longitude,
            altitude: row.altitude,
            accuracy: row.accuracy,
            speed: row.speed,
            heading: row.heading,
            timestamp: row.timestamp,
        });
    }
    return locations;
};
exports.getUnsyncedLocations = getUnsyncedLocations;
// Mark locations as synced
const markLocationsAsSynced = async (timestamps) => {
    if (!db)
        throw new Error('Database not initialized');
    const placeholders = timestamps.map(() => '?').join(',');
    await db.executeSql(`UPDATE location_history SET synced = 1 WHERE timestamp IN (${placeholders})`, timestamps);
};
exports.markLocationsAsSynced = markLocationsAsSynced;
// Add media to upload queue
const addMediaToUploadQueue = async (media) => {
    if (!db)
        throw new Error('Database not initialized');
    const result = await db.executeSql(`INSERT INTO media_upload_queue
     (file_path, file_type, file_size, entity_id, case_id, metadata, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`, [
        media.filePath,
        media.fileType,
        media.fileSize,
        media.entityId || null,
        media.caseId || null,
        media.metadata ? JSON.stringify(media.metadata) : null,
        Date.now(),
    ]);
    return result[0].insertId || 0;
};
exports.addMediaToUploadQueue = addMediaToUploadQueue;
// Get pending media uploads
const getPendingMediaUploads = async () => {
    if (!db)
        throw new Error('Database not initialized');
    const result = await db.executeSql("SELECT * FROM media_upload_queue WHERE upload_status = 'pending' ORDER BY timestamp ASC LIMIT 10");
    const uploads = [];
    for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        uploads.push({
            id: row.id,
            filePath: row.file_path,
            fileType: row.file_type,
            fileSize: row.file_size,
            entityId: row.entity_id,
            caseId: row.case_id,
            metadata: row.metadata ? JSON.parse(row.metadata) : null,
            timestamp: row.timestamp,
            uploadStatus: row.upload_status,
            uploadProgress: row.upload_progress,
            error: row.error,
        });
    }
    return uploads;
};
exports.getPendingMediaUploads = getPendingMediaUploads;
// Update media upload status
const updateMediaUploadStatus = async (id, status, progress, error) => {
    if (!db)
        throw new Error('Database not initialized');
    await db.executeSql('UPDATE media_upload_queue SET upload_status = ?, upload_progress = ?, error = ? WHERE id = ?', [status, progress || 0, error || null, id]);
};
exports.updateMediaUploadStatus = updateMediaUploadStatus;
// Delete media upload
const deleteMediaUpload = async (id) => {
    if (!db)
        throw new Error('Database not initialized');
    await db.executeSql('DELETE FROM media_upload_queue WHERE id = ?', [id]);
};
exports.deleteMediaUpload = deleteMediaUpload;
// Cache entity
const cacheEntity = async (id, data, ttl) => {
    if (!db)
        throw new Error('Database not initialized');
    await db.executeSql('INSERT OR REPLACE INTO cached_entities (id, data, timestamp, ttl) VALUES (?, ?, ?, ?)', [id, JSON.stringify(data), Date.now(), ttl || null]);
};
exports.cacheEntity = cacheEntity;
// Get cached entity
const getCachedEntity = async (id) => {
    if (!db)
        throw new Error('Database not initialized');
    const result = await db.executeSql('SELECT * FROM cached_entities WHERE id = ?', [id]);
    if (result[0].rows.length === 0) {
        return null;
    }
    const row = result[0].rows.item(0);
    // Check if TTL expired
    if (row.ttl && Date.now() - row.timestamp > row.ttl) {
        await db.executeSql('DELETE FROM cached_entities WHERE id = ?', [id]);
        return null;
    }
    return JSON.parse(row.data);
};
exports.getCachedEntity = getCachedEntity;
// Close database
const closeDatabase = async () => {
    if (db) {
        await db.close();
        db = null;
        console.log('Database closed');
    }
};
exports.closeDatabase = closeDatabase;
