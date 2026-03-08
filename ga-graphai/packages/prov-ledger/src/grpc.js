"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGrpcServer = createGrpcServer;
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const grpc = __importStar(require("@grpc/grpc-js"));
const protoLoader = __importStar(require("@grpc/proto-loader"));
const __dirname = node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url));
const protoPath = node_path_1.default.join(__dirname, 'proto', 'prov-ledger.proto');
function createGrpcServer(service, options = {}) {
    const packageDefinition = protoLoader.loadSync(protoPath, {
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
    });
    const proto = grpc.loadPackageDefinition(packageDefinition);
    const server = new grpc.Server();
    server.addService(proto.prov.Ledger.service, {
        AppendClaim: (call, callback) => {
            try {
                const { caseId, fact, signature, accessToken, zkProof } = call.request;
                const normalizedSignature = {
                    ...signature,
                    lamport: signature?.lamport ?? { algorithm: 'lamport-ots-sha256', signature: [] },
                    lamportPublicKey: signature?.lamportPublicKey?.map((row) => [row.left, row.right]) ?? [],
                };
                const entry = service.appendClaim(caseId, fact, normalizedSignature, accessToken, zkProof);
                callback(null, { entry });
            }
            catch (error) {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: error.message });
            }
        },
        ExportManifest: (call, callback) => {
            try {
                const { caseId } = call.request;
                const record = service.exportManifest(caseId);
                callback(null, record);
            }
            catch (error) {
                callback({ code: grpc.status.INVALID_ARGUMENT, message: error.message });
            }
        },
    });
    const bind = options.bind ?? '0.0.0.0:50051';
    server.bindAsync(bind, grpc.ServerCredentials.createInsecure(), (err, port) => {
        if (err)
            throw err;
        options.onReady?.(port);
        server.start();
    });
    return server;
}
