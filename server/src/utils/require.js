"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireFunc = void 0;
const module_1 = require("module");
const esmRequire = (0, module_1.createRequire)(import.meta.url);
const requireFunc = (path) => {
    return esmRequire(path);
};
exports.requireFunc = requireFunc;
