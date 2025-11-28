import { z } from 'zod';
import {
  classificationLevels,
  taxonomySchema,
  type Classification,
  type DocumentTag,
  type TaxonomyEntry
} from './config.js';
import { ChmEventBus } from './events.js';

export class TaxonomyRegistry {
  private readonly taxonomy = new Map<string, TaxonomyEntry>();
  private readonly bus: ChmEventBus;

  constructor(bus: ChmEventBus, entries: TaxonomyEntry[]) {
    this.bus = bus;
    entries.forEach((entry) => {
      const parsed = taxonomySchema.parse(entry);
      this.taxonomy.set(parsed.code, parsed);
    });
  }

  list(): TaxonomyEntry[] {
    return Array.from(this.taxonomy.values());
  }

  get(code: string): TaxonomyEntry | undefined {
    return this.taxonomy.get(code);
  }

  applyTag(documentId: string, code: string, derivedFrom?: string): DocumentTag {
    const entry = this.taxonomy.get(code);
    if (!entry) {
      throw new Error(`Unknown taxonomy code ${code}`);
    }
    const tag: DocumentTag = {
      documentId,
      tag: code,
      classification: entry.level,
      derivedFrom
    };
    this.bus.emitTagApplied(tag);
    return tag;
  }

  canDowngrade(current: Classification, target: Classification): boolean {
    if (current === target) return true;
    const currentIdx = classificationLevels.indexOf(current);
    const targetIdx = classificationLevels.indexOf(target);
    return targetIdx >= 0 && targetIdx > currentIdx;
  }

  downgradeTag(existing: DocumentTag, targetLevel: Classification, approvers: string[]): DocumentTag {
    const entry = this.taxonomy.get(existing.tag);
    if (!entry) throw new Error(`Unknown taxonomy code ${existing.tag}`);
    if (!entry.downgradeTo.includes(targetLevel) || !this.canDowngrade(existing.classification, targetLevel)) {
      throw new Error(`Downgrade from ${existing.classification} to ${targetLevel} not permitted`);
    }
    const downgraded: DocumentTag = {
      ...existing,
      classification: targetLevel
    };
    this.bus.emitTagDowngraded(existing, downgraded, approvers);
    return downgraded;
  }

  upsert(entry: TaxonomyEntry) {
    const parsed = taxonomySchema.parse(entry);
    this.taxonomy.set(parsed.code, parsed);
  }
}

export const defaultTaxonomy = [
  {
    code: 'CHM-TS',
    description: 'Top secret handling with strict residency',
    level: 'TS',
    downgradeTo: ['S', 'C']
  },
  {
    code: 'CHM-S',
    description: 'Secret handling with controlled distribution',
    level: 'S',
    downgradeTo: ['C', 'U']
  },
  {
    code: 'CHM-C',
    description: 'Confidential materials',
    level: 'C',
    downgradeTo: ['U']
  },
  {
    code: 'CHM-U',
    description: 'Unclassified but tracked content',
    level: 'U',
    downgradeTo: ['U']
  }
];

export function parseTaxonomy(input: unknown): TaxonomyEntry[] {
  const schema = z.array(taxonomySchema);
  return schema.parse(input);
}
