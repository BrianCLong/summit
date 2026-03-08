"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.darkLaunchService = exports.DarkLaunchService = void 0;
const logger_js_1 = require("../config/logger.js");
const postgres_js_1 = require("../db/postgres.js");
/**
 * Service for managing 'Dark Launch' capabilities across major subsystems (Task #107).
 */
class DarkLaunchService {
    static instance;
    flags = new Map();
    constructor() { }
    static getInstance() {
        if (!DarkLaunchService.instance) {
            DarkLaunchService.instance = new DarkLaunchService();
        }
        return DarkLaunchService.instance;
    }
    /**
     * Checks if a feature should be "Dark Launched" for a specific request.
     */
    isDarkLaunchActive(subsystem, feature) {
        const flagKey = `${subsystem}:${feature}`;
        const flag = this.flags.get(flagKey);
        if (!flag || !flag.enabled)
            return false;
        return Math.random() < flag.samplingRate;
    }
    /**
     * Registers or updates a dark launch flag.
     */
    async setFlag(flag) {
        const flagKey = `${flag.subsystem}:${flag.feature}`;
        this.flags.set(flagKey, flag);
        const pool = (0, postgres_js_1.getPostgresPool)();
        await pool.query(`INSERT INTO dark_launch_flags (subsystem, feature, enabled, sampling_rate, is_shadow_only, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (subsystem, feature) DO UPDATE SET
         enabled = $3,
         sampling_rate = $4,
         is_shadow_only = $5,
         updated_at = NOW()`, [flag.subsystem, flag.feature, flag.enabled, flag.samplingRate, flag.isShadowOnly]);
        logger_js_1.logger.info({ flagKey, enabled: flag.enabled }, 'DarkLaunch: Flag updated');
    }
    /**
     * Loads all flags from the database.
     */
    async loadFlags() {
        const pool = (0, postgres_js_1.getPostgresPool)();
        try {
            const result = await pool.query('SELECT * FROM dark_launch_flags');
            for (const row of result.rows) {
                this.flags.set(`${row.subsystem}:${row.feature}`, {
                    subsystem: row.subsystem,
                    feature: row.feature,
                    enabled: row.enabled,
                    samplingRate: row.sampling_rate,
                    isShadowOnly: row.is_shadow_only
                });
            }
            logger_js_1.logger.info({ count: result.rows.length }, 'DarkLaunch: Flags loaded');
        }
        catch (err) {
            if (err.message.includes('relation "dark_launch_flags" does not exist')) {
                return;
            }
            throw err;
        }
    }
}
exports.DarkLaunchService = DarkLaunchService;
exports.darkLaunchService = DarkLaunchService.getInstance();
