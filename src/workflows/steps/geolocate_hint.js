"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geolocateHintFromFixture = geolocateHintFromFixture;
const node_fs_1 = require("node:fs");
function geolocateHintFromFixture(fixturePath) {
    return JSON.parse((0, node_fs_1.readFileSync)(fixturePath, 'utf8'));
}
