import { SessionService } from "./session-service";

export class StepUpService {
  public static async initiateStepUp(sessionId: string): Promise<string> {
    // In a real scenario, this would generate a WebAuthn challenge
    return "challenge_" + Math.random().toString(36).substr(2, 9);
  }

  public static async verifyStepUp(sessionId: string, response: string): Promise<boolean> {
    // Simulation: any response starting with 'resp_' followed by session ID is valid
    if (response === `resp_${sessionId}`) {
      const sessionService = SessionService.getInstance();
      const session = sessionService.getSession(sessionId);
      if (session) {
        session.mfa_verified = true;
        session.subject.attributes.mfa_verified = true;
        return true;
      }
    }
    return false;
  }
}
