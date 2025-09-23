import { withAuthAndPolicy } from "../src/middleware/withAuthAndPolicy";
import { ForbiddenError } from "apollo-server-express";

describe("mission tag and temporal ABAC", () => {
  const baseUser = {
    id: "u1",
    email: "user@example.com",
    roles: ["analyst"],
    permissions: [],
    orgId: "org-1",
    teamId: "team-1",
    missionTags: ["alpha", "bravo"],
  };

  it("allows entity access with matching mission tag and valid time", async () => {
    const resolver = withAuthAndPolicy("read", () => ({
      type: "entity",
      id: "e1",
      orgId: "org-1",
      teamId: "team-1",
      missionTags: ["alpha"],
      validFrom: new Date(Date.now() - 1000).toISOString(),
      validTo: new Date(Date.now() + 1000).toISOString(),
    }))(async () => "ok");

    const result = await resolver({}, {}, { user: baseUser }, { fieldName: "test", path: "testPath" });
    expect(result).toBe("ok");
  });

  it("denies entity access when mission tag mismatch", async () => {
    const resolver = withAuthAndPolicy("read", () => ({
      type: "entity",
      id: "e1",
      orgId: "org-1",
      teamId: "team-1",
      missionTags: ["charlie"],
    }))(async () => "ok");

    await expect(
      resolver({}, {}, { user: baseUser }, { fieldName: "test", path: "testPath" }),
    ).rejects.toThrow(ForbiddenError);
  });

  it("denies entity access outside valid time window", async () => {
    const resolver = withAuthAndPolicy("read", () => ({
      type: "entity",
      id: "e1",
      orgId: "org-1",
      teamId: "team-1",
      missionTags: ["alpha"],
      validFrom: new Date(Date.now() + 10000).toISOString(),
    }))(async () => "ok");

    await expect(
      resolver({}, {}, { user: baseUser }, { fieldName: "test", path: "testPath" }),
    ).rejects.toThrow(ForbiddenError);
  });
});
