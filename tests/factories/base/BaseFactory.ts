/**
 * Base Factory System
 *
 * Provides a type-safe, extensible factory pattern for generating test data.
 * Supports traits, sequences, associations, and custom builders.
 *
 * @module tests/factories/base
 */

import { randomUUID } from 'crypto';

/**
 * Sequence generator for creating unique incrementing values
 */
export class Sequence {
  private current: number;

  constructor(start: number = 1) {
    this.current = start;
  }

  next(): number {
    return this.current++;
  }

  reset(value: number = 1): void {
    this.current = value;
  }
}

/**
 * Global sequence registry for shared sequences across factories
 */
const sequenceRegistry = new Map<string, Sequence>();

export function getSequence(name: string, start: number = 1): Sequence {
  if (!sequenceRegistry.has(name)) {
    sequenceRegistry.set(name, new Sequence(start));
  }
  return sequenceRegistry.get(name)!;
}

export function resetAllSequences(): void {
  sequenceRegistry.forEach((seq) => seq.reset());
}

/**
 * Trait definition for factory customization
 */
export type Trait<T> = Partial<T> | ((base: T) => Partial<T>);

/**
 * Factory definition configuration
 */
export interface FactoryDefinition<T> {
  /** Default attributes generator */
  defaults: () => T;
  /** Named traits for common variations */
  traits?: Record<string, Trait<T>>;
  /** Post-build hooks */
  afterBuild?: (entity: T) => T | void;
  /** Async post-build hooks */
  afterBuildAsync?: (entity: T) => Promise<T | void>;
}

/**
 * Builder interface for fluent API
 */
export interface FactoryBuilder<T> {
  /** Apply a trait by name */
  trait(name: string): FactoryBuilder<T>;
  /** Apply multiple traits */
  traits(...names: string[]): FactoryBuilder<T>;
  /** Override specific attributes */
  attrs(overrides: Partial<T>): FactoryBuilder<T>;
  /** Build a single entity */
  build(): T;
  /** Build a single entity with async hooks */
  buildAsync(): Promise<T>;
  /** Build multiple entities */
  buildList(count: number): T[];
  /** Build multiple entities with async hooks */
  buildListAsync(count: number): Promise<T[]>;
}

/**
 * Base Factory class for creating test entities
 *
 * @example
 * ```typescript
 * const userFactory = new BaseFactory<User>({
 *   defaults: () => ({
 *     id: randomUUID(),
 *     email: `user-${getSequence('user').next()}@test.com`,
 *     role: 'analyst',
 *   }),
 *   traits: {
 *     admin: { role: 'admin' },
 *     inactive: { isActive: false },
 *   },
 * });
 *
 * // Usage
 * const user = userFactory.build();
 * const admin = userFactory.with.trait('admin').build();
 * const users = userFactory.buildList(5);
 * ```
 */
export class BaseFactory<T extends Record<string, any>> {
  private definition: FactoryDefinition<T>;

  constructor(definition: FactoryDefinition<T>) {
    this.definition = definition;
  }

  /**
   * Start building with fluent API
   */
  get with(): FactoryBuilder<T> {
    return this.createBuilder();
  }

  /**
   * Build a single entity with optional overrides
   */
  build(overrides: Partial<T> = {}): T {
    const base = this.definition.defaults();
    const merged = { ...base, ...overrides };

    if (this.definition.afterBuild) {
      const result = this.definition.afterBuild(merged);
      return result !== undefined ? result : merged;
    }

    return merged;
  }

  /**
   * Build a single entity with async hooks
   */
  async buildAsync(overrides: Partial<T> = {}): Promise<T> {
    let entity = this.build(overrides);

    if (this.definition.afterBuildAsync) {
      const result = await this.definition.afterBuildAsync(entity);
      entity = result !== undefined ? result : entity;
    }

    return entity;
  }

  /**
   * Build multiple entities
   */
  buildList(count: number, overrides: Partial<T> = {}): T[] {
    return Array.from({ length: count }, () => this.build(overrides));
  }

  /**
   * Build multiple entities with async hooks
   */
  async buildListAsync(count: number, overrides: Partial<T> = {}): Promise<T[]> {
    return Promise.all(
      Array.from({ length: count }, () => this.buildAsync(overrides))
    );
  }

  /**
   * Build with a specific trait applied
   */
  buildWithTrait(traitName: string, overrides: Partial<T> = {}): T {
    return this.with.trait(traitName).attrs(overrides).build();
  }

  /**
   * Build with multiple traits applied
   */
  buildWithTraits(traitNames: string[], overrides: Partial<T> = {}): T {
    return this.with.traits(...traitNames).attrs(overrides).build();
  }

  /**
   * Create a child factory with additional defaults
   */
  extend(additionalDefinition: Partial<FactoryDefinition<T>>): BaseFactory<T> {
    return new BaseFactory<T>({
      defaults: () => ({
        ...this.definition.defaults(),
        ...(additionalDefinition.defaults?.() || {}),
      }),
      traits: {
        ...this.definition.traits,
        ...additionalDefinition.traits,
      },
      afterBuild: additionalDefinition.afterBuild || this.definition.afterBuild,
      afterBuildAsync: additionalDefinition.afterBuildAsync || this.definition.afterBuildAsync,
    });
  }

  /**
   * Create a builder for fluent API usage
   */
  private createBuilder(): FactoryBuilder<T> {
    const appliedTraits: string[] = [];
    let attributeOverrides: Partial<T> = {};

    const builder: FactoryBuilder<T> = {
      trait: (name: string) => {
        appliedTraits.push(name);
        return builder;
      },
      traits: (...names: string[]) => {
        appliedTraits.push(...names);
        return builder;
      },
      attrs: (overrides: Partial<T>) => {
        attributeOverrides = { ...attributeOverrides, ...overrides };
        return builder;
      },
      build: () => {
        let entity = this.definition.defaults();

        // Apply traits in order
        for (const traitName of appliedTraits) {
          const trait = this.definition.traits?.[traitName];
          if (!trait) {
            throw new Error(`Unknown trait: ${traitName}`);
          }
          const traitValues = typeof trait === 'function' ? trait(entity) : trait;
          entity = { ...entity, ...traitValues };
        }

        // Apply attribute overrides
        entity = { ...entity, ...attributeOverrides };

        // Run afterBuild hook
        if (this.definition.afterBuild) {
          const result = this.definition.afterBuild(entity);
          entity = result !== undefined ? result : entity;
        }

        return entity;
      },
      buildAsync: async () => {
        let entity = builder.build();

        if (this.definition.afterBuildAsync) {
          const result = await this.definition.afterBuildAsync(entity);
          entity = result !== undefined ? result : entity;
        }

        return entity;
      },
      buildList: (count: number) => {
        return Array.from({ length: count }, () => builder.build());
      },
      buildListAsync: async (count: number) => {
        return Promise.all(
          Array.from({ length: count }, () => builder.buildAsync())
        );
      },
    };

    return builder;
  }
}

/**
 * Helper function to create a factory with less boilerplate
 */
export function defineFactory<T extends Record<string, any>>(
  definition: FactoryDefinition<T>
): BaseFactory<T> {
  return new BaseFactory<T>(definition);
}

/**
 * Helper to generate random data
 */
export const random = {
  uuid: () => randomUUID(),
  email: (prefix?: string) => {
    const id = getSequence('email').next();
    return `${prefix || 'test'}-${id}@test.intelgraph.local`;
  },
  string: (length: number = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  },
  number: (min: number = 0, max: number = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  },
  boolean: () => Math.random() > 0.5,
  date: (daysAgo: number = 30) => {
    const now = new Date();
    const past = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
    return past;
  },
  pick: <T>(array: T[]): T => array[Math.floor(Math.random() * array.length)],
  ipv4: () => {
    return Array.from({ length: 4 }, () => random.number(0, 255)).join('.');
  },
  domain: () => {
    const tlds = ['com', 'org', 'net', 'io', 'co'];
    return `${random.string(8)}.${random.pick(tlds)}`;
  },
};

export default BaseFactory;
