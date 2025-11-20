import request from 'supertest';
import { createApp } from '../src/app';

let app: any;

beforeAll(async () => {
  app = await createApp();
});

describe('Activity Feed', () => {
  // In dev mode (default for tests), auth middleware mocks user if no token or invalid token
  // provided. We can just pass a dummy token.
  let token = 'mock-token';

  it('should record and retrieve investigation creation activity', async () => {
    // 1. Create Investigation
    // Note: input structure depends on your schema.
    // Based on code reading, input takes {name, description}.
    // createInvestigation is implemented in coreResolvers which uses InvestigationRepo
    // which we instrumented.

    const createMutation = `
      mutation {
        createInvestigation(input: {
          name: "Activity Test Investigation",
          description: "Testing activity feed"
        }) {
          id
          name
        }
      }
    `;

    const createRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: createMutation });

    if (createRes.body.errors) {
      console.error('Create Errors:', JSON.stringify(createRes.body.errors, null, 2));
    }

    expect(createRes.status).toBe(200);
    expect(createRes.body.errors).toBeUndefined();
    const investigationId = createRes.body.data.createInvestigation.id;
    expect(investigationId).toBeDefined();

    // 2. Query Activities
    // We use the new activities query we added
    const activitiesQuery = `
      query {
        activities(limit: 10, actionType: "INVESTIGATION_CREATED") {
          id
          actionType
          resourceType
          resourceId
          payload
        }
      }
    `;

    // Allow some time for async recording (fire-and-forget in Repo)
    await new Promise(resolve => setTimeout(resolve, 1000));

    const activityRes = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${token}`)
      .send({ query: activitiesQuery });

    if (activityRes.body.errors) {
      console.error('Activity Query Errors:', JSON.stringify(activityRes.body.errors, null, 2));
    }

    expect(activityRes.status).toBe(200);
    expect(activityRes.body.errors).toBeUndefined();

    const activities = activityRes.body.data.activities;
    expect(activities.length).toBeGreaterThan(0);

    const myActivity = activities.find((a: any) => a.resourceId === investigationId);
    expect(myActivity).toBeDefined();
    expect(myActivity.actionType).toBe('INVESTIGATION_CREATED');
    expect(myActivity.resourceType).toBe('investigation');
    // Payload should contain name
    expect(myActivity.payload.name).toBe("Activity Test Investigation");
  });
});
