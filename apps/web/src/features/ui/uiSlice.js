"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.setInvisibleHand = exports.toggleInvisibleHand = exports.setCoverStory = exports.toggleCoverStory = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    coverStoryMode: false,
    invisibleHandMode: false,
};
const slice = (0, toolkit_1.createSlice)({
    name: 'ui',
    initialState,
    reducers: {
        toggleCoverStory(s) {
            s.coverStoryMode = !s.coverStoryMode;
        },
        setCoverStory(s, a) {
            s.coverStoryMode = a.payload;
        },
        toggleInvisibleHand(s) {
            s.invisibleHandMode = !s.invisibleHandMode;
        },
        setInvisibleHand(s, a) {
            s.invisibleHandMode = a.payload;
        },
    },
});
_a = slice.actions, exports.toggleCoverStory = _a.toggleCoverStory, exports.setCoverStory = _a.setCoverStory, exports.toggleInvisibleHand = _a.toggleInvisibleHand, exports.setInvisibleHand = _a.setInvisibleHand;
exports.default = slice.reducer;
