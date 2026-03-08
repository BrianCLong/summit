"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAllData = exports.clearGEOINTFeatures = exports.getAllGEOINTFeatures = exports.saveGEOINTFeatures = exports.saveGEOINTFeature = exports.clearAlerts = exports.deleteAlert = exports.markAlertAsRead = exports.getUnreadAlerts = exports.getAllAlerts = exports.getAlert = exports.saveAlerts = exports.saveAlert = exports.clearInvestigations = exports.deleteInvestigation = exports.getAllInvestigations = exports.getInvestigation = exports.saveInvestigations = exports.saveInvestigation = exports.getEntitiesByType = exports.clearEntities = exports.deleteEntity = exports.getAllEntities = exports.getEntity = exports.saveEntities = exports.saveEntity = void 0;
const WatermelonDB_1 = require("./WatermelonDB");
const watermelondb_1 = require("@nozbe/watermelondb");
// ============================================
// Entity Storage
// ============================================
const saveEntity = async (entityData) => {
    await WatermelonDB_1.database.write(async () => {
        await WatermelonDB_1.entitiesCollection.create(entity => {
            // Use existing ID if available to prevent duplicates
            if (entityData.id) {
                entity._raw.id = entityData.id;
            }
            entity.name = entityData.name;
            entity.type = entityData.type;
            entity.description = entityData.description;
            entity.properties = entityData.properties;
            entity.createdAt = new Date(entityData.createdAt);
            entity.updatedAt = new Date(entityData.updatedAt);
            entity.lastSeen = entityData.lastSeen ? new Date(entityData.lastSeen) : undefined;
            entity.isTarget = entityData.isTarget;
        });
    });
};
exports.saveEntity = saveEntity;
const saveEntities = async (entitiesData) => {
    await WatermelonDB_1.database.write(async () => {
        const batch = entitiesData.map(data => WatermelonDB_1.entitiesCollection.prepareCreate(entity => {
            if (data.id) {
                entity._raw.id = data.id;
            }
            entity.name = data.name;
            entity.type = data.type;
            entity.description = data.description;
            entity.properties = data.properties;
            entity.createdAt = new Date(data.createdAt);
            entity.updatedAt = new Date(data.updatedAt);
            entity.lastSeen = data.lastSeen ? new Date(data.lastSeen) : undefined;
            entity.isTarget = data.isTarget;
        }));
        await WatermelonDB_1.database.batch(batch);
    });
};
exports.saveEntities = saveEntities;
const getEntity = async (id) => {
    try {
        return await WatermelonDB_1.entitiesCollection.find(id);
    }
    catch {
        return null;
    }
};
exports.getEntity = getEntity;
const getAllEntities = async () => {
    return await WatermelonDB_1.entitiesCollection.query().fetch();
};
exports.getAllEntities = getAllEntities;
const deleteEntity = async (id) => {
    await WatermelonDB_1.database.write(async () => {
        const entity = await (0, exports.getEntity)(id);
        if (entity) {
            await entity.markAsDeleted(); // Syncable deletion
        }
    });
};
exports.deleteEntity = deleteEntity;
const clearEntities = async () => {
    await WatermelonDB_1.database.write(async () => {
        const all = await (0, exports.getAllEntities)();
        const batch = all.map(e => e.prepareMarkAsDeleted());
        await WatermelonDB_1.database.batch(batch);
    });
};
exports.clearEntities = clearEntities;
const getEntitiesByType = async (type) => {
    return await WatermelonDB_1.entitiesCollection.query(watermelondb_1.Q.where('type', type)).fetch();
};
exports.getEntitiesByType = getEntitiesByType;
// ============================================
// Investigation Storage
// ============================================
const saveInvestigation = async (data) => {
    await WatermelonDB_1.database.write(async () => {
        await WatermelonDB_1.investigationsCollection.create(inv => {
            if (data.id) {
                inv._raw.id = data.id;
            }
            inv.title = data.title;
            inv.status = data.status;
            inv.priority = data.priority;
            inv.description = data.description;
            inv.createdAt = new Date(data.createdAt);
            inv.updatedAt = new Date(data.updatedAt);
            inv.assignedTo = data.assignedTo;
        });
    });
};
exports.saveInvestigation = saveInvestigation;
const saveInvestigations = async (list) => {
    await WatermelonDB_1.database.write(async () => {
        const batch = list.map(data => WatermelonDB_1.investigationsCollection.prepareCreate(inv => {
            if (data.id) {
                inv._raw.id = data.id;
            }
            inv.title = data.title;
            inv.status = data.status;
            inv.priority = data.priority;
            inv.description = data.description;
            inv.createdAt = new Date(data.createdAt);
            inv.updatedAt = new Date(data.updatedAt);
            inv.assignedTo = data.assignedTo;
        }));
        await WatermelonDB_1.database.batch(batch);
    });
};
exports.saveInvestigations = saveInvestigations;
const getInvestigation = async (id) => {
    try {
        return await WatermelonDB_1.investigationsCollection.find(id);
    }
    catch {
        return null;
    }
};
exports.getInvestigation = getInvestigation;
const getAllInvestigations = async () => {
    return await WatermelonDB_1.investigationsCollection.query().fetch();
};
exports.getAllInvestigations = getAllInvestigations;
const deleteInvestigation = async (id) => {
    await WatermelonDB_1.database.write(async () => {
        const inv = await (0, exports.getInvestigation)(id);
        if (inv) {
            await inv.markAsDeleted();
        }
    });
};
exports.deleteInvestigation = deleteInvestigation;
const clearInvestigations = async () => {
    await WatermelonDB_1.database.write(async () => {
        const all = await (0, exports.getAllInvestigations)();
        const batch = all.map(i => i.prepareMarkAsDeleted());
        await WatermelonDB_1.database.batch(batch);
    });
};
exports.clearInvestigations = clearInvestigations;
// ============================================
// Alert Storage
// ============================================
const saveAlert = async (data) => {
    await WatermelonDB_1.database.write(async () => {
        await WatermelonDB_1.alertsCollection.create(alert => {
            if (data.id) {
                alert._raw.id = data.id;
            }
            alert.title = data.title;
            alert.description = data.description;
            alert.type = data.type;
            alert.priority = data.priority;
            alert.source = data.source;
            alert.isRead = data.isRead;
            alert.timestamp = new Date(data.timestamp);
            alert.metadata = data.metadata;
        });
    });
};
exports.saveAlert = saveAlert;
const saveAlerts = async (list) => {
    await WatermelonDB_1.database.write(async () => {
        const batch = list.map(data => WatermelonDB_1.alertsCollection.prepareCreate(alert => {
            if (data.id) {
                alert._raw.id = data.id;
            }
            alert.title = data.title;
            alert.description = data.description;
            alert.type = data.type;
            alert.priority = data.priority;
            alert.source = data.source;
            alert.isRead = data.isRead;
            alert.timestamp = new Date(data.timestamp);
            alert.metadata = data.metadata;
        }));
        await WatermelonDB_1.database.batch(batch);
    });
};
exports.saveAlerts = saveAlerts;
const getAlert = async (id) => {
    try {
        return await WatermelonDB_1.alertsCollection.find(id);
    }
    catch {
        return null;
    }
};
exports.getAlert = getAlert;
const getAllAlerts = async () => {
    return await WatermelonDB_1.alertsCollection.query(watermelondb_1.Q.sortBy('timestamp', watermelondb_1.Q.desc)).fetch();
};
exports.getAllAlerts = getAllAlerts;
const getUnreadAlerts = async () => {
    return await WatermelonDB_1.alertsCollection.query(watermelondb_1.Q.where('is_read', false), watermelondb_1.Q.sortBy('timestamp', watermelondb_1.Q.desc)).fetch();
};
exports.getUnreadAlerts = getUnreadAlerts;
const markAlertAsRead = async (id) => {
    await WatermelonDB_1.database.write(async () => {
        const alert = await (0, exports.getAlert)(id);
        if (alert) {
            await alert.update(a => {
                a.isRead = true;
            });
        }
    });
};
exports.markAlertAsRead = markAlertAsRead;
const deleteAlert = async (id) => {
    await WatermelonDB_1.database.write(async () => {
        const alert = await (0, exports.getAlert)(id);
        if (alert) {
            await alert.markAsDeleted();
        }
    });
};
exports.deleteAlert = deleteAlert;
const clearAlerts = async () => {
    await WatermelonDB_1.database.write(async () => {
        const all = await (0, exports.getAllAlerts)();
        const batch = all.map(a => a.prepareMarkAsDeleted());
        await WatermelonDB_1.database.batch(batch);
    });
};
exports.clearAlerts = clearAlerts;
// ============================================
// GEOINT Storage
// ============================================
const saveGEOINTFeature = async (data) => {
    await WatermelonDB_1.database.write(async () => {
        await WatermelonDB_1.geointCollection.create(f => {
            if (data.id) {
                f._raw.id = data.id;
            }
            f.type = data.type;
            f.geometry = data.geometry;
            f.properties = data.properties;
            f.timestamp = new Date(data.timestamp);
        });
    });
};
exports.saveGEOINTFeature = saveGEOINTFeature;
const saveGEOINTFeatures = async (list) => {
    await WatermelonDB_1.database.write(async () => {
        const batch = list.map(data => WatermelonDB_1.geointCollection.prepareCreate(f => {
            if (data.id) {
                f._raw.id = data.id;
            }
            f.type = data.type;
            f.geometry = data.geometry;
            f.properties = data.properties;
            f.timestamp = new Date(data.timestamp);
        }));
        await WatermelonDB_1.database.batch(batch);
    });
};
exports.saveGEOINTFeatures = saveGEOINTFeatures;
const getAllGEOINTFeatures = async () => {
    return await WatermelonDB_1.geointCollection.query().fetch();
};
exports.getAllGEOINTFeatures = getAllGEOINTFeatures;
const clearGEOINTFeatures = async () => {
    await WatermelonDB_1.database.write(async () => {
        const all = await (0, exports.getAllGEOINTFeatures)();
        const batch = all.map(f => f.prepareMarkAsDeleted());
        await WatermelonDB_1.database.batch(batch);
    });
};
exports.clearGEOINTFeatures = clearGEOINTFeatures;
// ============================================
// Cleanup
// ============================================
const clearAllData = async () => {
    await WatermelonDB_1.database.write(async () => {
        await WatermelonDB_1.database.unsafeResetDatabase();
    });
};
exports.clearAllData = clearAllData;
