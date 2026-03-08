"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const graph_1 = require("../capability-graph/graph");
const evaluator_1 = require("../capability-evaluator/evaluator");
const program = new commander_1.Command();
program
    .command('install <path>')
    .description('Install a capability package')
    .action(async (path) => {
    console.log(`Installing capability from ${path}...`);
    // TODO: unpack & register capability
    await (0, graph_1.addCapabilityNode)('example-capability');
    console.log('Installed!');
});
program
    .command('evaluate <capabilityId>')
    .description('Evaluate a capability')
    .action(async (capabilityId) => {
    const result = await (0, evaluator_1.evaluateCapability)(capabilityId);
    console.log(result);
});
program.parse(process.argv);
