"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginWeaverService = void 0;
class PluginWeaverService {
    static instance;
    pipes = new Map();
    constructor() { }
    static getInstance() {
        if (!PluginWeaverService.instance) {
            PluginWeaverService.instance = new PluginWeaverService();
        }
        return PluginWeaverService.instance;
    }
    registerPipe(sourceEvent, pipe) {
        if (!this.pipes.has(sourceEvent)) {
            this.pipes.set(sourceEvent, []);
        }
        this.pipes.get(sourceEvent)?.push(pipe);
    }
    async emit(sourceEvent, data) {
        const handlers = this.pipes.get(sourceEvent) || [];
        for (const handler of handlers) {
            try {
                await handler(data);
            }
            catch (e) {
                console.error(`[PluginWeaver] Pipe error on ${sourceEvent}:`, e);
            }
        }
    }
}
exports.PluginWeaverService = PluginWeaverService;
