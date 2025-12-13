/**
 * P48-49: Ownership Matrix
 * Service and code ownership tracking
 */

import { z } from 'zod';

/**
 * Owner type
 */
export type OwnerType = 'team' | 'individual' | 'squad' | 'guild';

/**
 * Escalation level
 */
export type EscalationLevel = 'primary' | 'secondary' | 'tertiary';

/**
 * Owner contact schema
 */
export const OwnerContactSchema = z.object({
  name: z.string(),
  email: z.string().email().optional(),
  slack: z.string().optional(),
  pagerduty: z.string().optional(),
});

export type OwnerContact = z.infer<typeof OwnerContactSchema>;

/**
 * Owner schema
 */
export const OwnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['team', 'individual', 'squad', 'guild']),
  contacts: z.array(OwnerContactSchema),
  escalationChain: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type Owner = z.infer<typeof OwnerSchema>;

/**
 * Ownership entry schema
 */
export const OwnershipEntrySchema = z.object({
  id: z.string(),
  pattern: z.string(), // Glob pattern for matching
  patternType: z.enum(['path', 'service', 'domain', 'component']),
  owners: z.array(z.object({
    ownerId: z.string(),
    level: z.enum(['primary', 'secondary', 'tertiary']),
    responsibilities: z.array(z.string()).optional(),
  })),
  description: z.string().optional(),
  documentation: z.string().optional(),
  sla: z.object({
    responseTime: z.string().optional(),
    resolutionTime: z.string().optional(),
  }).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type OwnershipEntry = z.infer<typeof OwnershipEntrySchema>;

/**
 * Ownership matrix schema
 */
export const OwnershipMatrixSchema = z.object({
  version: z.string(),
  lastUpdated: z.date(),
  owners: z.array(OwnerSchema),
  entries: z.array(OwnershipEntrySchema),
});

export type OwnershipMatrix = z.infer<typeof OwnershipMatrixSchema>;

/**
 * Match a pattern against a target
 */
function matchPattern(pattern: string, target: string): boolean {
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
export class OwnershipMatrixManager {
  private owners: Map<string, Owner> = new Map();
  private entries: OwnershipEntry[] = [];
  private version: string = '1.0.0';
  private lastUpdated: Date = new Date();

  /**
   * Register an owner
   */
  registerOwner(owner: Owner): void {
    const validated = OwnerSchema.parse(owner);
    this.owners.set(validated.id, validated);
    this.lastUpdated = new Date();
  }

  /**
   * Get an owner by ID
   */
  getOwner(ownerId: string): Owner | undefined {
    return this.owners.get(ownerId);
  }

  /**
   * Add an ownership entry
   */
  addEntry(entry: OwnershipEntry): void {
    const validated = OwnershipEntrySchema.parse(entry);
    this.entries.push(validated);
    this.lastUpdated = new Date();
  }

  /**
   * Find owners for a target
   */
  findOwners(
    target: string,
    patternType: OwnershipEntry['patternType'] = 'path'
  ): Array<{
    owner: Owner;
    level: EscalationLevel;
    entry: OwnershipEntry;
  }> {
    const results: Array<{
      owner: Owner;
      level: EscalationLevel;
      entry: OwnershipEntry;
    }> = [];

    for (const entry of this.entries) {
      if (entry.patternType !== patternType) continue;
      if (!matchPattern(entry.pattern, target)) continue;

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
    const levelOrder: Record<EscalationLevel, number> = {
      primary: 0,
      secondary: 1,
      tertiary: 2,
    };

    return results.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  }

  /**
   * Get primary owner for a target
   */
  getPrimaryOwner(
    target: string,
    patternType: OwnershipEntry['patternType'] = 'path'
  ): Owner | undefined {
    const owners = this.findOwners(target, patternType);
    const primary = owners.find(o => o.level === 'primary');
    return primary?.owner;
  }

  /**
   * Get all owners
   */
  getAllOwners(): Owner[] {
    return Array.from(this.owners.values());
  }

  /**
   * Get all entries
   */
  getAllEntries(): OwnershipEntry[] {
    return [...this.entries];
  }

  /**
   * Export to matrix format
   */
  toMatrix(): OwnershipMatrix {
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
  static fromMatrix(matrix: OwnershipMatrix): OwnershipMatrixManager {
    const validated = OwnershipMatrixSchema.parse(matrix);
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
  generateCodeowners(): string {
    const lines: string[] = [
      '# CODEOWNERS file generated by @summit/platform-governance',
      `# Generated: ${new Date().toISOString()}`,
      '',
    ];

    const pathEntries = this.entries.filter(e => e.patternType === 'path');

    for (const entry of pathEntries) {
      const primaryOwners = entry.owners
        .filter(o => o.level === 'primary')
        .map(o => {
          const owner = this.owners.get(o.ownerId);
          if (!owner) return null;

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
  validateCoverage(paths: string[]): {
    covered: string[];
    uncovered: string[];
    coverage: number;
  } {
    const covered: string[] = [];
    const uncovered: string[] = [];

    for (const path of paths) {
      const owners = this.findOwners(path, 'path');
      if (owners.length > 0) {
        covered.push(path);
      } else {
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

/**
 * Create ownership matrix manager
 */
export function createOwnershipManager(): OwnershipMatrixManager {
  return new OwnershipMatrixManager();
}

/**
 * Default ownership matrix instance
 */
export const ownershipMatrix = createOwnershipManager();
