"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collaborationManager = exports.CollaborationManager = void 0;
const operationalTransform_js_1 = require("./operationalTransform.js");
const logger_js_1 = __importDefault(require("../../utils/logger.js"));
class CollaborationManager {
    documents = new Map();
    constructor() {
        // Initialize
    }
    createDocument(docId, initialContent = '') {
        this.documents.set(docId, {
            version: 0,
            content: initialContent,
            history: []
        });
    }
    applyOperation(docId, op, clientVersion) {
        const doc = this.documents.get(docId);
        if (!doc) {
            throw new Error(`Document ${docId} not found`);
        }
        if (clientVersion < 0 || clientVersion > doc.version) {
            throw new Error('Invalid version');
        }
        // Transform operation against all operations that happened since clientVersion
        let transformedOp = op;
        const concurrentOps = doc.history.slice(clientVersion);
        for (const pastOp of concurrentOps) {
            [transformedOp,] = operationalTransform_js_1.OperationalTransform.transform(transformedOp, pastOp);
        }
        // Apply to state (simplified for text)
        if (op.type === 'insert' && op.text && op.position !== undefined && transformedOp.position !== undefined) {
            doc.content = doc.content.slice(0, transformedOp.position) + transformedOp.text + doc.content.slice(transformedOp.position);
        }
        else if (op.type === 'delete' && op.count && op.position !== undefined && transformedOp.position !== undefined && transformedOp.count !== undefined) {
            doc.content = doc.content.slice(0, transformedOp.position) + doc.content.slice(transformedOp.position + transformedOp.count);
        }
        doc.history.push(transformedOp);
        doc.version++;
        logger_js_1.default.debug(`Applied op to ${docId} v${doc.version}: ${JSON.stringify(transformedOp)}`);
        return { appliedOp: transformedOp, version: doc.version };
    }
    getDocument(docId) {
        return this.documents.get(docId);
    }
}
exports.CollaborationManager = CollaborationManager;
exports.collaborationManager = new CollaborationManager();
