"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultQuotes = exports.CCEClient = void 0;
class CCEClient {
    endpoint;
    quotes;
    constructor(endpoint = 'http://localhost:8443', quotes = []) {
        this.endpoint = endpoint;
        this.quotes = quotes;
    }
    withQuotes(quotes) {
        this.quotes = quotes;
        return this;
    }
    async runJob(options) {
        const targetQuote = options.quote || this.quotes[0];
        if (!targetQuote) {
            throw new Error('No attestation quote provided');
        }
        const response = await fetch(`${options.endpoint || this.endpoint}/api.ComputeEnclave/RunJob`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobId: options.jobId,
                payload: options.payload,
                region: options.region || targetQuote.region,
                allowEgress: Boolean(options.allowEgress),
                manifestHash: options.manifestHash,
                attestationQuote: targetQuote.quote,
                clientPublicKey: options.clientPublicKey || 'ephemeral-client-key',
            }),
        });
        if (!response.ok) {
            throw new Error(`CCE job failed: ${response.statusText}`);
        }
        return (await response.json());
    }
}
exports.CCEClient = CCEClient;
exports.defaultQuotes = [
    {
        id: 'test-quote-1',
        region: 'us-east-1',
        quote: 'attest:test-quote-1:f1c8c55d3c9d5b57a3678c3a60afcd72bafc2c24d0c9b5580d1a6d1f44b68859',
    },
    {
        id: 'test-quote-2',
        region: 'eu-central-1',
        quote: 'attest:test-quote-2:f1c8c55d3c9d5b57a3678c3a60afcd72bafc2c24d0c9b5580d1a6d1f44b68859',
    },
];
