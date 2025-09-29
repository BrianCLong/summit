const resolvers = require("../src/graphql/resolvers");

let session;
jest.mock("../src/db/neo4j.js", () => ({
  getNeo4jDriver: () => ({ session: () => session }),
}));

describe("Merge conflict detection", () => {
  beforeEach(() => {
    session = { run: jest.fn(), close: jest.fn() };
  });

  test("updateEntity throws conflict", async () => {
    session.run.mockResolvedValueOnce({
      records: [
        {
          get: () => ({
            properties: { id: "e1", updatedAt: "2024-01-02T00:00:00.000Z" },
          }),
        },
      ],
    });
    const user = { id: "u1" };
    await expect(
      resolvers.Mutation.updateEntity(
        null,
        {
          id: "e1",
          input: { props: { label: "x" } },
          lastSeenTimestamp: "2024-01-01T00:00:00.000Z",
        },
        { user },
      ),
    ).rejects.toHaveProperty("extensions.code", "CONFLICT");
  });

  test("updateRelationship throws conflict", async () => {
    session.run.mockResolvedValueOnce({
      records: [
        {
          get: () => ({
            properties: { id: "r1", updatedAt: "2024-01-02T00:00:00.000Z" },
          }),
        },
      ],
    });
    await expect(
      resolvers.Mutation.updateRelationship(null, {
        id: "r1",
        input: { props: { label: "x" } },
        lastSeenTimestamp: "2024-01-01T00:00:00.000Z",
      }),
    ).rejects.toHaveProperty("extensions.code", "CONFLICT");
  });
});
