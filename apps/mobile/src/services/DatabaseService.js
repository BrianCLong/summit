"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.hydrateFromOffline = exports.getStorageSize = exports.clearAllData = exports.isDataStale = exports.getLastFetchTime = exports.setLastFetchTime = exports.clearGEOINTFeatures = exports.getGEOINTFeaturesInBounds = exports.getAllGEOINTFeatures = exports.getGEOINTFeature = exports.saveGEOINTFeatures = exports.saveGEOINTFeature = exports.clearAlerts = exports.deleteAlert = exports.markAlertAsRead = exports.getUnreadAlerts = exports.getAllAlerts = exports.getAlert = exports.saveAlerts = exports.saveAlert = exports.clearInvestigations = exports.deleteInvestigation = exports.getAllInvestigations = exports.getInvestigation = exports.saveInvestigations = exports.saveInvestigation = exports.getEntitiesByType = exports.clearEntities = exports.deleteEntity = exports.getAllEntities = exports.getEntity = exports.saveEntities = exports.saveEntity = void 0;
const react_native_mmkv_1 = require("react-native-mmkv");
const OfflineService = __importStar(require("./OfflineService"));
// Initialize MMKV storage instances
const entityStorage = new react_native_mmkv_1.MMKV({ id: 'entities' });
const investigationStorage = new react_native_mmkv_1.MMKV({ id: 'investigations' });
const alertStorage = new react_native_mmkv_1.MMKV({ id: 'alerts' });
const geointStorage = new react_native_mmkv_1.MMKV({ id: 'geoint' });
const metaStorage = new react_native_mmkv_1.MMKV({ id: 'metadata' });
// ============================================
// Entity Storage
// ============================================
const saveEntity = (entity) => {
    entityStorage.set(entity.id, JSON.stringify(entity));
    updateEntityIndex(entity);
    // Async persist to WatermelonDB
    OfflineService.saveEntity(entity).catch(console.error);
};
exports.saveEntity = saveEntity;
const saveEntities = (entities) => {
    entities.forEach((entity) => {
        entityStorage.set(entity.id, JSON.stringify(entity));
        updateEntityIndex(entity);
    });
    OfflineService.saveEntities(entities).catch(console.error);
};
exports.saveEntities = saveEntities;
const getEntity = (id) => {
    const data = entityStorage.getString(id);
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
};
exports.getEntity = getEntity;
const getAllEntities = () => {
    const keys = entityStorage.getAllKeys();
    const entities = [];
    keys.forEach((key) => {
        if (!key.startsWith('_index_')) {
            const entity = (0, exports.getEntity)(key);
            if (entity)
                entities.push(entity);
        }
    });
    return entities;
};
exports.getAllEntities = getAllEntities;
const deleteEntity = (id) => {
    const entity = (0, exports.getEntity)(id);
    if (entity) {
        entityStorage.delete(id);
        removeFromEntityIndex(entity);
        OfflineService.deleteEntity(id).catch(console.error);
    }
};
exports.deleteEntity = deleteEntity;
const clearEntities = () => {
    entityStorage.clearAll();
    OfflineService.clearEntities().catch(console.error);
};
exports.clearEntities = clearEntities;
// Entity index for fast lookups by type
const updateEntityIndex = (entity) => {
    const indexKey = `_index_type_${entity.type}`;
    const existingIndex = entityStorage.getString(indexKey);
    const index = existingIndex ? JSON.parse(existingIndex) : [];
    if (!index.includes(entity.id)) {
        index.push(entity.id);
        entityStorage.set(indexKey, JSON.stringify(index));
    }
};
const removeFromEntityIndex = (entity) => {
    const indexKey = `_index_type_${entity.type}`;
    const existingIndex = entityStorage.getString(indexKey);
    if (existingIndex) {
        const index = JSON.parse(existingIndex);
        const newIndex = index.filter((id) => id !== entity.id);
        entityStorage.set(indexKey, JSON.stringify(newIndex));
    }
};
const getEntitiesByType = (type) => {
    const indexKey = `_index_type_${type}`;
    const indexData = entityStorage.getString(indexKey);
    if (!indexData)
        return [];
    const ids = JSON.parse(indexData);
    return ids.map((id) => (0, exports.getEntity)(id)).filter((e) => e !== null);
};
exports.getEntitiesByType = getEntitiesByType;
// ============================================
// Investigation Storage
// ============================================
const saveInvestigation = (investigation) => {
    investigationStorage.set(investigation.id, JSON.stringify(investigation));
    OfflineService.saveInvestigation(investigation).catch(console.error);
};
exports.saveInvestigation = saveInvestigation;
const saveInvestigations = (investigations) => {
    investigations.forEach((inv) => {
        investigationStorage.set(inv.id, JSON.stringify(inv));
    });
    OfflineService.saveInvestigations(investigations).catch(console.error);
};
exports.saveInvestigations = saveInvestigations;
const getInvestigation = (id) => {
    const data = investigationStorage.getString(id);
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
};
exports.getInvestigation = getInvestigation;
const getAllInvestigations = () => {
    const keys = investigationStorage.getAllKeys();
    const investigations = [];
    keys.forEach((key) => {
        const inv = (0, exports.getInvestigation)(key);
        if (inv)
            investigations.push(inv);
    });
    return investigations;
};
exports.getAllInvestigations = getAllInvestigations;
const deleteInvestigation = (id) => {
    investigationStorage.delete(id);
    OfflineService.deleteInvestigation(id).catch(console.error);
};
exports.deleteInvestigation = deleteInvestigation;
const clearInvestigations = () => {
    investigationStorage.clearAll();
    OfflineService.clearInvestigations().catch(console.error);
};
exports.clearInvestigations = clearInvestigations;
// ============================================
// Alert Storage
// ============================================
const saveAlert = (alert) => {
    alertStorage.set(alert.id, JSON.stringify(alert));
    OfflineService.saveAlert(alert).catch(console.error);
};
exports.saveAlert = saveAlert;
const saveAlerts = (alerts) => {
    alerts.forEach((alert) => {
        alertStorage.set(alert.id, JSON.stringify(alert));
    });
    OfflineService.saveAlerts(alerts).catch(console.error);
};
exports.saveAlerts = saveAlerts;
const getAlert = (id) => {
    const data = alertStorage.getString(id);
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
};
exports.getAlert = getAlert;
const getAllAlerts = () => {
    const keys = alertStorage.getAllKeys();
    const alerts = [];
    keys.forEach((key) => {
        const alert = (0, exports.getAlert)(key);
        if (alert)
            alerts.push(alert);
    });
    // Sort by timestamp descending
    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};
exports.getAllAlerts = getAllAlerts;
const getUnreadAlerts = () => {
    return (0, exports.getAllAlerts)().filter((alert) => !alert.isRead);
};
exports.getUnreadAlerts = getUnreadAlerts;
const markAlertAsRead = (id) => {
    const alert = (0, exports.getAlert)(id);
    if (alert) {
        alert.isRead = true;
        (0, exports.saveAlert)(alert);
        OfflineService.markAlertAsRead(id).catch(console.error);
    }
};
exports.markAlertAsRead = markAlertAsRead;
const deleteAlert = (id) => {
    alertStorage.delete(id);
    OfflineService.deleteAlert(id).catch(console.error);
};
exports.deleteAlert = deleteAlert;
const clearAlerts = () => {
    alertStorage.clearAll();
    OfflineService.clearAlerts().catch(console.error);
};
exports.clearAlerts = clearAlerts;
// ============================================
// GEOINT Storage
// ============================================
const saveGEOINTFeature = (feature) => {
    geointStorage.set(feature.id, JSON.stringify(feature));
    OfflineService.saveGEOINTFeature(feature).catch(console.error);
};
exports.saveGEOINTFeature = saveGEOINTFeature;
const saveGEOINTFeatures = (features) => {
    features.forEach((feature) => {
        geointStorage.set(feature.id, JSON.stringify(feature));
    });
    OfflineService.saveGEOINTFeatures(features).catch(console.error);
};
exports.saveGEOINTFeatures = saveGEOINTFeatures;
const getGEOINTFeature = (id) => {
    const data = geointStorage.getString(id);
    if (!data)
        return null;
    try {
        return JSON.parse(data);
    }
    catch {
        return null;
    }
};
exports.getGEOINTFeature = getGEOINTFeature;
const getAllGEOINTFeatures = () => {
    const keys = geointStorage.getAllKeys();
    const features = [];
    keys.forEach((key) => {
        const feature = (0, exports.getGEOINTFeature)(key);
        if (feature)
            features.push(feature);
    });
    return features;
};
exports.getAllGEOINTFeatures = getAllGEOINTFeatures;
const getGEOINTFeaturesInBounds = (north, south, east, west) => {
    return (0, exports.getAllGEOINTFeatures)().filter((feature) => {
        if (feature.geometry.type === 'Point') {
            const [lng, lat] = feature.geometry.coordinates;
            return lat <= north && lat >= south && lng <= east && lng >= west;
        }
        return true; // Include non-point features
    });
};
exports.getGEOINTFeaturesInBounds = getGEOINTFeaturesInBounds;
const clearGEOINTFeatures = () => {
    geointStorage.clearAll();
    OfflineService.clearGEOINTFeatures().catch(console.error);
};
exports.clearGEOINTFeatures = clearGEOINTFeatures;
// ============================================
// Metadata Storage
// ============================================
const setLastFetchTime = (key, timestamp) => {
    metaStorage.set(`last_fetch_${key}`, timestamp);
};
exports.setLastFetchTime = setLastFetchTime;
const getLastFetchTime = (key) => {
    return metaStorage.getString(`last_fetch_${key}`) || null;
};
exports.getLastFetchTime = getLastFetchTime;
const isDataStale = (key, maxAgeMs) => {
    const lastFetch = (0, exports.getLastFetchTime)(key);
    if (!lastFetch)
        return true;
    const age = Date.now() - new Date(lastFetch).getTime();
    return age > maxAgeMs;
};
exports.isDataStale = isDataStale;
// ============================================
// Cleanup
// ============================================
const clearAllData = () => {
    entityStorage.clearAll();
    investigationStorage.clearAll();
    alertStorage.clearAll();
    geointStorage.clearAll();
    metaStorage.clearAll();
    OfflineService.clearAllData().catch(console.error);
};
exports.clearAllData = clearAllData;
const getStorageSize = () => {
    return {
        entities: entityStorage.getAllKeys().length,
        investigations: investigationStorage.getAllKeys().length,
        alerts: alertStorage.getAllKeys().length,
        geoint: geointStorage.getAllKeys().length,
    };
};
exports.getStorageSize = getStorageSize;
const hydrateFromOffline = async () => {
    try {
        const entities = await OfflineService.getAllEntities();
        (0, exports.saveEntities)(entities);
        const alerts = await OfflineService.getAllAlerts();
        (0, exports.saveAlerts)(alerts);
        // ... hydrate other collections
        console.log('[DatabaseService] Hydrated from Offline Database');
    }
    catch (error) {
        console.error('[DatabaseService] Hydration failed', error);
    }
};
exports.hydrateFromOffline = hydrateFromOffline;
