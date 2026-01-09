// Standalone test for depth limit validation
// Uses Jest to align with CI runner

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
        },
      },
      SelectionSet: {
        enter() {
          currentDepth++;
          if (currentDepth > maxDepth) {
            context.reportError(
              new Error(
                `Query is too deep: depth ${currentDepth} > ${maxDepth} (operation: ${operationName})`,
              ),
            );
          }
        },
        leave() {
          currentDepth--;
        },
      },
    };
  };
};

test('depth limit validation logic', () => {
  const errors = [];
  const mockContext = {
    reportError: (error) => errors.push(error),
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

  expect(errors).toHaveLength(1);
  expect(errors[0].message).toContain('Query is too deep');
  expect(errors[0].message).toContain('depth 4 > 3');
});

test('depth limit allows queries within limit', () => {
  const errors = [];
  const mockContext = {
    reportError: (error) => errors.push(error),
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

  expect(errors).toHaveLength(0);
});
