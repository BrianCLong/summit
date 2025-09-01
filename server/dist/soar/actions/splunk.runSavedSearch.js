export default async function runSavedSearch(params, ctx) {
    if (ctx.simulate)
        return { simulated: true };
    return { results: [] };
}
//# sourceMappingURL=splunk.runSavedSearch.js.map