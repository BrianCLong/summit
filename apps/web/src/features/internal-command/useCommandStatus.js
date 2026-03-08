"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCommandStatus = useCommandStatus;
const CommandStatusProvider_1 = require("./CommandStatusProvider");
function useCommandStatus() {
    return (0, CommandStatusProvider_1.useCommandStatusContext)();
}
