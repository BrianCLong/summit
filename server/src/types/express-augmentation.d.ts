import { DataEnvelope } from './data-envelope.js';
// import { ProvenanceChain } from './provenance-beta.js';

declare global {
    namespace Express {
        export interface Request {
            tenantId?: string;
            dataEnvelope?: DataEnvelope;
            correlationId?: string;
            provenanceChain?: any; // Relaxed to `any` to support both beta and canonical chains
            userId?: string;
            user?: any;
            envelope?: DataEnvelope;
            intelGraphService?: any;
        }

        export interface Response {
            locals: {
                correlationId?: string;
                provenanceId?: string;
                warnings?: string[];
                [key: string]: any;
            };
        }
    }
}
