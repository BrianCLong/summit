
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { parseQuery } from '../query-parser.js';

describe('parseQuery', () => {
  it('parses basic terms', () => {
    const res = parseQuery('hello world');
    expect(res.term).toBe('hello world');
  });

  it('parses filters', () => {
    const res = parseQuery('status:open owner:me bug');
    expect(res.term).toBe('bug');
    expect(res.filters['status']).toBe('open');
    expect(res.filters['owner']).toBe('me');
  });

  it('parses quoted filters', () => {
    const res = parseQuery('title:"severe bug"');
    expect(res.filters['title']).toBe('severe bug');
    expect(res.term).toBe('');
  });

  it('parses temporal operators', () => {
    const res = parseQuery('since:2023-01-01');
    expect(res.temporal).toHaveLength(1);
    expect(res.temporal[0]).toEqual({
      field: 'created_at',
      operator: '>=',
      value: '2023-01-01'
    });
  });

  it('parses entities', () => {
    const res = parseQuery('entity:Intel person:Alice');
    expect(res.entities).toContain('Intel');
    expect(res.entities).toContain('Alice');
  });

  it('parses relationships', () => {
    const res = parseQuery('rel:ProjectX');
    expect(res.relationships).toHaveLength(1);
    expect(res.relationships[0]).toEqual({
      type: 'RELATED_TO',
      target: 'ProjectX'
    });
  });
});
