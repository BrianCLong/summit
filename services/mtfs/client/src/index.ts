import path from 'node:path';
import {
  credentials,
  loadPackageDefinition as loadGrpcPackageDefinition,
} from '@grpc/grpc-js';
import { loadSync, Options as ProtoLoaderOptions } from '@grpc/proto-loader';

type JobClass = 'batch' | 'online';
type PolicyTier = 'gold' | 'silver' | 'bronze';

export interface SubmitJobOptions {
  tenantId: string;
  jobClass: JobClass;
  policyTier: PolicyTier;
  resourceUnits: number;
  weight: number;
}

export interface Allocation {
  jobId: number;
  tenantId: string;
  jobClass: JobClass;
  policyTier: PolicyTier;
  allocatedUnits: number;
  allocationId: number;
  waitRounds: number;
  slaBreach: boolean;
  snapshotJson: string;
  signature: string;
}

export interface SimulationOverride {
  tenantId: string;
  weight: number;
}

const loaderOptions: ProtoLoaderOptions = {
  longs: Number,
  enums: String,
  defaults: true,
  oneofs: true,
};

export class MtfsClient {
  private readonly client: any;

  constructor(address: string, protoPath?: string) {
    const resolvedProto =
      protoPath ?? path.join(__dirname, '..', '..', 'proto', 'mtfs.proto');
    const packageDefinition = loadSync(resolvedProto, loaderOptions);
    const grpcPackage = loadGrpcPackageDefinition(packageDefinition) as any;
    const ServiceCtor = grpcPackage.mtfs.MtfsService;
    this.client = new ServiceCtor(address, credentials.createInsecure());
  }

  submitJob(options: SubmitJobOptions): Promise<number> {
    return new Promise((resolve, reject) => {
      this.client.SubmitJob(
        {
          tenant_id: options.tenantId,
          job_class: options.jobClass,
          policy_tier: options.policyTier,
          resource_units: options.resourceUnits,
          weight: options.weight,
        },
        (err: Error | null, response: { job_id: number }) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(response.job_id);
        },
      );
    });
  }

  nextAllocation(): Promise<Allocation> {
    return new Promise((resolve, reject) => {
      this.client.NextAllocation({}, (err: Error | null, response: any) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.mapAllocation(response));
      });
    });
  }

  async streamSnapshots(): Promise<Allocation[]> {
    return new Promise((resolve, reject) => {
      this.client.StreamSnapshots(
        {},
        (err: Error | null, response: { snapshots: any[] }) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(
            response.snapshots.map((snapshot) => this.mapAllocation(snapshot)),
          );
        },
      );
    });
  }

  async simulate(
    overrides: SimulationOverride[],
    steps: number,
  ): Promise<Allocation[]> {
    return new Promise((resolve, reject) => {
      this.client.Simulate(
        {
          overrides: overrides.map((override) => ({
            tenant_id: override.tenantId,
            weight: override.weight,
          })),
          steps,
        },
        (err: Error | null, response: { allocations: any[] }) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(
            response.allocations.map((allocation) =>
              this.mapAllocation(allocation),
            ),
          );
        },
      );
    });
  }

  private mapAllocation(allocation: any): Allocation {
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
