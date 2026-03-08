"use strict";
/**
 * Base Factory System
 *
 * Provides a type-safe, extensible factory pattern for generating test data.
 * Supports traits, sequences, associations, and custom builders.
 *
 * @module tests/factories/base
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.random = exports.BaseFactory = exports.Sequence = void 0;
exports.getSequence = getSequence;
exports.resetAllSequences = resetAllSequences;
exports.defineFactory = defineFactory;
const crypto_1 = require("crypto");
/**
 * Sequence generator for creating unique incrementing values
 */
class Sequence {
    current;
    constructor(start = 1) {
        this.current = start;
    }
    next() {
        return this.current++;
    }
    reset(value = 1) {
        this.current = value;
    }
}
exports.Sequence = Sequence;
/**
 * Global sequence registry for shared sequences across factories
 */
const sequenceRegistry = new Map();
function getSequence(name, start = 1) {
    if (!sequenceRegistry.has(name)) {
        sequenceRegistry.set(name, new Sequence(start));
    }
    return sequenceRegistry.get(name);
}
function resetAllSequences() {
    sequenceRegistry.forEach((seq) => seq.reset());
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
class BaseFactory {
    definition;
    constructor(definition) {
        this.definition = definition;
    }
    /**
     * Start building with fluent API
     */
    get with() {
        return this.createBuilder();
    }
    /**
     * Build a single entity with optional overrides
     */
    build(overrides = {}) {
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
    async buildAsync(overrides = {}) {
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
    buildList(count, overrides = {}) {
        return Array.from({ length: count }, () => this.build(overrides));
    }
    /**
     * Build multiple entities with async hooks
     */
    async buildListAsync(count, overrides = {}) {
        return Promise.all(Array.from({ length: count }, () => this.buildAsync(overrides)));
    }
    /**
     * Build with a specific trait applied
     */
    buildWithTrait(traitName, overrides = {}) {
        return this.with.trait(traitName).attrs(overrides).build();
    }
    /**
     * Build with multiple traits applied
     */
    buildWithTraits(traitNames, overrides = {}) {
        return this.with.traits(...traitNames).attrs(overrides).build();
    }
    /**
     * Create a child factory with additional defaults
     */
    extend(additionalDefinition) {
        return new BaseFactory({
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
    createBuilder() {
        const appliedTraits = [];
        let attributeOverrides = {};
        const builder = {
            trait: (name) => {
                appliedTraits.push(name);
                return builder;
            },
            traits: (...names) => {
                appliedTraits.push(...names);
                return builder;
            },
            attrs: (overrides) => {
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
            buildList: (count) => {
                return Array.from({ length: count }, () => builder.build());
            },
            buildListAsync: async (count) => {
                return Promise.all(Array.from({ length: count }, () => builder.buildAsync()));
            },
        };
        return builder;
    }
}
exports.BaseFactory = BaseFactory;
/**
 * Helper function to create a factory with less boilerplate
 */
function defineFactory(definition) {
    return new BaseFactory(definition);
}
/**
 * Helper to generate random data
 */
exports.random = {
    uuid: () => (0, crypto_1.randomUUID)(),
    email: (prefix) => {
        const id = getSequence('email').next();
        return `${prefix || 'test'}-${id}@test.intelgraph.local`;
    },
    string: (length = 10) => {
        const chars = 'abcdefghijklmnopqrstuvwxyz';
        return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    },
    number: (min = 0, max = 100) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    boolean: () => Math.random() > 0.5,
    date: (daysAgo = 30) => {
        const now = new Date();
        const past = new Date(now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000);
        return past;
    },
    pick: (array) => array[Math.floor(Math.random() * array.length)],
    ipv4: () => {
        return Array.from({ length: 4 }, () => exports.random.number(0, 255)).join('.');
    },
    domain: () => {
        const tlds = ['com', 'org', 'net', 'io', 'co'];
        return `${exports.random.string(8)}.${exports.random.pick(tlds)}`;
    },
};
exports.default = BaseFactory;
