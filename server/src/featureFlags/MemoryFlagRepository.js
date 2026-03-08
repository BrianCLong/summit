"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryFlagRepository = void 0;
class MemoryFlagRepository {
    flags;
    logger;
    constructor(initialFlags) {
        this.flags = new Map();
        this.logger = console;
        // Initialize with any provided flags
        if (initialFlags) {
            initialFlags.forEach(flag => {
                this.flags.set(flag.key, flag);
            });
        }
    }
    async getFlag(flagKey) {
        const flag = this.flags.get(flagKey);
        return flag || null;
    }
    async getAllFlags() {
        return Array.from(this.flags.values());
    }
    async updateFlag(flag) {
        const existing = this.flags.get(flag.key);
        if (!existing) {
            throw new Error(`Feature flag with key "${flag.key}" does not exist.`);
        }
        // Preserve creation data but update other fields
        const updatedFlag = {
            ...flag,
            createdAt: existing.createdAt,
            createdBy: existing.createdBy,
            updatedAt: new Date()
        };
        this.flags.set(flag.key, updatedFlag);
        this.logger.log(`Updated feature flag: ${flag.key}`);
    }
    async createFlag(flag) {
        const now = new Date();
        const newFlag = {
            ...flag,
            createdAt: flag.createdAt || now,
            createdBy: flag.createdBy || 'system',
            updatedAt: now
        };
        this.flags.set(flag.key, newFlag);
        this.logger.log(`Created feature flag: ${flag.key}`);
    }
    async deleteFlag(flagKey) {
        const deleted = this.flags.delete(flagKey);
        if (deleted) {
            this.logger.log(`Deleted feature flag: ${flagKey}`);
        }
        else {
            this.logger.warn(`Attempted to delete non-existent feature flag: ${flagKey}`);
        }
    }
    // Method to add multiple flags at once (useful for seeding)
    addFlags(flags) {
        flags.forEach(flag => {
            this.flags.set(flag.key, {
                ...flag,
                createdAt: flag.createdAt || new Date(),
                createdBy: flag.createdBy || 'system',
                updatedAt: new Date()
            });
        });
    }
    // Method to get all flag keys (for debugging/monitoring)
    getAllFlagKeys() {
        return Array.from(this.flags.keys());
    }
    // Method to clear all flags (useful for testing)
    clear() {
        this.flags.clear();
    }
}
exports.MemoryFlagRepository = MemoryFlagRepository;
