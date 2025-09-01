const briefResolvers = {
    Query: {
        brief: (_, { id }) => ({ id, title: 'Draft' }),
    },
    Mutation: {},
};
export default briefResolvers;
//# sourceMappingURL=brief.js.map