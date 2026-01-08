import path from "node:path";
import { fileURLToPath } from "node:url";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import type { PackageDefinition } from "@grpc/proto-loader";
import type { ProtoGrpcType } from "./proto/prov-ledger.js";
import type { LedgerService } from "./service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const protoPath = path.join(__dirname, "proto", "prov-ledger.proto");

export interface GrpcServerOptions {
  bind?: string;
  onReady?: (port: number) => void;
}

export function createGrpcServer(
  service: LedgerService,
  options: GrpcServerOptions = {}
): grpc.Server {
  const packageDefinition: PackageDefinition = protoLoader.loadSync(protoPath, {
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;
  const server = new grpc.Server();
  server.addService(proto.prov.Ledger.service, {
    AppendClaim: (call, callback) => {
      try {
        const { caseId, fact, signature, accessToken, zkProof } = call.request;
        const normalizedSignature = {
          ...signature,
          lamport: signature?.lamport ?? { algorithm: "lamport-ots-sha256", signature: [] },
          lamportPublicKey:
            signature?.lamportPublicKey?.map((row: { left: string; right: string }) => [
              row.left,
              row.right,
            ]) ?? [],
        } as any;
        const entry = service.appendClaim(caseId, fact, normalizedSignature, accessToken, zkProof);
        callback(null, { entry });
      } catch (error) {
        callback({ code: grpc.status.INVALID_ARGUMENT, message: (error as Error).message });
      }
    },
    ExportManifest: (call, callback) => {
      try {
        const { caseId } = call.request;
        const record = service.exportManifest(caseId);
        callback(null, record);
      } catch (error) {
        callback({ code: grpc.status.INVALID_ARGUMENT, message: (error as Error).message });
      }
    },
  });
  const bind = options.bind ?? "0.0.0.0:50051";
  server.bindAsync(bind, grpc.ServerCredentials.createInsecure(), (err, port) => {
    if (err) throw err;
    options.onReady?.(port);
    server.start();
  });
  return server;
}
