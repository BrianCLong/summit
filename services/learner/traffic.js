"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseArm = chooseArm;
function chooseArm(task, model, state) {
    const r = Math.random();
    return state.challenger && r < state.split
        ? state.challenger
        : state.champion;
}
