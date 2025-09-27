import { Kind, visit, ValidationContext, ASTNode } from 'graphql';

// Simple GraphQL depth limit validation rule (no fragments support complexity beyond depth)
export function depthLimit(maxDepth: number = 10) {
  return (context: ValidationContext) => {
    const operationName = context.getOperation() && context.getOperation()?.name ? context.getOperation()?.name?.value : 'anonymous';

    function checkDepth(node: ASTNode, depth: number): boolean {
      if (depth > maxDepth) {
        context.reportError(new Error(`Query is too deep: depth ${depth} > ${maxDepth} (operation: ${operationName})`));
        return false;
      }
      return true;
    }

    return {
      [Kind.SELECTION_SET](node: ASTNode) {
        const depth = context.getAncestors().filter(a => a.kind === Kind.SELECTION_SET).length + 1;
        checkDepth(node, depth);
      },
    };
  };
}

export { depthLimit };
