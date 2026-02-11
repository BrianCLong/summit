import { describe, it, expect } from "vitest";
import { SessionService } from "../src/auth/session-service";
import { StepUpService } from "../src/auth/step-up-service";
import { Subject } from "../src/authz/types";

describe("Identity & Step-Up Auth", () => {
  const mockSubject: Subject = {
    id: "user-1",
    type: "human",
    tenant_id: "tenant-1",
    roles: ["admin"],
    groups: [],
    attributes: { mfa_verified: false },
  };

  it("should create and retrieve a session", () => {
    const service = SessionService.getInstance();
    const session = service.createSession(mockSubject);
    expect(session.id).toBeDefined();
    expect(service.getSession(session.id)).toBe(session);
  });

  it("should handle risk score updates", () => {
    const service = SessionService.getInstance();
    const session = service.createSession(mockSubject);
    service.updateRiskScore(session.id, 0.5);
    expect(service.getSession(session.id)?.risk_score).toBe(0.5);
  });

  it("should perform step-up authentication", async () => {
    const service = SessionService.getInstance();
    const session = service.createSession(mockSubject);
    expect(session.mfa_verified).toBe(false);

    const challenge = await StepUpService.initiateStepUp(session.id);
    expect(challenge).toBeDefined();

    const success = await StepUpService.verifyStepUp(session.id, `resp_${session.id}`);
    expect(success).toBe(true);
    expect(service.getSession(session.id)?.mfa_verified).toBe(true);
  });
});
