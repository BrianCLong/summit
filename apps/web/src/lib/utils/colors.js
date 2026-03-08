"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStringColor = void 0;
// Generate a consistent color from a string (e.g. userId)
const getStringColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00ffffff).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
};
exports.getStringColor = getStringColor;
