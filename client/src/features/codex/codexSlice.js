"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectCodex = exports.setRedaction = exports.moveCard = exports.addCard = exports.addSection = void 0;
const toolkit_1 = require("@reduxjs/toolkit");
const initialState = {
    sectionOrder: [],
    sections: {},
    cards: {},
    collaborators: {},
    saving: false,
};
const slice = (0, toolkit_1.createSlice)({
    name: 'codex',
    initialState,
    reducers: {
        addSection(state, action) {
            const id = Date.now().toString();
            state.sectionOrder.push(id);
            state.sections[id] = { id, title: action.payload, cardIds: [] };
        },
        addCard(state, action) {
            const { sectionId, card } = action.payload;
            state.cards[card.id] = card;
            state.sections[sectionId]?.cardIds.push(card.id);
        },
        moveCard(state, action) {
            const { from, to } = action.payload;
            const fromIds = state.sections[from.sectionId].cardIds;
            const [moved] = fromIds.splice(from.index, 1);
            const toIds = state.sections[to.sectionId].cardIds;
            toIds.splice(to.index, 0, moved);
        },
        setRedaction(state, action) {
            const { cardId, fields, reason } = action.payload;
            const card = state.cards[cardId];
            if (card) {
                card.redaction = { fields, reason };
            }
        },
    },
});
_a = slice.actions, exports.addSection = _a.addSection, exports.addCard = _a.addCard, exports.moveCard = _a.moveCard, exports.setRedaction = _a.setRedaction;
exports.default = slice.reducer;
const selectCodex = (state) => state.codex;
exports.selectCodex = selectCodex;
