const plugins = [];
export default {
    Query: {
        plugins: () => plugins,
    },
    Mutation: {
        installPlugin: (_, { name, version, signature, sbomDigest }) => {
            const p = { name, version, signature, sbomDigest, enabled: false };
            plugins.push(p);
            return p;
        },
        enablePlugin: (_, { name }) => {
            const p = plugins.find((pl) => pl.name === name);
            if (!p)
                throw new Error('not found');
            p.enabled = true;
            return p;
        },
    },
};
//# sourceMappingURL=plugins.js.map