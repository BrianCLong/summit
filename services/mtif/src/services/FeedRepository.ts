import { randomUUID } from 'node:crypto';
import type {
  CollectionRecord,
  ObjectQueryOptions,
  PaginatedResult,
  StixBundle,
  StixObject
} from '../types.js';
import { stixValidator } from './StixValidator.js';

interface StoredObject {
  object: StixObject;
  modified: string;
  id: string;
}

interface CollectionState extends CollectionRecord {
  objects: StoredObject[];
}

export class FeedRepository {
  private readonly collections = new Map<string, CollectionState>();

  constructor(initialCollections?: CollectionRecord[]) {
    initialCollections?.forEach((collection) => {
      this.collections.set(collection.id, { ...collection, objects: [] });
    });
  }

  upsertCollection(collection: CollectionRecord): void {
    const existing = this.collections.get(collection.id);
    if (existing) {
      existing.title = collection.title;
      existing.description = collection.description;
      existing.alias = collection.alias;
      existing.can_read = collection.can_read;
      existing.can_write = collection.can_write;
      return;
    }
    this.collections.set(collection.id, { ...collection, objects: [] });
  }

  listCollections(): CollectionRecord[] {
    return Array.from(this.collections.values()).map(({ objects: _objects, ...rest }) => rest);
  }

  ingestBundle(collectionId: string, bundle: StixBundle): void {
    if (!this.collections.has(collectionId)) {
      this.upsertCollection({
        id: collectionId,
        alias: 'mtif-llm-threats',
        title: 'Model Threat Intelligence Feed',
        description: 'STIX 2.1 bundle of LLM threat intelligence artifacts',
        can_read: true,
        can_write: true
      });
    }

    stixValidator.validateBundle(bundle);

    const state = this.collections.get(collectionId);
    if (!state) {
      throw new Error(`Collection ${collectionId} not found after creation`);
    }

    for (const object of bundle.objects) {
      const modified = object.modified ?? object.created;
      state.objects.push({
        object,
        modified,
        id: `${object.type}::${object.id}`
      });
    }

    state.objects.sort((a, b) => {
      if (a.modified === b.modified) {
        return a.id.localeCompare(b.id);
      }
      return a.modified.localeCompare(b.modified);
    });
  }

  getObjects(collectionId: string, options: ObjectQueryOptions = {}): PaginatedResult<StixObject> {
    const state = this.collections.get(collectionId);
    if (!state) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const limit = Math.max(1, Math.min(options.limit ?? 10, 1000));
    let startIndex = 0;

    if (options.next) {
      try {
        const decoded = JSON.parse(Buffer.from(options.next, 'base64url').toString('utf-8')) as {
          index: number;
          token: string;
        };
        if (decoded.token !== state.id) {
          throw new Error('Next token does not match collection');
        }
        startIndex = decoded.index;
      } catch (error) {
        throw new Error(`Invalid pagination token: ${(error as Error).message}`);
      }
    }

    let filtered = state.objects;

    if (options.added_after) {
      filtered = filtered.filter((entry) => entry.modified > options.added_after!);
    }

    if (options.match) {
      filtered = filtered.filter(({ object }) => {
        return Object.entries(options.match as Record<string, string>).every(([key, value]) => {
          const objectValue = (object as unknown as Record<string, unknown>)[key];
          if (Array.isArray(objectValue)) {
            return objectValue.includes(value);
          }
          return objectValue === value;
        });
      });
    }

    const slice = filtered.slice(startIndex, startIndex + limit).map((entry) => entry.object);
    const more = startIndex + limit < filtered.length;

    return {
      objects: slice,
      more,
      next: more
        ? Buffer.from(
            JSON.stringify({ index: startIndex + limit, token: state.id }),
            'utf-8'
          ).toString('base64url')
        : undefined
    };
  }

  exportBundle(collectionId: string, objectIds: string[]): StixBundle {
    const state = this.collections.get(collectionId);
    if (!state) {
      throw new Error(`Collection ${collectionId} not found`);
    }

    const objects = state.objects
      .filter(({ object }) => objectIds.includes(object.id))
      .map(({ object }) => object);

    const bundle: StixBundle = {
      id: `bundle--${randomUUID()}`,
      spec_version: '2.1',
      type: 'bundle',
      objects
    };

    stixValidator.validateBundle(bundle);

    return bundle;
  }
}

export const COLLECTION_DEFAULT_ID = 'collection--mtif-llm-threats';
