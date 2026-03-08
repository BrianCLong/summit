"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELATED_TASK_META_KEY = exports.TASK_META_KEY = void 0;
exports.withTaskMeta = withTaskMeta;
exports.extractRelatedTaskId = extractRelatedTaskId;
exports.TASK_META_KEY = "modelcontextprotocol.io/task";
exports.RELATED_TASK_META_KEY = "modelcontextprotocol.io/related-task";
function withTaskMeta(params, task) {
    const _meta = { ...(params?._meta ?? {}) };
    _meta[exports.TASK_META_KEY] = { taskId: task.taskId, ...(task.keepAlive != null ? { keepAlive: task.keepAlive } : {}) };
    return { ...(params ?? {}), _meta };
}
function extractRelatedTaskId(params) {
    const t = params?._meta?.[exports.RELATED_TASK_META_KEY];
    return typeof t?.taskId === "string" ? t.taskId : null;
}
