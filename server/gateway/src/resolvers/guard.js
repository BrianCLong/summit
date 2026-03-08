"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardRead = guardRead;
const opaEnforcer_js_1 = require("../plugins/opaEnforcer.js");
async function guardRead(ctx, resource) {
    const jwt = ctx.user;
    await (0, opaEnforcer_js_1.enforceABAC)({
        jwt,
        resource,
        action: 'read',
        context: { country: ctx.country },
    });
}
