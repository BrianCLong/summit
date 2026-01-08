import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import {
  schema,
  Entity,
  Investigation,
  Alert,
  GEOINTFeature,
  SyncQueueItem,
} from '@intelgraph/mobile-sdk/db';

const adapter = new SQLiteAdapter({
  schema,
  // (You might want to comment out migrationEvents for production)
  // migrationEvents: !!__DEV__,
  jsi: true, // Enable JSI for faster database operations
  onSetUpError: (error) => {
    // Database failed to load -- offer the user to reload the app or log out
    console.error('Database failed to load', error);
  },
});

export const database = new Database({
  adapter,
  modelClasses: [Entity, Investigation, Alert, GEOINTFeature, SyncQueueItem],
});

export const entitiesCollection = database.get<Entity>('entities');
export const investigationsCollection = database.get<Investigation>('investigations');
export const alertsCollection = database.get<Alert>('alerts');
export const geointCollection = database.get<GEOINTFeature>('geoint_features');
export const syncQueueCollection = database.get<SyncQueueItem>('sync_queue');
