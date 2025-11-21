/**
 * Dimensional Modeling Manager
 * Unified interface for dimensional modeling operations
 */

import { Pool } from 'pg';
import { StarSchema } from './schemas/star-schema';
import { SnowflakeSchema } from './schemas/snowflake-schema';
import { SCDHandler } from './scd/scd-handler';
import { DimensionManager } from './dimensions/dimension-manager';
import { FactTableManager } from './facts/fact-table-manager';

export class ModelingManager {
  public starSchema: StarSchema;
  public snowflakeSchema: SnowflakeSchema;
  public scdHandler: SCDHandler;
  public dimensionManager: DimensionManager;
  public factTableManager: FactTableManager;

  constructor(pool: Pool) {
    this.starSchema = new StarSchema(pool);
    this.snowflakeSchema = new SnowflakeSchema(pool);
    this.scdHandler = new SCDHandler(pool);
    this.dimensionManager = new DimensionManager(pool);
    this.factTableManager = new FactTableManager(pool);
  }
}
