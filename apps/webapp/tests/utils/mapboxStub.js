"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMapboxState = createMapboxState;
function createMapboxState() {
    return { flyTo: [], markers: [], removals: 0, focused: null };
}
