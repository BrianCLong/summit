"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withOptimism = withOptimism;
exports.useOptimisticState = useOptimisticState;
exports.createOptimisticComment = createOptimisticComment;
exports.createOptimisticEvidence = createOptimisticEvidence;
const react_1 = require("react");
/**
 * Basic optimistic update with rollback on error
 */
function withOptimism(update, rollback, run) {
    try {
        update();
    }
    catch (e) {
        console.warn('Optimistic update failed:', e);
    }
    return run().catch((e) => {
        try {
            rollback();
        }
        catch (rollbackError) {
            console.error('Rollback failed:', rollbackError);
        }
        throw e;
    });
}
/**
 * Hook for managing optimistic state with conflict detection
 */
function useOptimisticState(initialData, serverVersion) {
    const stateRef = (0, react_1.useRef)({
        version: serverVersion || 0,
        data: initialData,
        isOptimistic: false,
    });
    const updateOptimistic = (0, react_1.useCallback)((updater) => {
        stateRef.current = {
            ...stateRef.current,
            data: updater(stateRef.current.data),
            isOptimistic: true,
        };
    }, []);
    const commitOptimistic = (0, react_1.useCallback)((serverData, serverVersion) => {
        const current = stateRef.current;
        // Conflict detection: server version advanced more than expected
        const hasConflict = current.isOptimistic && serverVersion > current.version + 1;
        stateRef.current = {
            version: serverVersion,
            data: serverData,
            isOptimistic: false,
        };
        return { hasConflict, data: serverData };
    }, []);
    const rollbackOptimistic = (0, react_1.useCallback)(() => {
        if (stateRef.current.isOptimistic) {
            stateRef.current = {
                ...stateRef.current,
                isOptimistic: false,
            };
        }
    }, []);
    return {
        state: stateRef.current,
        updateOptimistic,
        commitOptimistic,
        rollbackOptimistic,
    };
}
function createOptimisticComment(content, currentUser) {
    return {
        id: `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        content,
        author: currentUser,
        timestamp: new Date().toISOString(),
        tempId: `temp-${Date.now()}`,
        isOptimistic: true,
    };
}
function createOptimisticEvidence(name, type, uploadedBy) {
    return {
        id: `temp-evidence-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name,
        type,
        uploadedBy,
        uploadedAt: new Date().toISOString(),
        status: 'uploading',
        isOptimistic: true,
    };
}
