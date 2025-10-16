import { graphqlResolverDurationSeconds, graphqlResolverErrorsTotal, graphqlResolverCallsTotal, } from '../../monitoring/metrics.js';
const resolverMetricsPlugin = {
    async requestDidStart() {
        return {
            executionDidStart() {
                return {
                    willResolveField({ info }) {
                        const start = process.hrtime.bigint();
                        const labels = {
                            resolver_name: `${info.parentType.name}.${info.fieldName}`,
                            field_name: info.fieldName,
                            type_name: info.parentType.name,
                        };
                        graphqlResolverCallsTotal.inc(labels);
                        return (error) => {
                            const duration = Number(process.hrtime.bigint() - start) / 1e9;
                            graphqlResolverDurationSeconds.observe({ ...labels, status: error ? 'error' : 'success' }, duration);
                            if (error) {
                                const errType = error?.constructor?.name || 'Error';
                                graphqlResolverErrorsTotal.inc({
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
export default resolverMetricsPlugin;
//# sourceMappingURL=resolverMetrics.js.map