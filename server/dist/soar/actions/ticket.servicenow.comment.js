export default async function comment(params, ctx) {
    if (ctx.simulate)
        return { simulated: true };
    return { ok: true };
}
//# sourceMappingURL=ticket.servicenow.comment.js.map