/* eslint-disable */
// Minimal runtime type definition for prov-ledger gRPC service
import type * as grpc from "@grpc/grpc-js";
import type { MessageTypeDefinition } from "@grpc/proto-loader";

export interface ProtoGrpcType {
  prov: {
    Ledger: {
      service: grpc.ServiceDefinition<{ [key: string]: grpc.MethodDefinition<unknown, unknown> }>;
    };
    LedgerFactInput: MessageTypeDefinition;
    HybridSignature: MessageTypeDefinition;
    LamportSignature: MessageTypeDefinition;
    LamportPublicKeyRow: MessageTypeDefinition;
    SchnorrProof: MessageTypeDefinition;
    QuantumLedgerEntry: MessageTypeDefinition;
    AppendClaimRequest: MessageTypeDefinition;
    AppendClaimResponse: MessageTypeDefinition;
    ExportManifestRequest: MessageTypeDefinition;
    ExportManifest: MessageTypeDefinition;
    ExportManifestResponse: MessageTypeDefinition;
    ManifestTransform: MessageTypeDefinition;
  };
}
