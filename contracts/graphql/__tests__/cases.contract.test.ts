import fs from 'fs';
import path from 'path';
import { parse } from 'graphql';

const golden = fs.readFileSync(path.join(__dirname, '..', 'cases.golden.graphql'), 'utf8');

describe('cases GraphQL contract', () => {
  it('golden SDL is well-formed and declares CaseSpace', () => {
    expect(() => parse(golden)).not.toThrow();
    expect(golden).toContain('type CaseSpace');
  });
});
