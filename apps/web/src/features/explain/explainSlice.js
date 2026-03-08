"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectExplain = exports.setPolicy = exports.close = exports.open = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initial = { open: true, policy: [] };
const slice = (0, toolkit_1.createSlice)({
    name: 'explain',
    initialState: initial,
    reducers: {
        open: s => {
            s.open = true;
        },
        close: s => {
            s.open = false;
        },
        setPolicy: (s, a) => {
            s.policy = a.payload;
        },
    },
});
_a = slice.actions, exports.open = _a.open, exports.close = _a.close, exports.setPolicy = _a.setPolicy;
exports.default = slice.reducer;
const selectExplain = (st) => st.explain;
exports.selectExplain = selectExplain;
// TODO: Re-enable when viewSync feature is restored
// export const selectExplainModel = createSelector(
//   [selectActiveQuery, selectExplain],
//   (query, expl) => ({ query, policy: expl.policy })
// )
