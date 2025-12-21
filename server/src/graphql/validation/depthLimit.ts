import { ValidationContext, GraphQLError, OperationDefinitionNode, SelectionSetNode } from 'graphql';

export function depthLimit(maxDepth: number = 10) {
  return (context: ValidationContext) => {
    let currentDepth = 0;
    let operationName = 'anonymous'; // Default operation name

    return {
      OperationDefinition: {
        enter(node: OperationDefinitionNode) {
          if (node.name && node.name.value) {
            operationName = node.name.value;
          }
        },
        leave() {
          operationName = 'anonymous'; // Reset for next operation
        },
      },
      SelectionSet: {
        enter(_node: SelectionSetNode) {
          currentDepth++;
          if (currentDepth > maxDepth) {
            context.reportError(
              new GraphQLError(
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
}
