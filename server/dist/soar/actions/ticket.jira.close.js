export default async function close(params, ctx) {
    if (ctx.simulate)
        return { simulated: true };
    return { closed: true };
}
//# sourceMappingURL=ticket.jira.close.js.map