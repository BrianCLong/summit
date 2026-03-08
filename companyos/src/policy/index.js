"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startPolicyManager = startPolicyManager;
const hotReloadController_1 = require("./hotReloadController");
function startPolicyManager(signal) {
    return (0, hotReloadController_1.hotReloadLoop)(signal);
}
