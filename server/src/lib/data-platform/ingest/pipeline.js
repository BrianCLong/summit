"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IngestionPipeline = void 0;
class IngestionPipeline {
    stages = [];
    constructor(stages) {
        this.stages = stages;
    }
    async run(context) {
        let currentContext = context;
        for (const stage of this.stages) {
            currentContext = await stage.execute(currentContext);
        }
        return currentContext;
    }
}
exports.IngestionPipeline = IngestionPipeline;
