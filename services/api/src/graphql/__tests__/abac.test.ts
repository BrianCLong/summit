// Jest test scaffold for ABAC helpers
import { filterFields } from '../abac.js';

describe('ABAC filterFields', () => {
  it('passes through when no fields provided', () => {
    const v = { id: '1', kind: 'Account', props: { name: 'A', ssn: 'x' } };
    expect(filterFields(v as any, [])).toEqual(v);
  });
  it('picks allowed top-level and nested fields', () => {
    const v = { id: '1', kind: 'Account', props: { name: 'A', ssn: 'x' }, secret: 'no' };
    const out = filterFields(v as any, ['id','kind','props:name']);
    expect(out).toEqual({ id:'1', kind:'Account', props: { name: 'A' } });
  });
});

