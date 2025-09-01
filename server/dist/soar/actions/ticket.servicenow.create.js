export default async function create(params, ctx) {
    if (ctx.simulate)
        return { simulated: true };
    return { sys_id: 'SN-1', ...params };
}
//# sourceMappingURL=ticket.servicenow.create.js.map