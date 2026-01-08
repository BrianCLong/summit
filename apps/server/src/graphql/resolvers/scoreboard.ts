import { scoreboardService } from "../../scoreboard/scoreboardService.js";
import { DomainScoreboard } from "../../scoreboard/types.js";

export const scoreboardResolvers = {
  Query: {
    scoreboards: () => scoreboardService.listScoreboards(),
    domainScoreboard: (_: unknown, { domainId }: { domainId: string }) =>
      scoreboardService.getDomainScoreboard(domainId),
  },
  Mutation: {
    upsertDomainMetrics: (_: unknown, { input }: { input: any }) => {
      return scoreboardService.upsertDomainMetrics(input);
    },
    logDecision: (
      _: unknown,
      {
        input,
      }: {
        input: {
          domainId: string;
          title: string;
          owner: string;
          rationale: string;
          revisitDate: string;
          decisionType: "ONE_WAY_DOOR" | "TWO_WAY_DOOR";
        };
      }
    ) => {
      return scoreboardService.logDecision(input);
    },
    registerException: (
      _: unknown,
      {
        input,
      }: {
        input: { domainId: string; gate: any; owner: string; reason: string; expiresAt: string };
      }
    ) => {
      return scoreboardService.registerException(input);
    },
    registerReleaseEnvelope: (
      _: unknown,
      {
        input,
      }: {
        input: {
          domainId: string;
          owner: string;
          metrics: string[];
          rollbackPlan: string;
          expiresAt?: string;
        };
      }
    ) => {
      return scoreboardService.registerReleaseEnvelope(input);
    },
  },
  DomainScoreboard: {
    health: (scoreboard: DomainScoreboard) => scoreboard.health,
  },
  DomainMetrics: {
    onCall: (scoreboardMetrics: DomainScoreboard["metrics"]) => ({
      ...scoreboardMetrics.onCall,
      status:
        scoreboardService.getDomainScoreboard(scoreboardMetrics.domainId)?.health.onCall ?? "GOOD",
    }),
  },
};
