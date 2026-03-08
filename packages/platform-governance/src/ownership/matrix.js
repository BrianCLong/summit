"use strict";
/**
 * P48-49: Ownership Matrix
 * Service and code ownership tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ownershipMatrix = exports.OwnershipMatrixManager = exports.OwnershipMatrixSchema = exports.OwnershipEntrySchema = exports.OwnerSchema = exports.OwnerContactSchema = void 0;
exports.createOwnershipManager = createOwnershipManager;
const zod_1 = require("zod");
/**
 * Owner contact schema
 */
exports.OwnerContactSchema = zod_1.z.object({
    name: zod_1.z.string(),
    email: zod_1.z.string().email().optional(),
    slack: zod_1.z.string().optional(),
    pagerduty: zod_1.z.string().optional(),
});
/**
 * Owner schema
 */
exports.OwnerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['team', 'individual', 'squad', 'guild']),
    contacts: zod_1.z.array(exports.OwnerContactSchema),
    escalationChain: zod_1.z.array(zod_1.z.string()).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/**
 * Ownership entry schema
 */
exports.OwnershipEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    pattern: zod_1.z.string(), // Glob pattern for matching
    patternType: zod_1.z.enum(['path', 'service', 'domain', 'component']),
    owners: zod_1.z.array(zod_1.z.object({
        ownerId: zod_1.z.string(),
        level: zod_1.z.enum(['primary', 'secondary', 'tertiary']),
        responsibilities: zod_1.z.array(zod_1.z.string()).optional(),
    })),
    description: zod_1.z.string().optional(),
    documentation: zod_1.z.string().optional(),
    sla: zod_1.z.object({
        responseTime: zod_1.z.string().optional(),
        resolutionTime: zod_1.z.string().optional(),
    }).optional(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
/**
 * Ownership matrix schema
 */
exports.OwnershipMatrixSchema = zod_1.z.object({
    version: zod_1.z.string(),
    lastUpdated: zod_1.z.date(),
    owners: zod_1.z.array(exports.OwnerSchema),
    entries: zod_1.z.array(exports.OwnershipEntrySchema),
});
/**
 * Match a pattern against a target
 */
function matchPattern(pattern, target) {
    // Convert glob pattern to regex
    const regexPattern = pattern
        .replace(/\*\*/g, '{{DOUBLE_STAR}}')
        .replace(/\*/g, '[^/]*')
        .replace(/{{DOUBLE_STAR}}/g, '.*')
        .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(target);
}
/**
 * Ownership Matrix Manager
 */
class OwnershipMatrixManager {
    owners = new Map();
    entries = [];
    version = '1.0.0';
    lastUpdated = new Date();
    /**
     * Register an owner
     */
    registerOwner(owner) {
        const validated = exports.OwnerSchema.parse(owner);
        this.owners.set(validated.id, validated);
        this.lastUpdated = new Date();
    }
    /**
     * Get an owner by ID
     */
    getOwner(ownerId) {
        return this.owners.get(ownerId);
    }
    /**
     * Add an ownership entry
     */
    addEntry(entry) {
        const validated = exports.OwnershipEntrySchema.parse(entry);
        this.entries.push(validated);
        this.lastUpdated = new Date();
    }
    /**
     * Find owners for a target
     */
    findOwners(target, patternType = 'path') {
        const results = [];
        for (const entry of this.entries) {
            if (entry.patternType !== patternType)
                continue;
            if (!matchPattern(entry.pattern, target))
                continue;
            for (const ownerRef of entry.owners) {
                const owner = this.owners.get(ownerRef.ownerId);
                if (owner) {
                    results.push({
                        owner,
                        level: ownerRef.level,
                        entry,
                    });
                }
            }
        }
        // Sort by escalation level
        const levelOrder = {
            primary: 0,
            secondary: 1,
            tertiary: 2,
        };
        return results.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
    }
    /**
     * Get primary owner for a target
     */
    getPrimaryOwner(target, patternType = 'path') {
        const owners = this.findOwners(target, patternType);
        const primary = owners.find(o => o.level === 'primary');
        return primary?.owner;
    }
    /**
     * Get all owners
     */
    getAllOwners() {
        return Array.from(this.owners.values());
    }
    /**
     * Get all entries
     */
    getAllEntries() {
        return [...this.entries];
    }
    /**
     * Export to matrix format
     */
    toMatrix() {
        return {
            version: this.version,
            lastUpdated: this.lastUpdated,
            owners: this.getAllOwners(),
            entries: this.getAllEntries(),
        };
    }
    /**
     * Import from matrix format
     */
    static fromMatrix(matrix) {
        const validated = exports.OwnershipMatrixSchema.parse(matrix);
        const manager = new OwnershipMatrixManager();
        manager.version = validated.version;
        manager.lastUpdated = validated.lastUpdated;
        for (const owner of validated.owners) {
            manager.registerOwner(owner);
        }
        for (const entry of validated.entries) {
            manager.addEntry(entry);
        }
        return manager;
    }
    /**
     * Generate CODEOWNERS file content
     */
    generateCodeowners() {
        const lines = [
            '# CODEOWNERS file generated by @intelgraph/platform-governance',
            `# Generated: ${new Date().toISOString()}`,
            '',
        ];
        const pathEntries = this.entries.filter(e => e.patternType === 'path');
        for (const entry of pathEntries) {
            const primaryOwners = entry.owners
                .filter(o => o.level === 'primary')
                .map(o => {
                const owner = this.owners.get(o.ownerId);
                if (!owner)
                    return null;
                // Find GitHub-compatible contact
                const emailContact = owner.contacts.find(c => c.email);
                if (emailContact?.email) {
                    return emailContact.email;
                }
                // Use team name format
                return `@${owner.name.toLowerCase().replace(/\s+/g, '-')}`;
            })
                .filter(Boolean);
            if (primaryOwners.length > 0) {
                lines.push(`${entry.pattern} ${primaryOwners.join(' ')}`);
            }
        }
        return lines.join('\n');
    }
    /**
     * Validate ownership coverage
     */
    validateCoverage(paths) {
        const covered = [];
        const uncovered = [];
        for (const path of paths) {
            const owners = this.findOwners(path, 'path');
            if (owners.length > 0) {
                covered.push(path);
            }
            else {
                uncovered.push(path);
            }
        }
        return {
            covered,
            uncovered,
            coverage: paths.length > 0 ? (covered.length / paths.length) * 100 : 100,
        };
    }
}
exports.OwnershipMatrixManager = OwnershipMatrixManager;
/**
 * Create ownership matrix manager
 */
function createOwnershipManager() {
    return new OwnershipMatrixManager();
}
/**
 * Default ownership matrix instance
 */
exports.ownershipMatrix = createOwnershipManager();
