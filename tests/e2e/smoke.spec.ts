import { test, expect, request } from '@playwright/test';

const gql = async (rq: any, query: string, variables?: any) => {
  const res = await rq.post(
    `${process.env.GRAPHQL_URL || process.env.BASE_URL + '/graphql'}`,
    {
      data: { query, variables },
    },
  );
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json.errors).toBeFalsy();
  return json.data;
};

test('home loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/IntelGraph|Dashboard/i);
});

test('GraphQL smoke — dashboard and create note', async ({ request }) => {
  const data1 = await gql(
    request,
    `query($id: ID!){ user(id:$id){ id name } }`,
    { id: 'seed-user-1' },
  );
  expect(data1.user.id).toBeTruthy();
  const note = await gql(
    request,
    `mutation($t:String!){ createNote(input:{text:$t}){ id text } }`,
    { t: `pw-${Date.now()}` },
  );
  expect(note.createNote.id).toBeTruthy();
});
