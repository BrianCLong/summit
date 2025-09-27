const { Kind, visit } = require('graphql');

// Simple GraphQL depth limit validation rule (no fragments support complexity beyond depth)
function depthLimit(maxDepth = 10) {
  return (context) => {
    const operationName = context.getOperation() && context.getOperation().name ? context.getOperation().name.value : 'anonymous';

    function checkDepth(node, depth) {
      if (depth > maxDepth) {
        context.reportError(new Error(`Query is too deep: depth ${depth} > ${maxDepth} (operation: ${operationName})`));
        return false;
      }
      return true;
    }

    return {
      [Kind.SELECTION_SET](node) {
        const depth = context.getAncestors().filter(a => a.kind === Kind.SELECTION_SET).length + 1;
        checkDepth(node, depth);
      },
    };
  };
}

module.exports = { depthLimit };

