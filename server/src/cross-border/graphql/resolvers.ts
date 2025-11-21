/**
 * GraphQL Resolvers for Cross-Border Assistant Interoperability
 */

import { getCrossBorderGateway } from '../gateway.js';
import type {
  PartnerNation,
  CrossBorderSession,
  DataClassification,
} from '../types.js';

/**
 * Map internal status values to GraphQL enum values
 */
function mapPartnerStatus(status: string): string {
  return status.toUpperCase();
}

function mapDataClassification(classification: DataClassification): string {
  return classification.toUpperCase().replace(/_/g, '_');
}

function mapHandoverState(state: string): string {
  return state.toUpperCase();
}

/**
 * Transform partner for GraphQL response
 */
function transformPartner(partner: PartnerNation) {
  return {
    ...partner,
    status: mapPartnerStatus(partner.status),
    trustLevel: {
      ...partner.trustLevel,
      maxDataClassification: mapDataClassification(
        partner.trustLevel.maxDataClassification
      ),
    },
  };
}

/**
 * Transform session for GraphQL response
 */
function transformSession(session: CrossBorderSession) {
  return {
    ...session,
    state: mapHandoverState(session.state),
    context: {
      ...session.context,
      dataClassification: mapDataClassification(
        session.context.dataClassification
      ),
    },
  };
}

export const crossBorderResolvers = {
  Query: {
    crossBorderPartners: () => {
      const gateway = getCrossBorderGateway();
      return gateway.getPartners().map(transformPartner);
    },

    crossBorderPartner: (_: unknown, { code }: { code: string }) => {
      const gateway = getCrossBorderGateway();
      const partner = gateway.getPartner(code);
      return partner ? transformPartner(partner) : null;
    },

    findCrossBorderPartners: (
      _: unknown,
      {
        input,
      }: {
        input: {
          domain?: string;
          language?: string;
          classification?: string;
          region?: string;
        };
      }
    ) => {
      const gateway = getCrossBorderGateway();

      if (input.domain) {
        let partners = gateway.findPartnersByDomain(input.domain);

        if (input.language) {
          partners = partners.filter((p) =>
            p.languages.includes(input.language!)
          );
        }

        return partners.map(transformPartner);
      }

      if (input.language) {
        return gateway.findPartnersByLanguage(input.language).map(transformPartner);
      }

      return gateway.getPartners().map(transformPartner);
    },

    crossBorderPartnerHealth: (_: unknown, { code }: { code: string }) => {
      const gateway = getCrossBorderGateway();
      const health = gateway.getPartnerHealth(code);
      if (!health) return null;

      return {
        ...health,
        status: health.status.toUpperCase(),
      };
    },

    crossBorderSession: (_: unknown, { id }: { id: string }) => {
      const gateway = getCrossBorderGateway();
      const session = gateway.getSession(id);
      return session ? transformSession(session) : null;
    },

    crossBorderSessions: () => {
      const gateway = getCrossBorderGateway();
      return gateway.getActiveSessions().map(transformSession);
    },

    crossBorderMessages: (_: unknown, { sessionId }: { sessionId: string }) => {
      const gateway = getCrossBorderGateway();
      return gateway.getMessages(sessionId).map((msg) => ({
        ...msg,
        type: msg.type.toUpperCase(),
      }));
    },

    detectLanguage: async (_: unknown, { text }: { text: string }) => {
      const gateway = getCrossBorderGateway();
      return gateway.detectLanguage(text);
    },

    supportedLanguages: () => {
      const gateway = getCrossBorderGateway();
      return gateway.getSupportedLanguages();
    },

    crossBorderGatewayStatus: () => {
      const gateway = getCrossBorderGateway();
      return gateway.getStatus();
    },
  },

  Mutation: {
    createCrossBorderSession: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          targetNation: string;
          intent: string;
          language: string;
          dataClassification?: string;
        };
      }
    ) => {
      const gateway = getCrossBorderGateway();
      const session = await gateway.createSession({
        targetNation: input.targetNation,
        intent: input.intent,
        language: input.language,
        context: input.dataClassification
          ? {
              dataClassification:
                input.dataClassification.toLowerCase() as DataClassification,
            }
          : undefined,
      });
      return transformSession(session);
    },

    sendCrossBorderMessage: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          sessionId: string;
          content: string;
          translate?: boolean;
          targetLanguage?: string;
        };
      }
    ) => {
      const gateway = getCrossBorderGateway();
      const message = await gateway.sendMessage(input.sessionId, input.content, {
        translate: input.translate,
        targetLanguage: input.targetLanguage,
      });
      return {
        ...message,
        type: message.type.toUpperCase(),
      };
    },

    completeCrossBorderSession: async (
      _: unknown,
      { sessionId }: { sessionId: string }
    ) => {
      const gateway = getCrossBorderGateway();
      await gateway.completeSession(sessionId);
      return true;
    },

    initiateCrossBorderHandover: async (
      _: unknown,
      {
        sessionId,
        targetNation,
        reason,
      }: {
        sessionId: string;
        targetNation: string;
        reason: string;
      }
    ) => {
      const gateway = getCrossBorderGateway();
      return gateway.initiateHandover(sessionId, targetNation, reason);
    },

    translateText: async (
      _: unknown,
      {
        input,
      }: {
        input: {
          text: string;
          targetLanguage: string;
          sourceLanguage?: string;
        };
      }
    ) => {
      const gateway = getCrossBorderGateway();
      const { getMultilingualBridge } = await import('../multilingual-bridge.js');
      const translator = getMultilingualBridge();

      return translator.translate({
        text: input.text,
        targetLanguage: input.targetLanguage,
        sourceLanguage: input.sourceLanguage,
      });
    },
  },

  Subscription: {
    crossBorderSessionState: {
      subscribe: async function* (
        _: unknown,
        { sessionId }: { sessionId: string }
      ) {
        const gateway = getCrossBorderGateway();

        // Initial state
        const session = gateway.getSession(sessionId);
        if (session) {
          yield { crossBorderSessionState: transformSession(session) };
        }

        // Listen for state changes
        const listener = (data: { sessionId: string; state: string }) => {
          if (data.sessionId === sessionId) {
            const updatedSession = gateway.getSession(sessionId);
            if (updatedSession) {
              return { crossBorderSessionState: transformSession(updatedSession) };
            }
          }
        };

        gateway.on('sessionStateChanged', listener);
      },
    },

    crossBorderMessageReceived: {
      subscribe: async function* (
        _: unknown,
        { sessionId }: { sessionId: string }
      ) {
        const gateway = getCrossBorderGateway();

        const listener = (message: { sessionId: string }) => {
          if (message.sessionId === sessionId) {
            return {
              crossBorderMessageReceived: {
                ...message,
                type: (message as any).type?.toUpperCase(),
              },
            };
          }
        };

        gateway.on('messageSent', listener);
      },
    },
  },
};
