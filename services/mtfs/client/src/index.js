"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MtfsClient = void 0;
const node_path_1 = __importDefault(require("node:path"));
const grpc_js_1 = require("@grpc/grpc-js");
const proto_loader_1 = require("@grpc/proto-loader");
const loaderOptions = {
    longs: Number,
    enums: String,
    defaults: true,
    oneofs: true,
};
class MtfsClient {
    client;
    constructor(address, protoPath) {
        const resolvedProto = protoPath ?? node_path_1.default.join(__dirname, '..', '..', 'proto', 'mtfs.proto');
        const packageDefinition = (0, proto_loader_1.loadSync)(resolvedProto, loaderOptions);
        const grpcPackage = (0, grpc_js_1.loadPackageDefinition)(packageDefinition);
        const ServiceCtor = grpcPackage.mtfs.MtfsService;
        this.client = new ServiceCtor(address, grpc_js_1.credentials.createInsecure());
    }
    submitJob(options) {
        return new Promise((resolve, reject) => {
            this.client.SubmitJob({
                tenant_id: options.tenantId,
                job_class: options.jobClass,
                policy_tier: options.policyTier,
                resource_units: options.resourceUnits,
                weight: options.weight,
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(response.job_id);
            });
        });
    }
    nextAllocation() {
        return new Promise((resolve, reject) => {
            this.client.NextAllocation({}, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this.mapAllocation(response));
            });
        });
    }
    async streamSnapshots() {
        return new Promise((resolve, reject) => {
            this.client.StreamSnapshots({}, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(response.snapshots.map((snapshot) => this.mapAllocation(snapshot)));
            });
        });
    }
    async simulate(overrides, steps) {
        return new Promise((resolve, reject) => {
            this.client.Simulate({
                overrides: overrides.map((override) => ({
                    tenant_id: override.tenantId,
                    weight: override.weight,
                })),
                steps,
            }, (err, response) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(response.allocations.map((allocation) => this.mapAllocation(allocation)));
            });
        });
    }
    mapAllocation(allocation) {
        return {
            jobId: allocation.job_id,
            tenantId: allocation.tenant_id,
            jobClass: allocation.job_class,
            policyTier: allocation.policy_tier,
            allocatedUnits: allocation.allocated_units,
            allocationId: allocation.allocation_id,
            waitRounds: allocation.wait_rounds,
            slaBreach: allocation.sla_breach,
            snapshotJson: allocation.snapshot_json,
            signature: allocation.signature,
        };
    }
}
exports.MtfsClient = MtfsClient;
