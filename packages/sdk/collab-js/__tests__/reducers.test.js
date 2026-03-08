"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reducers_1 = require("../src/reducers");
test('presence reducer handles join and leave', () => {
    let state = (0, reducers_1.presenceReducer)(undefined, {
        type: 'presence.join',
        sessionId: '1',
        userId: 'u',
        tenantId: 't',
    });
    expect(state['1']).toEqual({ userId: 'u', tenantId: 't' });
    state = (0, reducers_1.presenceReducer)(state, { type: 'presence.leave', sessionId: '1' });
    expect(state['1']).toBeUndefined();
});
