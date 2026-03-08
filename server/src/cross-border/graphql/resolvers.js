"use strict";
/**
 * GraphQL Resolvers for Cross-Border Assistant Interoperability
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.crossBorderResolvers = void 0;
const gateway_js_1 = require("../gateway.js");
/**
 * Map internal status values to GraphQL enum values
 */
function mapPartnerStatus(status) {
    return status.toUpperCase();
}
function mapDataClassification(classification) {
    return classification.toUpperCase().replace(/_/g, '_');
}
function mapHandoverState(state) {
    return state.toUpperCase();
}
/**
 * Transform partner for GraphQL response
 */
function transformPartner(partner) {
    return {
        ...partner,
        status: mapPartnerStatus(partner.status),
        trustLevel: {
            ...partner.trustLevel,
            maxDataClassification: mapDataClassification(partner.trustLevel.maxDataClassification),
        },
    };
}
/**
 * Transform session for GraphQL response
 */
function transformSession(session) {
    return {
        ...session,
        state: mapHandoverState(session.state),
        context: {
            ...session.context,
            dataClassification: mapDataClassification(session.context.dataClassification),
        },
    };
}
exports.crossBorderResolvers = {
    Query: {
        crossBorderPartners: () => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            return gateway.getPartners().map(transformPartner);
        },
        crossBorderPartner: (_, { code }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            const partner = gateway.getPartner(code);
            return partner ? transformPartner(partner) : null;
        },
        findCrossBorderPartners: (_, { input, }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            if (input.domain) {
                let partners = gateway.findPartnersByDomain(input.domain);
                if (input.language) {
                    partners = partners.filter((p) => p.languages.includes(input.language));
                }
                return partners.map(transformPartner);
            }
            if (input.language) {
                return gateway.findPartnersByLanguage(input.language).map(transformPartner);
            }
            return gateway.getPartners().map(transformPartner);
        },
        crossBorderPartnerHealth: (_, { code }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            const health = gateway.getPartnerHealth(code);
            if (!health)
                return null;
            return {
                ...health,
                status: health.status.toUpperCase(),
            };
        },
        crossBorderSession: (_, { id }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            const session = gateway.getSession(id);
            return session ? transformSession(session) : null;
        },
        crossBorderSessions: () => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            return gateway.getActiveSessions().map(transformSession);
        },
        crossBorderMessages: (_, { sessionId }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            return gateway.getMessages(sessionId).map((msg) => ({
                ...msg,
                type: msg.type.toUpperCase(),
            }));
        },
        detectLanguage: async (_, { text }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            return gateway.detectLanguage(text);
        },
        supportedLanguages: () => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            return gateway.getSupportedLanguages();
        },
        crossBorderGatewayStatus: () => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            return gateway.getStatus();
        },
    },
    Mutation: {
        createCrossBorderSession: async (_, { input, }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            const session = await gateway.createSession({
                targetNation: input.targetNation,
                intent: input.intent,
                language: input.language,
                context: input.dataClassification
                    ? {
                        dataClassification: input.dataClassification.toLowerCase(),
                    }
                    : undefined,
            });
            return transformSession(session);
        },
        sendCrossBorderMessage: async (_, { input, }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            const message = await gateway.sendMessage(input.sessionId, input.content, {
                translate: input.translate,
                targetLanguage: input.targetLanguage,
            });
            return {
                ...message,
                type: message.type.toUpperCase(),
            };
        },
        completeCrossBorderSession: async (_, { sessionId }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            await gateway.completeSession(sessionId);
            return true;
        },
        initiateCrossBorderHandover: async (_, { sessionId, targetNation, reason, }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            return gateway.initiateHandover(sessionId, targetNation, reason);
        },
        translateText: async (_, { input, }) => {
            const gateway = (0, gateway_js_1.getCrossBorderGateway)();
            const { getMultilingualBridge } = await Promise.resolve().then(() => __importStar(require('../multilingual-bridge.js')));
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
            subscribe: async function* (_, { sessionId }) {
                const gateway = (0, gateway_js_1.getCrossBorderGateway)();
                // Initial state
                const session = gateway.getSession(sessionId);
                if (session) {
                    yield { crossBorderSessionState: transformSession(session) };
                }
                // Listen for state changes
                const listener = (data) => {
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
            // eslint-disable-next-line require-yield
            subscribe: async function* (_, { sessionId }) {
                const gateway = (0, gateway_js_1.getCrossBorderGateway)();
                const listener = (message) => {
                    if (message.sessionId === sessionId) {
                        return {
                            crossBorderMessageReceived: {
                                ...message,
                                type: message.type?.toUpperCase(),
                            },
                        };
                    }
                };
                // Placeholder yield to satisfy generator requirements
                yield { crossBorderMessageReceived: { sessionId, content: 'Subscription started', type: 'SYSTEM', timestamp: Date.now() } };
                gateway.on('messageSent', listener);
            },
        },
    },
};
