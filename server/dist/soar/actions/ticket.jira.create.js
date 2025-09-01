export default async function create(params, ctx) {
    if (ctx.simulate)
        return { simulated: true };
    return { key: 'JIRA-1', ...params };
}
//# sourceMappingURL=ticket.jira.create.js.map