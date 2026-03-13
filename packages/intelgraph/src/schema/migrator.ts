import { SchemaVersion } from './version.js';
import { EntityV2, migrateV1ToV2 } from './migrations/v1-to-v2.js';

export class Migrator {
  migrate(entity: unknown, fromVersion: SchemaVersion): EntityV2 {
    if (fromVersion === '2') {
      return entity as EntityV2;
    }

    if (fromVersion === '1') {
      return migrateV1ToV2(entity);
    }

    throw new Error(`Unsupported schema version: ${fromVersion}`);
  }

  batchMigrate(entities: unknown[], fromVersion: SchemaVersion): EntityV2[] {
    return entities.map((e) => this.migrate(e, fromVersion));
  }
}
