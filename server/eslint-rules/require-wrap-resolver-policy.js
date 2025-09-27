export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "ensure GraphQL resolvers are wrapped with policy enforcement",
    },
    schema: [],
  },
  create(context) {
    return {
      "ExportNamedDeclaration > VariableDeclaration > VariableDeclarator"(
        node,
      ) {
        if (node.id && node.id.name && node.id.name.endsWith("Resolvers")) {
          if (
            node.init.type !== "CallExpression" ||
            node.init.callee.name !== "wrapResolversWithPolicy"
          ) {
            context.report({
              node: node.init,
              message: "Resolvers must be wrapped with wrapResolversWithPolicy",
            });
          }
        }
      },
    };
  },
};
