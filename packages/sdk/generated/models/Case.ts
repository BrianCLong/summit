/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type Case = {
    /**
     * Unique case identifier
     */
    id: string;
    /**
     * Case title
     */
    title: string;
    status: 'draft' | 'open' | 'approved' | 'closed';
    evidence: Array<string>;
    createdAt?: string;
};

