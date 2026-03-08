"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.$Graph = void 0;
/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
exports.$Graph = {
    type: 'all-of',
    contains: [{
            type: 'GraphSummary',
        }, {
            properties: {
                configuration: {
                    properties: {
                        layout: {
                            type: 'Enum',
                        },
                        theme: {
                            type: 'Enum',
                        },
                        autoSave: {
                            type: 'boolean',
                        },
                    },
                },
                statistics: {
                    properties: {
                        density: {
                            type: 'number',
                            format: 'float',
                        },
                        clusteringCoefficient: {
                            type: 'number',
                            format: 'float',
                        },
                        averageDegree: {
                            type: 'number',
                            format: 'float',
                        },
                    },
                },
            },
        }],
};
