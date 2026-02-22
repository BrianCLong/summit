import { Subject } from "../authz/types";

export interface Session {
  id: string;
  subject: Subject;
  risk_score: number;
  last_activity: string;
  mfa_verified: boolean;
}

export class SessionService {
  private static instance: SessionService;
  private sessions: Map<string, Session> = new Map();

  private constructor() {}

  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }

  public createSession(subject: Subject): Session {
    const session: Session = {
      id: Math.random().toString(36).substr(2, 9),
      subject,
      risk_score: 0,
      last_activity: new Date().toISOString(),
      mfa_verified: subject.attributes.mfa_verified || false,
    };
    this.sessions.set(session.id, session);
    return session;
  }

  public getSession(id: string): Session | undefined {
    return this.sessions.get(id);
  }

  public updateRiskScore(id: string, score: number): void {
    const session = this.sessions.get(id);
    if (session) {
      session.risk_score = score;
    }
  }
}
