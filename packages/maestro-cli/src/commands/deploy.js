"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeployCommand = void 0;
class DeployCommand {
    async execute(options) {
        // eslint-disable-next-line no-console
        console.log('🚀 Deploying workflow');
        // eslint-disable-next-line no-console
        console.log(`  file      : ${options.file}`);
        // eslint-disable-next-line no-console
        console.log(`  env       : ${options.env}`);
        // eslint-disable-next-line no-console
        console.log(`  namespace : ${options.namespace ?? 'default'}`);
        // eslint-disable-next-line no-console
        console.log(`  wait      : ${Boolean(options.wait)}`);
        // eslint-disable-next-line no-console
        console.log(`  rollback  : ${Boolean(options.rollback)}`);
        // Future: integrate with Maestro deployment APIs
    }
}
exports.DeployCommand = DeployCommand;
