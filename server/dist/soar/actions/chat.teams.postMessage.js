export default async function postMessage(params, ctx) {
    if (ctx.simulate)
        return { simulated: true };
    if (!ctx.token)
        throw new Error('missing_token');
    return { ok: true, team: params.team };
}
//# sourceMappingURL=chat.teams.postMessage.js.map