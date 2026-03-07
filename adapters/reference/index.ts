import type { ReferenceAdapterDefinition } from "./types";
import { oidcScimAdapter } from "./oidc-scim/definition";
import { s3StorageAdapter } from "./s3-storage/definition";
import { webhookSinkAdapter } from "./webhook-sink/definition";

export const referenceAdapters: ReferenceAdapterDefinition[] = [
  oidcScimAdapter,
  s3StorageAdapter,
  webhookSinkAdapter,
];

export * from "./types";
export * from "./oidc-scim/definition";
export * from "./s3-storage/definition";
export * from "./webhook-sink/definition";
