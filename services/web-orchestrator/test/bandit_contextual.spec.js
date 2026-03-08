"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bandit_contextual_1 = require("../../src/bandit_contextual");
test('chooses one of the provided domains', () => {
    const b = new bandit_contextual_1.CtxBandit(['a.example', 'b.example']);
    const pick = b.choose({
        purpose: 'qna',
        hour: 12,
        domainClass: 'docs',
        recent: 'ok',
    });
    expect(['a.example', 'b.example']).toContain(pick);
    b.update(pick, true);
});
