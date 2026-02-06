import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server';
import type { GraphQLError } from 'graphql';
import type { GraphQLContext } from '../index.js';

/**
 * Apollo Server plugin that sets HTTP status codes based on GraphQL error extensions.
 */
export const httpStatusCodePlugin = (): ApolloServerPlugin<GraphQLContext> => {
    return {
        async requestDidStart() {
            return {
                async willSendResponse({ response }) {
                    // Only modify status if there are errors
                    if (response.body.kind === 'single' && response.body.singleResult.errors) {
                        const errors = response.body.singleResult.errors as GraphQLError[];

                        // Find the highest priority status code from all errors
                        let statusCode = 200;

                        for (const error of errors) {
                            const http = error.extensions?.http as { status?: number } | undefined;
                            const errorStatus = http?.status;
                            if (typeof errorStatus === 'number') {
                                // Prioritize: 5xx > 4xx > 2xx
                                if (errorStatus >= 500) {
                                    statusCode = errorStatus;
                                    break; // 5xx is highest priority, stop searching
                                } else if (errorStatus >= 400 && statusCode < 500) {
                                    statusCode = errorStatus;
                                } else if (statusCode === 200) {
                                    statusCode = errorStatus;
                                }
                            }
                        }

                        // Set the HTTP status code
                        if (statusCode !== 200 && response.http) {
                            response.http.status = statusCode;
                        }
                    }
                },
            } as GraphQLRequestListener<GraphQLContext>;
        },
    };
};
