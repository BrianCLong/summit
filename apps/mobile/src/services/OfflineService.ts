import {
  database,
  entitiesCollection,
  investigationsCollection,
  alertsCollection,
  geointCollection,
} from './WatermelonDB';
import { Q } from '@nozbe/watermelondb';
import type { Entity, Investigation, Alert, GEOINTFeature } from '@intelgraph/mobile-sdk/db';
import type { OSINTAlert } from '@/types';

// ============================================
// Entity Storage
// ============================================

export const saveEntity = async (entityData: any): Promise<void> => {
  await database.write(async () => {
    await entitiesCollection.create((entity) => {
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

export const saveEntities = async (entitiesData: any[]): Promise<void> => {
  await database.write(async () => {
    const batch = entitiesData.map((data) =>
      entitiesCollection.prepareCreate((entity) => {
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
      }),
    );
    await database.batch(batch);
  });
};

export const getEntity = async (id: string): Promise<Entity | null> => {
  try {
    return await entitiesCollection.find(id);
  } catch {
    return null;
  }
};

export const getAllEntities = async (): Promise<Entity[]> => {
  return await entitiesCollection.query().fetch();
};

export const deleteEntity = async (id: string): Promise<void> => {
  await database.write(async () => {
    const entity = await getEntity(id);
    if (entity) {
      await entity.markAsDeleted(); // Syncable deletion
    }
  });
};

export const clearEntities = async (): Promise<void> => {
  await database.write(async () => {
    const all = await getAllEntities();
    const batch = all.map((e) => e.prepareMarkAsDeleted());
    await database.batch(batch);
  });
};

export const getEntitiesByType = async (type: string): Promise<Entity[]> => {
  return await entitiesCollection.query(Q.where('type', type)).fetch();
};

// ============================================
// Investigation Storage
// ============================================

export const saveInvestigation = async (data: any): Promise<void> => {
  await database.write(async () => {
    await investigationsCollection.create((inv) => {
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

export const saveInvestigations = async (list: any[]): Promise<void> => {
  await database.write(async () => {
    const batch = list.map((data) =>
      investigationsCollection.prepareCreate((inv) => {
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
      }),
    );
    await database.batch(batch);
  });
};

export const getInvestigation = async (id: string): Promise<Investigation | null> => {
  try {
    return await investigationsCollection.find(id);
  } catch {
    return null;
  }
};

export const getAllInvestigations = async (): Promise<Investigation[]> => {
  return await investigationsCollection.query().fetch();
};

export const deleteInvestigation = async (id: string): Promise<void> => {
  await database.write(async () => {
    const inv = await getInvestigation(id);
    if (inv) {
      await inv.markAsDeleted();
    }
  });
};

export const clearInvestigations = async (): Promise<void> => {
  await database.write(async () => {
    const all = await getAllInvestigations();
    const batch = all.map((i) => i.prepareMarkAsDeleted());
    await database.batch(batch);
  });
};

// ============================================
// Alert Storage
// ============================================

export const saveAlert = async (data: OSINTAlert): Promise<void> => {
  await database.write(async () => {
    await alertsCollection.create((alert) => {
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

export const saveAlerts = async (list: OSINTAlert[]): Promise<void> => {
  await database.write(async () => {
    const batch = list.map((data) =>
      alertsCollection.prepareCreate((alert) => {
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
      }),
    );
    await database.batch(batch);
  });
};

export const getAlert = async (id: string): Promise<Alert | null> => {
  try {
    return await alertsCollection.find(id);
  } catch {
    return null;
  }
};

export const getAllAlerts = async (): Promise<Alert[]> => {
  return await alertsCollection.query(Q.sortBy('timestamp', Q.desc)).fetch();
};

export const getUnreadAlerts = async (): Promise<Alert[]> => {
  return await alertsCollection
    .query(Q.where('is_read', false), Q.sortBy('timestamp', Q.desc))
    .fetch();
};

export const markAlertAsRead = async (id: string): Promise<void> => {
  await database.write(async () => {
    const alert = await getAlert(id);
    if (alert) {
      await alert.update((a) => {
        a.isRead = true;
      });
    }
  });
};

export const deleteAlert = async (id: string): Promise<void> => {
  await database.write(async () => {
    const alert = await getAlert(id);
    if (alert) {
      await alert.markAsDeleted();
    }
  });
};

export const clearAlerts = async (): Promise<void> => {
  await database.write(async () => {
    const all = await getAllAlerts();
    const batch = all.map((a) => a.prepareMarkAsDeleted());
    await database.batch(batch);
  });
};

// ============================================
// GEOINT Storage
// ============================================

export const saveGEOINTFeature = async (data: any): Promise<void> => {
  await database.write(async () => {
    await geointCollection.create((f) => {
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

export const saveGEOINTFeatures = async (list: any[]): Promise<void> => {
  await database.write(async () => {
    const batch = list.map((data) =>
      geointCollection.prepareCreate((f) => {
        if (data.id) {
          f._raw.id = data.id;
        }
        f.type = data.type;
        f.geometry = data.geometry;
        f.properties = data.properties;
        f.timestamp = new Date(data.timestamp);
      }),
    );
    await database.batch(batch);
  });
};

export const getAllGEOINTFeatures = async (): Promise<GEOINTFeature[]> => {
  return await geointCollection.query().fetch();
};

export const clearGEOINTFeatures = async (): Promise<void> => {
  await database.write(async () => {
    const all = await getAllGEOINTFeatures();
    const batch = all.map((f) => f.prepareMarkAsDeleted());
    await database.batch(batch);
  });
};

// ============================================
// Cleanup
// ============================================

export const clearAllData = async (): Promise<void> => {
  await database.write(async () => {
    await database.unsafeResetDatabase();
  });
};
