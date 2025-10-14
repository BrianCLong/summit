import { GraphQLError } from "graphql";
import { evaluate } from "../services/AccessControl.js";
export function withPolicy(action, resolver) {
    return async (parent, args, context, info) => {
        const decision = await evaluate(action, context.user, { args, parent }, { tenant: context?.tenant });
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
export function wrapResolversWithPolicy(namespace, resolvers) {
    const wrap = (type) => {
        const src = resolvers[type] || {};
        return Object.fromEntries(Object.entries(src).map(([name, fn]) => [
            name,
            withPolicy(`${namespace}.${type}.${name}`, fn),
        ]));
    };
    return {
        ...resolvers,
        Query: wrap("Query"),
        Mutation: wrap("Mutation"),
    };
}
//# sourceMappingURL=policyWrapper.js.map