import SQLite from 'react-native-sqlite-storage';
import {MMKV} from 'react-native-mmkv';

import type {Location} from './LocationService';

// Enable debugging for SQLite
SQLite.enablePromise(true);
SQLite.DEBUG(false);

let db: SQLite.SQLiteDatabase | null = null;

// Initialize MMKV for fast key-value storage
export const storage = new MMKV({
  id: 'intelgraph-storage',
  encryptionKey: 'your-encryption-key-here', // TODO: Generate secure key
});

// Initialize database
export const initializeDatabase = async (): Promise<void> => {
  try {
    db = await SQLite.openDatabase({
      name: 'intelgraph.db',
      location: 'default',
    });

    console.log('Database opened successfully');

    // Create tables
    await createTables();

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Create tables
const createTables = async (): Promise<void> => {
  if (!db) return;

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
export const storePendingMutation = async (
  operation: string,
  variables: any,
): Promise<number> => {
  if (!db) throw new Error('Database not initialized');

  const result = await db.executeSql(
    'INSERT INTO pending_mutations (operation, variables, timestamp) VALUES (?, ?, ?)',
    [operation, JSON.stringify(variables), Date.now()],
  );

  return result[0].insertId || 0;
};

// Get pending mutations
export const getPendingMutations = async (): Promise<any[]> => {
  if (!db) throw new Error('Database not initialized');

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

// Delete pending mutation
export const deletePendingMutation = async (id: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  await db.executeSql('DELETE FROM pending_mutations WHERE id = ?', [id]);
};

// Update mutation retry count
export const updateMutationRetryCount = async (id: number, error?: string): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  await db.executeSql(
    'UPDATE pending_mutations SET retry_count = retry_count + 1, error = ? WHERE id = ?',
    [error || null, id],
  );
};

// Store location update
export const storeLocationUpdate = async (location: Location): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  await db.executeSql(
    `INSERT INTO location_history
     (latitude, longitude, altitude, accuracy, speed, heading, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      location.latitude,
      location.longitude,
      location.altitude || null,
      location.accuracy,
      location.speed || null,
      location.heading || null,
      location.timestamp,
    ],
  );
};

// Get unsynced location updates
export const getUnsyncedLocations = async (): Promise<Location[]> => {
  if (!db) throw new Error('Database not initialized');

  const result = await db.executeSql(
    'SELECT * FROM location_history WHERE synced = 0 ORDER BY timestamp ASC LIMIT 100',
  );

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

// Mark locations as synced
export const markLocationsAsSynced = async (timestamps: number[]): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  const placeholders = timestamps.map(() => '?').join(',');
  await db.executeSql(
    `UPDATE location_history SET synced = 1 WHERE timestamp IN (${placeholders})`,
    timestamps,
  );
};

// Add media to upload queue
export const addMediaToUploadQueue = async (media: {
  filePath: string;
  fileType: string;
  fileSize: number;
  entityId?: string;
  caseId?: string;
  metadata?: any;
}): Promise<number> => {
  if (!db) throw new Error('Database not initialized');

  const result = await db.executeSql(
    `INSERT INTO media_upload_queue
     (file_path, file_type, file_size, entity_id, case_id, metadata, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      media.filePath,
      media.fileType,
      media.fileSize,
      media.entityId || null,
      media.caseId || null,
      media.metadata ? JSON.stringify(media.metadata) : null,
      Date.now(),
    ],
  );

  return result[0].insertId || 0;
};

// Get pending media uploads
export const getPendingMediaUploads = async (): Promise<any[]> => {
  if (!db) throw new Error('Database not initialized');

  const result = await db.executeSql(
    "SELECT * FROM media_upload_queue WHERE upload_status = 'pending' ORDER BY timestamp ASC LIMIT 10",
  );

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

// Update media upload status
export const updateMediaUploadStatus = async (
  id: number,
  status: string,
  progress?: number,
  error?: string,
): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  await db.executeSql(
    'UPDATE media_upload_queue SET upload_status = ?, upload_progress = ?, error = ? WHERE id = ?',
    [status, progress || 0, error || null, id],
  );
};

// Delete media upload
export const deleteMediaUpload = async (id: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  await db.executeSql('DELETE FROM media_upload_queue WHERE id = ?', [id]);
};

// Cache entity
export const cacheEntity = async (id: string, data: any, ttl?: number): Promise<void> => {
  if (!db) throw new Error('Database not initialized');

  await db.executeSql(
    'INSERT OR REPLACE INTO cached_entities (id, data, timestamp, ttl) VALUES (?, ?, ?, ?)',
    [id, JSON.stringify(data), Date.now(), ttl || null],
  );
};

// Get cached entity
export const getCachedEntity = async (id: string): Promise<any | null> => {
  if (!db) throw new Error('Database not initialized');

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

// Close database
export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.close();
    db = null;
    console.log('Database closed');
  }
};
