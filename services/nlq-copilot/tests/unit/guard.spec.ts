import { estimate, forbidDangerous } from '../../src/guard';

describe('guard', () => {
  it('blocks dangerous cypher', () => {
    expect(() => forbidDangerous('MATCH (n) DETACH DELETE n')).toThrow('dangerous_query');
  });

  it('estimates rows from limit', () => {
    expect(estimate('MATCH (n) RETURN n LIMIT 25').rows).toBe(25);
  });
});
