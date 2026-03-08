"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const gql = async (rq, query, variables) => {
    const res = await rq.post(`${process.env.GRAPHQL_URL || process.env.BASE_URL + '/graphql'}`, {
        data: { query, variables },
    });
    (0, test_1.expect)(res.ok()).toBeTruthy();
    const json = await res.json();
    (0, test_1.expect)(json.errors).toBeFalsy();
    return json.data;
};
(0, test_1.test)('home loads', async ({ page }) => {
    await page.goto('/');
    await (0, test_1.expect)(page).toHaveTitle(/IntelGraph|Dashboard/i);
});
(0, test_1.test)('GraphQL smoke — dashboard and create note', async ({ request }) => {
    const data1 = await gql(request, `query($id: ID!){ user(id:$id){ id name } }`, { id: 'seed-user-1' });
    (0, test_1.expect)(data1.user.id).toBeTruthy();
    const note = await gql(request, `mutation($t:String!){ createNote(input:{text:$t}){ id text } }`, { t: `pw-${Date.now()}` });
    (0, test_1.expect)(note.createNote.id).toBeTruthy();
});
