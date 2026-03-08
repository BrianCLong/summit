"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chronolocateShadowFromFixture = chronolocateShadowFromFixture;
const node_fs_1 = require("node:fs");
function chronolocateShadowFromFixture(fixturePath) {
    return JSON.parse((0, node_fs_1.readFileSync)(fixturePath, 'utf8'));
}
