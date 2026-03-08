"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * @class DatabaseService
 * @description Provides a stubbed implementation of a database service.
 * This class is intended to be a placeholder and does not connect to a real database.
 * Its methods are designed to be extended or replaced by a full implementation.
 *
 * @example
 * ```typescript
 * const dbService = new DatabaseService();
 *
 * async function getUsers() {
 *   // Note: This is a stub and will return an empty array.
 *   const result = await dbService.query('SELECT * FROM users');
 *   console.log(result.rows);
 * }
 * ```
 */
class DatabaseService {
    /**
     * @method query
     * @description Executes a SQL query. This is a stub method that logs the query if debugging is enabled
     * and returns an empty result set.
     * @template T - The expected type of the result rows.
     * @param {string} sql - The SQL query string to execute.
     * @param {unknown[]} [params=[]] - An array of parameters to be used with the query.
     * @returns {Promise<QueryResult<T>>} A promise that resolves to a QueryResult with an empty `rows` array.
     */
    async query(sql, params = []) {
        if (process.env.DEBUG_DB_QUERIES) {
            logger_js_1.default.debug('DatabaseService query (stub)', { sql, params });
        }
        return { rows: [] };
    }
    /**
     * @method getConnectionConfig
     * @description Returns the configuration for the database connection. This is a stub method.
     * @returns {Record<string, any>} An empty object.
     */
    getConnectionConfig() {
        return {};
    }
}
exports.DatabaseService = DatabaseService;
