import { withLegacyGraphServer } from "./__helpers__/legacyGraphTestkit";
import * as neo from "../src/graph/neo4j";
jest.spyOn(neo, "runCypher").mockImplementation(async (c, p) => {
    // naive in-memory stub; assert queries are called
    return [{ s: { id: "1", type: "entity", label: "PersonOrOrg:Alice", confidence: 0.9, status: "pending", createdAt: "2025-01-01T00:00:00Z" } }];
});
it("lists suggestions", async () => {
    await withLegacyGraphServer(async (exec) => {
        const res = await exec({ query: "{ suggestions { id label } }" });
        const data = res.body?.singleResult?.data;
        expect(data?.suggestions?.[0]?.label).toMatch(/Alice/);
    }, { user: { scopes: ["graph:write"] } });
});
//# sourceMappingURL=suggestions.test.js.map