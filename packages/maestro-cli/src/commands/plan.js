"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlanCommand = void 0;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const js_yaml_1 = __importDefault(require("js-yaml"));
class PlanCommand {
    async execute(options) {
        const filePath = path_1.default.resolve(process.cwd(), options.file);
        const raw = await fs_1.promises.readFile(filePath, 'utf8');
        const workflow = js_yaml_1.default.load(raw);
        const summary = {
            name: workflow?.name ?? 'unknown',
            version: workflow?.version ?? '1.0.0',
            stages: Array.isArray(workflow?.stages) ? workflow.stages.length : 0,
            steps: Array.isArray(workflow?.stages)
                ? workflow.stages.flatMap((stage) => stage.steps || []).length
                : 0,
        };
        if (options.output === 'json') {
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(summary, null, 2));
            return;
        }
        if (options.output === 'yaml') {
            // eslint-disable-next-line no-console
            console.log(js_yaml_1.default.dump(summary, { indent: 2 }));
            return;
        }
        // eslint-disable-next-line no-console
        console.log('Workflow Plan');
        // eslint-disable-next-line no-console
        console.log('-------------');
        // eslint-disable-next-line no-console
        console.log(`Name    : ${summary.name}`);
        // eslint-disable-next-line no-console
        console.log(`Version : ${summary.version}`);
        // eslint-disable-next-line no-console
        console.log(`Stages  : ${summary.stages}`);
        // eslint-disable-next-line no-console
        console.log(`Steps   : ${summary.steps}`);
        if (options.dryRun) {
            // eslint-disable-next-line no-console
            console.log('\nDry run mode: no actions will be executed.');
        }
    }
}
exports.PlanCommand = PlanCommand;
