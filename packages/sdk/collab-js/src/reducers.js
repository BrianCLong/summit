"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presenceReducer = presenceReducer;
function presenceReducer(state = {}, action) {
    switch (action.type) {
        case 'presence.join':
            return {
                ...state,
                [action.sessionId]: {
                    userId: action.userId,
                    tenantId: action.tenantId,
                },
            };
        case 'presence.leave': {
            const next = { ...state };
            delete next[action.sessionId];
            return next;
        }
        default:
            return state;
    }
}
