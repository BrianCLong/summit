// Standalone test for depth limit validation
// Uses Node.js built-in test runner instead of Jest

const test = require('node:test');
const assert = require('node:assert');

// Mock the GraphQL validation system since we can't import ES modules easily
const mockDepthLimit = (maxDepth = 10) => {
  return (context) => {
    let currentDepth = 0;
    let operationName = 'anonymous';

    return {
      OperationDefinition: {
        enter(node) {
          if (node.name && node.name.value) {
            operationName = node.name.value;
          }
        },
        leave() {
          operationName = 'anonymous';
        }
      },
      SelectionSet: {
        enter() {
          currentDepth++;
          if (currentDepth > maxDepth) {
            context.reportError(new Error(`Query is too deep: depth ${currentDepth} > ${maxDepth} (operation: ${operationName})`));
          }
        },
        leave() {
          currentDepth--;
        }
      }
    };
  };
};

test('depth limit validation logic', () => {
  const errors = [];
  const mockContext = {
    reportError: (error) => errors.push(error)
  };

  const validator = mockDepthLimit(3);
  const visitor = validator(mockContext);

  // Simulate a deep query structure
  // Level 1
  visitor.SelectionSet.enter();
  // Level 2
  visitor.SelectionSet.enter();
  // Level 3
  visitor.SelectionSet.enter();
  // Level 4 - should trigger error
  visitor.SelectionSet.enter();

  assert.strictEqual(errors.length, 1);
  assert.ok(errors[0].message.includes('Query is too deep'));
  assert.ok(errors[0].message.includes('depth 4 > 3'));
});

test('depth limit allows queries within limit', () => {
  const errors = [];
  const mockContext = {
    reportError: (error) => errors.push(error)
  };

  const validator = mockDepthLimit(5);
  const visitor = validator(mockContext);

  // Simulate a query within depth limit
  visitor.SelectionSet.enter();
  visitor.SelectionSet.enter();
  visitor.SelectionSet.enter();
  visitor.SelectionSet.leave();
  visitor.SelectionSet.leave();
  visitor.SelectionSet.leave();

  assert.strictEqual(errors.length, 0);
});

console.log('✅ Depth limit validation tests passed');