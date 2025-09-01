export default async function postMessage(params, ctx) {
    if (ctx.simulate)
        return { simulated: true };
    if (!ctx.token)
        throw new Error('missing_token');
    return { ok: true, channel: params.channel };
}
//# sourceMappingURL=chat.slack.postMessage.js.map