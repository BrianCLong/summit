"use strict";
/**
 * Dimensional Modeling Manager
 * Unified interface for dimensional modeling operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelingManager = void 0;
const star_schema_1 = require("./schemas/star-schema");
const snowflake_schema_1 = require("./schemas/snowflake-schema");
const scd_handler_1 = require("./scd/scd-handler");
const dimension_manager_1 = require("./dimensions/dimension-manager");
const fact_table_manager_1 = require("./facts/fact-table-manager");
class ModelingManager {
    starSchema;
    snowflakeSchema;
    scdHandler;
    dimensionManager;
    factTableManager;
    constructor(pool) {
        this.starSchema = new star_schema_1.StarSchema(pool);
        this.snowflakeSchema = new snowflake_schema_1.SnowflakeSchema(pool);
        this.scdHandler = new scd_handler_1.SCDHandler(pool);
        this.dimensionManager = new dimension_manager_1.DimensionManager(pool);
        this.factTableManager = new fact_table_manager_1.FactTableManager(pool);
    }
}
exports.ModelingManager = ModelingManager;
