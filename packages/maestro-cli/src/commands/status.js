"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusCommand = void 0;
class StatusCommand {
    async execute(options) {
        if (!options.runId) {
            // eslint-disable-next-line no-console
            console.log('ℹ️  No run id provided, showing recent runs not implemented yet.');
            return;
        }
        // eslint-disable-next-line no-console
        console.log(`🔎 Fetching status for run ${options.runId}`);
        // eslint-disable-next-line no-console
        console.log('status : COMPLETED');
        // eslint-disable-next-line no-console
        console.log('elapsed: 42s');
        if (options.follow) {
            // eslint-disable-next-line no-console
            console.log('Streaming updates is not implemented in this stub.');
        }
    }
}
exports.StatusCommand = StatusCommand;
