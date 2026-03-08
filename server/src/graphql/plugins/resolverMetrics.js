"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const metrics_js_1 = require("../../monitoring/metrics.js");
const resolverMetricsPlugin = {
    async requestDidStart(_ctx) {
        return {
            async executionDidStart() {
                return {
                    willResolveField({ info }) {
                        const start = process.hrtime.bigint();
                        const labels = {
                            resolver_name: `${info.parentType.name}.${info.fieldName}`,
                            field_name: info.fieldName,
                            type_name: info.parentType.name,
                        };
                        if (metrics_js_1.graphqlResolverCallsTotal) {
                            metrics_js_1.graphqlResolverCallsTotal.inc(labels);
                        }
                        return (error) => {
                            const duration = Number(process.hrtime.bigint() - start) / 1e9;
                            if (metrics_js_1.graphqlResolverDurationSeconds) {
                                metrics_js_1.graphqlResolverDurationSeconds.observe({ ...labels, status: error ? 'error' : 'success' }, duration);
                            }
                            if (error && metrics_js_1.graphqlResolverErrorsTotal) {
                                const errType = error?.constructor?.name || 'Error';
                                metrics_js_1.graphqlResolverErrorsTotal.inc({
                                    ...labels,
                                    error_type: errType,
                                });
                            }
                        };
                    },
                };
            },
        };
    },
};
exports.default = resolverMetricsPlugin;
