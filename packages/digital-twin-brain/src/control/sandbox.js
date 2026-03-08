"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimulationSandbox = void 0;
class SimulationSandbox {
    model;
    constructor(model) {
        this.model = model;
    }
    evaluate(proposal, state) {
        return this.model(proposal, state);
    }
}
exports.SimulationSandbox = SimulationSandbox;
