import { CypherBuilder } from '../queryBuilder.js';

describe('CypherBuilder', () => {
  it('should build a simple match query', () => {
    const builder = new CypherBuilder();
    builder.match('(n:User)').return('n');

    const { query, params } = builder.build();
    expect(query).toContain('MATCH (n:User)');
    expect(query).toContain('RETURN n');
    expect(Object.keys(params).length).toBe(0);
  });

  it('should properly parameterize limits', () => {
    const builder = new CypherBuilder();
    builder.match('(n:User)').limit(5);

    const { query, params } = builder.build();
    expect(query).toContain('MATCH (n:User)');
    expect(query).toMatch(/LIMIT \$limit_0/);
    expect(params['limit_0']).toBe(5);
  });

  it('should parameterize properties using set', () => {
    const builder = new CypherBuilder();
    builder.merge('(n:User {id: "123"})').set('n', 'name', 'Alice');

    const { query, params } = builder.build();
    expect(query).toContain('MERGE (n:User {id: "123"})');
    expect(query).toMatch(/SET n.name = \$set_n_name_0/);
    expect(params['set_n_name_0']).toBe('Alice');
  });

  it('should parameterize unwind lists', () => {
    const builder = new CypherBuilder();
    builder.unwind('myList', 'item', [1, 2, 3]).return('item');

    const { query, params } = builder.build();
    expect(query).toMatch(/UNWIND \$myList_0 AS item/);
    expect(params['myList_0']).toEqual([1, 2, 3]);
  });
});
