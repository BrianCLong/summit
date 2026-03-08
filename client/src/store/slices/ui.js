"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setOperation = exports.setStatus = exports.setTenant = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    tenant: 'all',
    status: 'all',
    operation: 'all',
};
const uiSlice = (0, toolkit_1.createSlice)({
    name: 'ui',
    initialState,
    reducers: {
        setTenant(state, action) {
            state.tenant = action.payload;
        },
        setStatus(state, action) {
            state.status = action.payload;
        },
        setOperation(state, action) {
            state.operation = action.payload;
        },
    },
});
_a = uiSlice.actions, exports.setTenant = _a.setTenant, exports.setStatus = _a.setStatus, exports.setOperation = _a.setOperation;
exports.default = uiSlice.reducer;
