const providers = [];
export default {
    Query: {
        ssoProviders: () => providers,
    },
    Mutation: {
        configureSSO: (_, { type, issuer }) => {
            const p = { id: `${providers.length + 1}`, type, issuer };
            providers.push(p);
            return p;
        },
    },
};
//# sourceMappingURL=sso.js.map