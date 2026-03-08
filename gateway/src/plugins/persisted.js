"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePersistedPlugin = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const makePersistedPlugin = ({ storePath, }) => {
    const store = JSON.parse(node_fs_1.default.readFileSync(storePath, 'utf8'));
    return {
        async requestDidStart() {
            return {
                async didResolveOperation({ request }) {
                    if (process.env.NODE_ENV !== 'production')
                        return;
                    const ext = request.extensions?.persistedQuery
                        ?.sha256Hash;
                    const text = request.query ?? (ext ? store[ext] : undefined);
                    if (!text) {
                        throw Object.assign(new Error('Operation not allowed (persisted only)'), {
                            code: 'PERSISTED_ONLY',
                        });
                    }
                    const hash = node_crypto_1.default.createHash('sha256').update(text).digest('hex');
                    if (!store[hash]) {
                        throw Object.assign(new Error('Operation not allowed (persisted only)'), {
                            code: 'PERSISTED_ONLY',
                        });
                    }
                    if (ext && ext !== hash) {
                        throw Object.assign(new Error('Persisted hash mismatch'), {
                            code: 'PERSISTED_MISMATCH',
                        });
                    }
                },
            };
        },
    };
};
exports.makePersistedPlugin = makePersistedPlugin;
