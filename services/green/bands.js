"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.band = band;
function band(now, intensity) {
    return intensity < 200 ? 'green' : intensity < 400 ? 'amber' : 'red';
}
