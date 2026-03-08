"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../src/app.js");
const globals_1 = require("@jest/globals");
const NO_NETWORK_LISTEN = process.env.NO_NETWORK_LISTEN === 'true';
const describeIf = NO_NETWORK_LISTEN ? globals_1.describe.skip : globals_1.describe;
describeIf('Activity Feed', () => {
    let app;
    (0, globals_1.beforeAll)(async () => {
        app = await (0, app_js_1.createApp)();
    });
    // In dev mode (default for tests), auth middleware mocks user if no token or invalid token
    // provided. We can just pass a dummy token.
    let token = 'mock-token';
    (0, globals_1.it)('should record and retrieve investigation creation activity', async () => {
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
        const createRes = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send({ query: createMutation });
        if (createRes.body.errors) {
            console.error('Create Errors:', JSON.stringify(createRes.body.errors, null, 2));
        }
        (0, globals_1.expect)(createRes.status).toBe(200);
        (0, globals_1.expect)(createRes.body.errors).toBeUndefined();
        const investigationId = createRes.body.data.createInvestigation.id;
        (0, globals_1.expect)(investigationId).toBeDefined();
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
        // Poll for activity with exponential backoff instead of fixed timeout
        // This is more reliable than waiting a fixed 1000ms
        const maxAttempts = 10;
        const baseDelay = 100; // Start with 100ms
        let activities = [];
        let myActivity = null;
        let attempt = 0;
        while (attempt < maxAttempts) {
            const activityRes = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${token}`)
                .send({ query: activitiesQuery });
            if (activityRes.body.errors) {
                console.error('Activity Query Errors:', JSON.stringify(activityRes.body.errors, null, 2));
            }
            (0, globals_1.expect)(activityRes.status).toBe(200);
            (0, globals_1.expect)(activityRes.body.errors).toBeUndefined();
            activities = activityRes.body.data.activities;
            myActivity = activities.find((a) => a.resourceId === investigationId);
            if (myActivity) {
                break;
            }
            // Exponential backoff: 100ms, 150ms, 225ms, 337ms, etc.
            await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(1.5, attempt)));
            attempt++;
        }
        (0, globals_1.expect)(activities.length).toBeGreaterThan(0);
        (0, globals_1.expect)(myActivity).toBeDefined();
        (0, globals_1.expect)(myActivity.actionType).toBe('INVESTIGATION_CREATED');
        (0, globals_1.expect)(myActivity.resourceType).toBe('investigation');
        // Payload should contain name
        (0, globals_1.expect)(myActivity.payload.name).toBe("Activity Test Investigation");
    });
});
