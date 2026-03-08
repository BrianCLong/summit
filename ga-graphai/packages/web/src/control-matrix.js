"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ui = void 0;
exports.buildControlMatrix = buildControlMatrix;
function togglesFromPlan(plan) {
    return [
        { label: 'Pause before navigation', enabled: plan.pauseBeforeNavigation },
        { label: 'Pause before prompt', enabled: plan.pauseBeforePrompt },
        { label: 'Pause before capture', enabled: plan.pauseBeforeCapture },
    ];
}
function rowFromParcel(parcel) {
    return {
        ticketId: parcel.ticket.id,
        workerId: parcel.worker.id,
        toggles: togglesFromPlan(parcel.manualControl),
    };
}
function buildControlMatrix(plan) {
    return plan.parcels.map(rowFromParcel);
}
exports.ui = {
    buildControlMatrix,
};
