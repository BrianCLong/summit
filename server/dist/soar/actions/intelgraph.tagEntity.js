export default async function tagEntity(params, ctx) {
    if (ctx.simulate)
        return { simulated: true };
    return { tagged: params.id };
}
//# sourceMappingURL=intelgraph.tagEntity.js.map