/**
 * Entity Resolution Tests
 */

import { EntityExtractor } from '../extraction/EntityExtractor.js';
import { EntityMatcher, MatchingMethod } from '../matching/EntityMatcher.js';
import { EntityType, Entity } from '../types.js';

describe('EntityExtractor', () => {
  let extractor: EntityExtractor;

  beforeEach(() => {
    extractor = new EntityExtractor({
      confidenceThreshold: 0.5,
      includeContext: true
    });
  });

  test('should extract email addresses', async () => {
    const text = 'Contact John at john.doe@example.com for more info.';
    const result = await extractor.extract(text);

    const emails = result.entities.filter(e => e.type === EntityType.EMAIL);
    expect(emails.length).toBe(1);
    expect(emails[0].text).toBe('john.doe@example.com');
  });

  test('should extract phone numbers', async () => {
    const text = 'Call us at (555) 123-4567 or 555-987-6543';
    const result = await extractor.extract(text);

    const phones = result.entities.filter(e => e.type === EntityType.PHONE);
    expect(phones.length).toBeGreaterThanOrEqual(1);
  });

  test('should extract URLs', async () => {
    const text = 'Visit https://www.example.com for more information.';
    const result = await extractor.extract(text);

    const urls = result.entities.filter(e => e.type === EntityType.URL);
    expect(urls.length).toBe(1);
    expect(urls[0].attributes.domain).toBe('www.example.com');
  });

  test('should return extraction metadata', async () => {
    const text = 'Sample text with john@test.com';
    const result = await extractor.extract(text);

    expect(result.text).toBe(text);
    expect(result.metadata.extractionTime).toBeGreaterThanOrEqual(0);
    expect(result.metadata.model).toBeDefined();
  });
});

describe('EntityMatcher', () => {
  let matcher: EntityMatcher;

  beforeEach(() => {
    matcher = new EntityMatcher({
      threshold: 0.7,
      methods: [MatchingMethod.EXACT, MatchingMethod.FUZZY]
    });
  });

  const createEntity = (id: string, text: string, type: EntityType = EntityType.PERSON): Entity => ({
    id,
    type,
    text,
    attributes: {},
    confidence: 0.9
  });

  test('should find exact match', async () => {
    const entity1 = createEntity('1', 'John Doe');
    const entity2 = createEntity('2', 'John Doe');

    const match = await matcher.matchPair(entity1, entity2);

    expect(match).not.toBeNull();
    expect(match!.score).toBeGreaterThan(0.9);
  });

  test('should find fuzzy match', async () => {
    const entity1 = createEntity('1', 'John Doe');
    const entity2 = createEntity('2', 'Jon Doe');

    const match = await matcher.matchPair(entity1, entity2);

    expect(match).not.toBeNull();
    expect(match!.score).toBeGreaterThan(0.7);
  });

  test('should not match different types', async () => {
    const entity1 = createEntity('1', 'Acme Corp', EntityType.PERSON);
    const entity2 = createEntity('2', 'Acme Corp', EntityType.ORGANIZATION);

    const match = await matcher.matchPair(entity1, entity2);

    expect(match).toBeNull();
  });

  test('should find matches in candidate list', async () => {
    const entity = createEntity('1', 'John Doe');
    const candidates = [
      createEntity('2', 'Jane Smith'),
      createEntity('3', 'John Doe'),
      createEntity('4', 'Jon Doe'),
      createEntity('5', 'Bob Wilson')
    ];

    const matches = await matcher.findMatches(entity, candidates);

    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches[0].entity2.text).toBe('John Doe');
  });

  test('should provide match reasons', async () => {
    const entity1 = createEntity('1', 'John Doe');
    const entity2 = createEntity('2', 'John Doe');

    const match = await matcher.matchPair(entity1, entity2);

    expect(match!.reasons.length).toBeGreaterThan(0);
  });
});
