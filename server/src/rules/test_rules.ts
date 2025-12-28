import { evalCond } from './eval.js';
import { isSuppressed, suppressEntity } from './suppression.js';
import { strict as assert } from 'assert';

console.log('Testing Rules...');

// Test 1: Eval
const cond = {
  op: 'AND',
  children: [
    { op: 'PRED', predId: 'isBig', args: 10 },
    { op: 'PRED', predId: 'isEven', args: 10 }
  ]
} as const;

const env = (pred: string, args: any) => {
  if (pred === 'isBig') return args > 5;
  if (pred === 'isEven') return args % 2 === 0;
  return false;
};

assert.equal(evalCond(cond as any, env), true);

const cond2 = {
    op: 'OR',
    children: [
        { op: 'PRED', predId: 'isBig', args: 10 },
        { op: 'PRED', predId: 'isEven', args: 11 } // false
    ]
} as const;
assert.equal(evalCond(cond2 as any, env), true);

// Test 2: Suppression
const entityId = 'e-123';
assert.equal(isSuppressed(entityId), false);
suppressEntity(entityId, 1000); // 1s
assert.equal(isSuppressed(entityId), true);

// Mock time forward
const originalDateNow = Date.now;
Date.now = () => originalDateNow() + 2000;
assert.equal(isSuppressed(entityId), false);
Date.now = originalDateNow;

console.log('Rules tests passed!');
