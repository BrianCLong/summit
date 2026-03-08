"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Scheduler = void 0;
const p_limit_1 = __importDefault(require("p-limit"));
const crypto_1 = require("crypto");
const vm_pool_1 = require("./vm-pool");
const replay_client_1 = require("./replay-client");
class Scheduler {
    active = new Map();
    limit = (0, p_limit_1.default)(Number(process.env.MAX_CONCURRENCY || 128));
    async allocate(toolClass) {
        await (0, vm_pool_1.ensurePrewarmedSnapshot)(toolClass);
        const vm = await (0, vm_pool_1.checkoutVm)(toolClass);
        const id = `sess_${(0, crypto_1.randomUUID)()}`;
        const recordingId = await (0, replay_client_1.createRecording)(id, toolClass);
        const session = {
            id,
            vm,
            transport: 'http+sse',
            createdAt: new Date().toISOString(),
            recordingId,
        };
        this.active.set(session.id, session);
        return session;
    }
    async invoke(sessionId, fn, args) {
        const session = this.active.get(sessionId);
        if (!session)
            throw new Error(`session ${sessionId} not found`);
        return this.limit(() => (0, vm_pool_1.invokeSandbox)(session.vm, sessionId, fn, args));
    }
    async release(sessionId) {
        const session = this.active.get(sessionId);
        if (!session)
            return;
        await (0, vm_pool_1.releaseVm)(session.vm);
        this.active.delete(sessionId);
    }
    get(sessionId) {
        return this.active.get(sessionId);
    }
}
exports.Scheduler = Scheduler;
