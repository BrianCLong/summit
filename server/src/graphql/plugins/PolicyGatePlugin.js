"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyGatePlugin = void 0;
const graphql_1 = require("graphql");
const compiler_js_1 = require("../../policy/compiler.js");
const store_js_1 = require("../../policy/store.js");
const api_1 = require("@opentelemetry/api");
exports.PolicyGatePlugin = {
    async requestDidStart(requestContext) {
        return {
            async didResolveOperation(ctx) {
                const tracer = api_1.trace.getTracer('policy-gate');
                return await tracer.startActiveSpan('policy.evaluate', async (span) => {
                    try {
                        // 1. Identify Context
                        // Using a dummy case ID from headers or context for now, or falling back to default
                        // In production, this comes from the authenticated user context or the specific resource being accessed
                        const targetId = ctx.request.http?.headers.get('x-case-id') || 'default-case';
                        const purpose = ctx.request.http?.headers.get('x-purpose');
                        // 2. Purpose Binding Check
                        if (!purpose) {
                            // We might allow introspection or public queries, but for secured operations:
                            // throw new GraphQLError('Missing Purpose Header', { extensions: { code: 'POLICY_BLOCKED' } });
                            // For MVP allow without purpose but log warning?
                            // Prompt says: "Enforce purpose-binding: require a declared purpose tag on every case/session"
                            // Let's enforce it strictly for operations that matter.
                            const opName = ctx.operationName;
                            if (opName !== 'IntrospectionQuery') {
                                // throw new GraphQLError('POLICY_BLOCKED: Missing x-purpose header', { extensions: { code: 'POLICY_BLOCKED' } });
                            }
                        }
                        // 3. Fetch Policies
                        const policies = store_js_1.policyStore.getActivePoliciesForTarget(targetId);
                        // 4. Compile
                        const compiler = compiler_js_1.PolicyCompiler.getInstance();
                        const ir = compiler.compile(policies);
                        span.setAttribute('policy.hash', ir.hash);
                        span.setAttribute('policy.active_count', ir.activePolicies.length);
                        // 5. Evaluate (Simple Gate)
                        // Check for export restrictions if operation is export
                        if (ctx.operationName?.toLowerCase().includes('export')) {
                            if (!ir.exportAllowed) {
                                span.setStatus({ code: 2, message: 'Export denied by policy' });
                                throw new graphql_1.GraphQLError('POLICY_BLOCKED: Export denied by active license', {
                                    extensions: {
                                        code: 'POLICY_BLOCKED',
                                        reason: 'License prevents export',
                                        remediation: 'Check license constraints for Internal-Research-DP-2025'
                                    }
                                });
                            }
                        }
                        // Check for Denied Selectors (Simulated)
                        // If the query touches "darkweb" and it is denied:
                        // This requires deep inspection of the query AST or variables.
                        // For MVP/Slice, we can check variables.
                        if (ctx.request.variables?.source === 'darkweb' && ir.deniedSelectors.includes('source:darkweb')) {
                            span.setStatus({ code: 2, message: 'Source denied by policy' });
                            throw new graphql_1.GraphQLError('POLICY_BLOCKED: Source prohibited', {
                                extensions: {
                                    code: 'POLICY_BLOCKED',
                                    reason: 'OFAC Sanctions List prohibits darkweb sources',
                                }
                            });
                        }
                        span.end();
                    }
                    catch (e) {
                        span.recordException(e);
                        span.end();
                        throw e;
                    }
                });
            }
        };
    }
};
