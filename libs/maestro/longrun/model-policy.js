"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectModelForPhase = void 0;
const selectModelForPhase = (policy, phase) => {
    switch (phase) {
        case 'search':
            return policy.searchModel;
        case 'plan':
        case 'execute':
            return policy.buildModel;
        case 'debug':
            return policy.debugModel;
        default: {
            const exhaustiveCheck = phase;
            return exhaustiveCheck;
        }
    }
};
exports.selectModelForPhase = selectModelForPhase;
