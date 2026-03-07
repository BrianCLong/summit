import { Alert, PlaybookAction, Ticket } from "./types";
export type { Ticket };

export interface SupportPlan {
  taggedTickets: Ticket[];
  deflection: PlaybookAction[];
  copilot: PlaybookAction;
  escalations: PlaybookAction[];
}

export function buildSupportPlan(tickets: Ticket[], alerts: Alert[]): SupportPlan {
  const taggedTickets = tickets.map((ticket) => ({
    ...ticket,
    type: ticket.churnRisk ? `${ticket.type}:churn-risk` : ticket.type,
  }));

  const deflection: PlaybookAction[] = [
    {
      id: "deflection-errors",
      category: "support",
      description: "Improve errors, diagnostics, and self-serve repair actions",
    },
    {
      id: "status-indicators",
      category: "support",
      description: "Expose customer-facing status and health indicators inside product",
    },
  ];

  const copilot: PlaybookAction = {
    id: "support-copilot",
    category: "support",
    description:
      "Provide timeline enrichment, suggested fixes, macros, and bug-to-customer mapping",
    artifacts: ["customer-timeline", "macro-library", "bug-mapping"],
  };

  const escalations: PlaybookAction[] = alerts.map((alert) => ({
    id: `escalation-${alert.kind}-${alert.occurredAt.getTime()}`,
    category: "support",
    description: alert.recommendedPlaybook,
    requiresApproval: alert.severity === "critical",
    slaMinutes: alert.kind === "error-spike" ? 30 : 60,
  }));

  if (tickets.some((ticket) => ticket.repeating)) {
    escalations.push({
      id: "repeat-ticket-root-cause",
      category: "support",
      description: "Reduce repeat tickets by fixing top 10 drivers each week",
      requiresApproval: false,
    });
  }

  return {
    taggedTickets,
    deflection,
    copilot,
    escalations,
  };
}
