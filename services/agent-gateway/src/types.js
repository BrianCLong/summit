"use strict";
/**
 * Agent Framework Types
 * Part of AGENT-1 through AGENT-16 implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OPERATION_MODES = void 0;
exports.OPERATION_MODES = {
    SIMULATION: {
        mode: 'SIMULATION',
        description: 'Actions are evaluated but not executed. Returns "would do X" without any side effects.',
        allowsExecution: false,
        allowsSideEffects: false,
        requiresApproval: false,
    },
    DRY_RUN: {
        mode: 'DRY_RUN',
        description: 'Limited side-effects allowed (e.g., planning). No actual data modifications.',
        allowsExecution: false,
        allowsSideEffects: true, // Limited: planning, validation, etc.
        requiresApproval: false,
    },
    ENFORCED: {
        mode: 'ENFORCED',
        description: 'Real execution with full side effects. Requires proper authorization.',
        allowsExecution: true,
        allowsSideEffects: true,
        requiresApproval: true, // For high-risk actions
    },
};
