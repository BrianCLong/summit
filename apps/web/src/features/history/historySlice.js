"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.popRedo = exports.popUndo = exports.moveToUndo = exports.moveToRedo = exports.clear = exports.push = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initial = { undo: [], redo: [], cap: 200 };
const slice = (0, toolkit_1.createSlice)({
    name: 'history',
    initialState: initial,
    reducers: {
        push(s, a) {
            s.undo.push(a.payload);
            if (s.undo.length > s.cap) {
                s.undo.shift();
            }
            s.redo = [];
        },
        clear(s) {
            s.undo = [];
            s.redo = [];
        },
        moveToRedo(s, a) {
            s.redo.push(a.payload);
        },
        moveToUndo(s, a) {
            s.undo.push(a.payload);
        },
        popUndo(s) {
            s.undo.pop();
        },
        popRedo(s) {
            s.redo.pop();
        },
    },
});
_a = slice.actions, exports.push = _a.push, exports.clear = _a.clear, exports.moveToRedo = _a.moveToRedo, exports.moveToUndo = _a.moveToUndo, exports.popUndo = _a.popUndo, exports.popRedo = _a.popRedo;
exports.default = slice.reducer;
