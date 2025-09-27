import { GraphQLError } from "graphql";
import { evaluate } from "../services/AccessControl.js";

export function withPolicy(action: string, resolver: any) {
  return async (parent: any, args: any, context: any, info: any) => {
    const decision = await evaluate(
      action,
      context.user,
      { args, parent },
      { tenant: context?.tenant },
    );
    if (!decision.allow) {
      throw new GraphQLError("Forbidden", {
        extensions: {
          code: "FORBIDDEN",
          reason: decision.reason || "policy_denied",
        },
      });
    }
    return resolver(parent, args, context, info);
  };
}

export function wrapResolversWithPolicy(namespace: string, resolvers: any) {
  const wrap = (type: "Query" | "Mutation") => {
    const src = resolvers[type] || {};
    return Object.fromEntries(
      Object.entries(src).map(([name, fn]) => [
        name,
        withPolicy(`${namespace}.${type}.${name}`, fn as any),
      ]),
    );
  };
  return {
    ...resolvers,
    Query: wrap("Query"),
    Mutation: wrap("Mutation"),
  };
}
