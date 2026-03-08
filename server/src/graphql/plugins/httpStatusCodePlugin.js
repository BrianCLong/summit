"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpStatusCodePlugin = void 0;
/**
 * Apollo Server plugin that sets HTTP status codes based on GraphQL error extensions.
 *
 * By default, Apollo Server returns HTTP 200 for all GraphQL responses, even those
 * containing errors. This plugin examines the `extensions.http.status` field on
 * GraphQL errors and sets the HTTP response status accordingly.
 *
 * This is useful for:
 * - RESTful clients that rely on HTTP status codes
 * - Monitoring and alerting systems
 * - Security guardrails and validation
 */
const httpStatusCodePlugin = () => {
    return {
        async requestDidStart() {
            return {
                async willSendResponse({ response, contextValue }) {
                    // Only modify status if there are errors
                    if (response.body.kind === 'single' && response.body.singleResult.errors) {
                        const errors = response.body.singleResult.errors;
                        // Find the highest priority status code from all errors
                        let statusCode = 200;
                        for (const error of errors) {
                            const http = error.extensions?.http;
                            const errorStatus = http?.status;
                            if (typeof errorStatus === 'number') {
                                // Prioritize: 5xx > 4xx > 2xx
                                if (errorStatus >= 500) {
                                    statusCode = errorStatus;
                                    break; // 5xx is highest priority, stop searching
                                }
                                else if (errorStatus >= 400 && statusCode < 500) {
                                    statusCode = errorStatus;
                                }
                                else if (statusCode === 200) {
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
            };
        },
    };
};
exports.httpStatusCodePlugin = httpStatusCodePlugin;
