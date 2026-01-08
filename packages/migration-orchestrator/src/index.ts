import { AccountLinkService, TenantLifecycle } from "./accounts.ts";
import { BackfillFramework } from "./backfill.ts";
import { DashboardBuilder } from "./dashboard.ts";
import { EntitlementService } from "./entitlements.ts";
import { IdentityService } from "./identity.ts";
import { IntegrationService } from "./integrations.ts";
import { LegalCompliance } from "./legal.ts";
import { ParityEngine } from "./parity.ts";
import { ReliabilityManager } from "./reliability.ts";
import { SupportManager } from "./support.ts";
import { UXParityService } from "./ux.ts";

export class MigrationOrchestrator {
  constructor() {
    this.identity = new IdentityService();
    this.accountLinks = new AccountLinkService();
    this.lifecycle = new TenantLifecycle();
    this.entitlements = new EntitlementService();
    this.integrations = new IntegrationService();
    this.ux = new UXParityService();
    this.reliability = new ReliabilityManager();
    this.legal = new LegalCompliance();
    this.support = new SupportManager();
    this.parityEngine = new ParityEngine();
  }

  dashboardBuilder() {
    const sources = {
      dataMappings: new Map(),
      parityEngine: this.parityEngine,
      lifecycle: this.lifecycle,
      accountLinks: this.accountLinks,
      entitlements: this.entitlements,
      integrations: this.integrations,
      ux: this.ux,
      reliability: this.reliability,
      support: this.support,
    };
    return new DashboardBuilder(sources);
  }

  backfill(maxRetries, batchSize) {
    return new BackfillFramework(maxRetries, batchSize);
  }
}
