"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opa = void 0;
exports.opa = {
    enforce: (policy, data) => {
        console.log('OPA policy enforcement:', policy, data);
        return true;
    },
};
