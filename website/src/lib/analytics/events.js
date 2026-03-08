"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeProps = void 0;
const safeProps = (props) => {
    if (!props || typeof props !== "object")
        return {};
    const out = {};
    for (const [k, v] of Object.entries(props)) {
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean" || v === null)
            out[k] = v;
    }
    return out;
};
exports.safeProps = safeProps;
