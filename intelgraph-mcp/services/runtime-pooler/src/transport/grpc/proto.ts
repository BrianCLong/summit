import path from 'node:path';
import fs from 'node:fs';
import { loadPackageDefinition } from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const DEFAULT_PROTO = 'services/runtime-pooler/proto/mcp-transport.proto';
const LOCAL_PROTO = 'proto/mcp-transport.proto';

export function loadMcpProto() {
  const protoPath = resolveProtoPath();
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  return loadPackageDefinition(packageDefinition);
}

function resolveProtoPath() {
  const candidates = [
    process.env.MCP_GRPC_PROTO_PATH,
    path.resolve(process.cwd(), DEFAULT_PROTO),
    path.resolve(process.cwd(), LOCAL_PROTO),
    path.resolve(__dirname, '../../../proto/mcp-transport.proto'),
    path.resolve(__dirname, '../../../../proto/mcp-transport.proto'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('MCP gRPC proto not found');
}
