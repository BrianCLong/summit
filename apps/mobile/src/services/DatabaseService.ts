import { MMKV } from 'react-native-mmkv';
import { DB_CONFIG } from '@/config';
import type { Entity, Investigation, OSINTAlert, GEOINTFeature } from '@/types';

// Initialize MMKV storage instances
const entityStorage = new MMKV({ id: 'entities' });
const investigationStorage = new MMKV({ id: 'investigations' });
const alertStorage = new MMKV({ id: 'alerts' });
const geointStorage = new MMKV({ id: 'geoint' });
const metaStorage = new MMKV({ id: 'metadata' });

// ============================================
// Entity Storage
// ============================================

export const saveEntity = (entity: Entity): void => {
  entityStorage.set(entity.id, JSON.stringify(entity));
  updateEntityIndex(entity);
};

export const saveEntities = (entities: Entity[]): void => {
  entities.forEach((entity) => {
    entityStorage.set(entity.id, JSON.stringify(entity));
    updateEntityIndex(entity);
  });
};

export const getEntity = (id: string): Entity | null => {
  const data = entityStorage.getString(id);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const getAllEntities = (): Entity[] => {
  const keys = entityStorage.getAllKeys();
  const entities: Entity[] = [];

  keys.forEach((key) => {
    if (!key.startsWith('_index_')) {
      const entity = getEntity(key);
      if (entity) entities.push(entity);
    }
  });

  return entities;
};

export const deleteEntity = (id: string): void => {
  const entity = getEntity(id);
  if (entity) {
    entityStorage.delete(id);
    removeFromEntityIndex(entity);
  }
};

export const clearEntities = (): void => {
  entityStorage.clearAll();
};

// Entity index for fast lookups by type
const updateEntityIndex = (entity: Entity): void => {
  const indexKey = `_index_type_${entity.type}`;
  const existingIndex = entityStorage.getString(indexKey);
  const index: string[] = existingIndex ? JSON.parse(existingIndex) : [];

  if (!index.includes(entity.id)) {
    index.push(entity.id);
    entityStorage.set(indexKey, JSON.stringify(index));
  }
};

const removeFromEntityIndex = (entity: Entity): void => {
  const indexKey = `_index_type_${entity.type}`;
  const existingIndex = entityStorage.getString(indexKey);
  if (existingIndex) {
    const index: string[] = JSON.parse(existingIndex);
    const newIndex = index.filter((id) => id !== entity.id);
    entityStorage.set(indexKey, JSON.stringify(newIndex));
  }
};

export const getEntitiesByType = (type: string): Entity[] => {
  const indexKey = `_index_type_${type}`;
  const indexData = entityStorage.getString(indexKey);
  if (!indexData) return [];

  const ids: string[] = JSON.parse(indexData);
  return ids.map((id) => getEntity(id)).filter((e): e is Entity => e !== null);
};

// ============================================
// Investigation Storage
// ============================================

export const saveInvestigation = (investigation: Investigation): void => {
  investigationStorage.set(investigation.id, JSON.stringify(investigation));
};

export const saveInvestigations = (investigations: Investigation[]): void => {
  investigations.forEach((inv) => {
    investigationStorage.set(inv.id, JSON.stringify(inv));
  });
};

export const getInvestigation = (id: string): Investigation | null => {
  const data = investigationStorage.getString(id);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const getAllInvestigations = (): Investigation[] => {
  const keys = investigationStorage.getAllKeys();
  const investigations: Investigation[] = [];

  keys.forEach((key) => {
    const inv = getInvestigation(key);
    if (inv) investigations.push(inv);
  });

  return investigations;
};

export const deleteInvestigation = (id: string): void => {
  investigationStorage.delete(id);
};

export const clearInvestigations = (): void => {
  investigationStorage.clearAll();
};

// ============================================
// Alert Storage
// ============================================

export const saveAlert = (alert: OSINTAlert): void => {
  alertStorage.set(alert.id, JSON.stringify(alert));
};

export const saveAlerts = (alerts: OSINTAlert[]): void => {
  alerts.forEach((alert) => {
    alertStorage.set(alert.id, JSON.stringify(alert));
  });
};

export const getAlert = (id: string): OSINTAlert | null => {
  const data = alertStorage.getString(id);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const getAllAlerts = (): OSINTAlert[] => {
  const keys = alertStorage.getAllKeys();
  const alerts: OSINTAlert[] = [];

  keys.forEach((key) => {
    const alert = getAlert(key);
    if (alert) alerts.push(alert);
  });

  // Sort by timestamp descending
  return alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
};

export const getUnreadAlerts = (): OSINTAlert[] => {
  return getAllAlerts().filter((alert) => !alert.isRead);
};

export const markAlertAsRead = (id: string): void => {
  const alert = getAlert(id);
  if (alert) {
    alert.isRead = true;
    saveAlert(alert);
  }
};

export const deleteAlert = (id: string): void => {
  alertStorage.delete(id);
};

export const clearAlerts = (): void => {
  alertStorage.clearAll();
};

// ============================================
// GEOINT Storage
// ============================================

export const saveGEOINTFeature = (feature: GEOINTFeature): void => {
  geointStorage.set(feature.id, JSON.stringify(feature));
};

export const saveGEOINTFeatures = (features: GEOINTFeature[]): void => {
  features.forEach((feature) => {
    geointStorage.set(feature.id, JSON.stringify(feature));
  });
};

export const getGEOINTFeature = (id: string): GEOINTFeature | null => {
  const data = geointStorage.getString(id);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const getAllGEOINTFeatures = (): GEOINTFeature[] => {
  const keys = geointStorage.getAllKeys();
  const features: GEOINTFeature[] = [];

  keys.forEach((key) => {
    const feature = getGEOINTFeature(key);
    if (feature) features.push(feature);
  });

  return features;
};

export const getGEOINTFeaturesInBounds = (
  north: number,
  south: number,
  east: number,
  west: number,
): GEOINTFeature[] => {
  return getAllGEOINTFeatures().filter((feature) => {
    if (feature.geometry.type === 'Point') {
      const [lng, lat] = feature.geometry.coordinates as [number, number];
      return lat <= north && lat >= south && lng <= east && lng >= west;
    }
    return true; // Include non-point features
  });
};

export const clearGEOINTFeatures = (): void => {
  geointStorage.clearAll();
};

// ============================================
// Metadata Storage
// ============================================

export const setLastFetchTime = (key: string, timestamp: string): void => {
  metaStorage.set(`last_fetch_${key}`, timestamp);
};

export const getLastFetchTime = (key: string): string | null => {
  return metaStorage.getString(`last_fetch_${key}`) || null;
};

export const isDataStale = (key: string, maxAgeMs: number): boolean => {
  const lastFetch = getLastFetchTime(key);
  if (!lastFetch) return true;

  const age = Date.now() - new Date(lastFetch).getTime();
  return age > maxAgeMs;
};

// ============================================
// Cleanup
// ============================================

export const clearAllData = (): void => {
  entityStorage.clearAll();
  investigationStorage.clearAll();
  alertStorage.clearAll();
  geointStorage.clearAll();
  metaStorage.clearAll();
};

export const getStorageSize = (): { entities: number; investigations: number; alerts: number; geoint: number } => {
  return {
    entities: entityStorage.getAllKeys().length,
    investigations: investigationStorage.getAllKeys().length,
    alerts: alertStorage.getAllKeys().length,
    geoint: geointStorage.getAllKeys().length,
  };
};
