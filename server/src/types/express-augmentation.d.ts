import { DataEnvelope } from './data-envelope';
// import { ProvenanceChain } from './provenance-beta';

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
