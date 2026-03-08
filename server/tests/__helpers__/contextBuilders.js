"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenant = tenant;
exports.scopes = scopes;
exports.role = role;
exports.makeUnitServer = makeUnitServer;
const makeServer_1 = require("../../src/app/makeServer");
function tenant(id) {
    return { tenant: id };
}
function scopes(list) {
    return { scopes: list };
}
function role(name) {
    return { role: name };
}
async function makeUnitServer(opts = {}) {
    return (0, makeServer_1.makeGraphServer)(opts);
}
