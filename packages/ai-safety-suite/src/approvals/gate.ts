import crypto from "crypto";

export type ApprovalStatus = "pending" | "approved" | "denied";

export interface ApprovalRequest {
  id: string;
  actionType: string;
  scope: string;
  planHash: string;
  rationale: string;
  requester: string;
  ttlMs: number;
  status: ApprovalStatus;
  createdAt: number;
  token?: string;
  reviewer?: string;
}

export class ApprovalGate {
  private requests = new Map<string, ApprovalRequest>();
  private audit: ApprovalRequest[] = [];

  requestApproval(
    payload: Omit<ApprovalRequest, "id" | "status" | "createdAt" | "token" | "reviewer">
  ): ApprovalRequest {
    const id = crypto.randomUUID();
    const request: ApprovalRequest = {
      ...payload,
      id,
      status: "pending",
      createdAt: Date.now(),
    };
    this.requests.set(id, request);
    this.audit.push(request);
    return request;
  }

  approve(id: string, reviewer: string): ApprovalRequest {
    const request = this.getRequest(id);
    if (request.requester === reviewer) {
      throw new Error("Requester cannot approve their own request");
    }
    if (this.isExpired(request)) {
      throw new Error("Approval request expired");
    }
    request.status = "approved";
    request.reviewer = reviewer;
    request.token = this.buildToken(request);
    return request;
  }

  deny(id: string, reviewer: string): ApprovalRequest {
    const request = this.getRequest(id);
    if (this.isExpired(request)) {
      throw new Error("Approval request expired");
    }
    request.status = "denied";
    request.reviewer = reviewer;
    return request;
  }

  validateToken(actionType: string, scope: string, planHash: string, token?: string): boolean {
    if (!token) return false;
    const parts = token.split(":");
    if (parts.length !== 2) return false;
    const [id, signature] = parts;
    const request = this.requests.get(id);
    if (!request || request.status !== "approved" || !request.token) return false;
    if (this.isExpired(request)) return false;
    if (
      request.actionType !== actionType ||
      request.scope !== scope ||
      request.planHash !== planHash
    ) {
      return false;
    }
    const expected = this.buildToken(request);
    return expected === `${id}:${signature}`;
  }

  getAuditLog(): ApprovalRequest[] {
    return [...this.audit];
  }

  private getRequest(id: string): ApprovalRequest {
    const request = this.requests.get(id);
    if (!request) {
      throw new Error("Approval request not found");
    }
    return request;
  }

  private isExpired(request: ApprovalRequest): boolean {
    return Date.now() - request.createdAt > request.ttlMs;
  }

  private buildToken(request: ApprovalRequest): string {
    const id = request.id;
    const signature = crypto
      .createHash("sha256")
      .update([request.actionType, request.scope, request.planHash, request.createdAt].join("|"))
      .digest("hex");
    return `${id}:${signature}`;
  }
}
