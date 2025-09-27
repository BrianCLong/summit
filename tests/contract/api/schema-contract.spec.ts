import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildSchema, parse, validate, specifiedRules } from 'graphql';

describe('GraphQL schema contract', () => {
  const schemaPath = resolve(__dirname, '../../../api/graphql/schema.graphql');
  const schemaSDL = readFileSync(schemaPath, 'utf8');
  const schema = buildSchema(schemaSDL);

  it('matches the canonical hash to detect breaking changes', () => {
    const hash = createHash('sha256').update(schemaSDL).digest('hex');
    expect(hash).toBe('4f654a5c546b46f383ba2a40a2be77c2aae488de3fcc291f09772b7a163ace0b');
  });

  it('exposes the expected root operations', () => {
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();
    const subscriptionType = schema.getSubscriptionType();

    expect(queryType?.getFields()).toHaveProperty('entity');
    expect(queryType?.getFields()).toHaveProperty('entities');
    expect(queryType?.getFields()).toHaveProperty('entityMetrics');
    expect(mutationType?.getFields()).toHaveProperty('createEntity');
    expect(mutationType?.getFields()).toHaveProperty('createRelationship');
    expect(subscriptionType?.getFields()).toHaveProperty('entityUpdates');
  });

  it('validates persisted queries against the schema', () => {
    const persistedPath = resolve(__dirname, '../../../api/graphql/persisted-queries.json');
    const persisted = JSON.parse(readFileSync(persistedPath, 'utf8')) as Record<
      string,
      { query: string; cost: { estimated: number; weight: number }; operationName?: string }
    >;

    Object.entries(persisted).forEach(([hash, { query }]) => {
      const document = parse(query);
      const errors = validate(schema, document, specifiedRules);
      if (errors.length) {
        throw new Error(`Persisted query ${hash} is invalid: ${errors.map((err) => err.message).join(', ')}`);
      }
    });

    Object.values(persisted).forEach((entry) => {
      expect(entry.cost).toMatchObject({
        estimated: expect.any(Number),
        weight: expect.any(Number),
      });
      expect(entry.cost.estimated).toBeGreaterThan(0);
      expect(entry.cost.weight).toBeGreaterThan(0);
    });
  });
});
