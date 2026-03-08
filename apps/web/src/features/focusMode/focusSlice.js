"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleManual = exports.exitFocus = exports.enterFocus = exports.setMode = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    mode: 'auto',
    enabled: false,
    activeRegion: 'none',
};
const slice = (0, toolkit_1.createSlice)({
    name: 'focus',
    initialState,
    reducers: {
        setMode(s, a) {
            s.mode = a.payload;
        },
        enterFocus(s, a) {
            s.enabled = true;
            s.activeRegion = a.payload.region;
            s.reason = a.payload.reason;
        },
        exitFocus(s) {
            s.enabled = false;
            s.activeRegion = 'none';
            s.reason = undefined;
        },
        toggleManual(s, a) {
            if (s.mode !== 'off') {
                s.enabled = !s.enabled;
                s.activeRegion = a.payload.region;
            }
        },
    },
});
_a = slice.actions, exports.setMode = _a.setMode, exports.enterFocus = _a.enterFocus, exports.exitFocus = _a.exitFocus, exports.toggleManual = _a.toggleManual;
exports.default = slice.reducer;
