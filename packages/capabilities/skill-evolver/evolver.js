"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evolveCapability = void 0;
const evaluator_1 = require("../capability-evaluator/evaluator");
const retrain_1 = require("./retrain");
const evolveCapability = async (capabilityId) => {
    const metrics = await (0, evaluator_1.evaluateCapability)(capabilityId);
    if (metrics.overall < 0.75) {
        console.log(`Capability ${capabilityId} under threshold. Evolving...`);
        await (0, retrain_1.retrainCapability)(capabilityId);
    }
    else {
        console.log(`Capability ${capabilityId} passes evaluation.`);
    }
};
exports.evolveCapability = evolveCapability;
