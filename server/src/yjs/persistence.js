"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisPersistence = void 0;
const Y = __importStar(require("yjs"));
class RedisPersistence {
    redis;
    prefix;
    constructor(redis, prefix = 'yjs:doc:') {
        this.redis = redis;
        this.prefix = prefix;
    }
    async bindState(docName, ydoc) {
        // Load initial state
        const updates = await this.redis.lrange(`${this.prefix}${docName}`, 0, -1);
        if (updates.length > 0) {
            Y.transact(ydoc, () => {
                updates.forEach((update) => {
                    Y.applyUpdate(ydoc, Buffer.from(update, 'base64'));
                });
            }, 'persistence');
        }
        // Subscribe to future updates from this instance (to save them)
        // In a real clustered setup, we might also want to subscribe to Redis PubSub to sync across nodes.
        // For now, we focus on persistence.
        ydoc.on('update', async (update, origin) => {
            // If the update comes from persistence, don't save it back
            if (origin === 'persistence')
                return;
            // Store the update
            await this.redis.rpush(`${this.prefix}${docName}`, Buffer.from(update).toString('base64'));
        });
    }
    async clearDocument(docName) {
        await this.redis.del(`${this.prefix}${docName}`);
    }
}
exports.RedisPersistence = RedisPersistence;
