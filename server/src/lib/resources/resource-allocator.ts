// server/src/lib/resources/resource-allocator.ts

/**
 * @file Allocates resources to tenants based on quotas and priority.
 * @author Jules
 * @version 1.0.0
 *
 * @warning This implementation uses a non-persistent in-memory queue.
 * All pending resource requests will be lost on application restart.
 * This is a prototype and is NOT suitable for production use without
 * being refactored to use a persistent queue (e.g., BullMQ, RabbitMQ).
 */

import { quotaManager, ResourceType } from './quota-manager';

interface QueuedRequest {
  id: string;
  tenantId: string;
  resource: ResourceType;
  amount: number;
  priority: number; // Lower number means higher priority
  identifiers: { teamId?: string; userId?: string };
  resolve: (value: boolean | PromiseLike<boolean>)- void;
  reject: (reason?: any) => void;
}

export class ResourceAllocator {
  private requestQueue: QueuedRequest[] = [];

  public requestResource(
    id: string,
    tenantId: string,
    resource: ResourceType,
    amount: number,
    priority: number,
    identifiers: { teamId?: string; userId?: string }
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({ id, tenantId, resource, amount, priority, identifiers, resolve, reject });
      this.requestQueue.sort((a, b) => a.priority - b.priority);
      this.processQueue();
    });
  }

  public releaseResource(
    tenantId: string,
    resource: ResourceType,
    amount: number,
    identifiers: { teamId?: string; userId?: string }
  ): void {
    quotaManager.releaseQuota(tenantId, resource, amount, identifiers);
    this.processQueue();
  }

  private processQueue(): void {
    for (let i = 0; i < this.requestQueue.length; i++) {
      const request = this.requestQueue[i];
      const { allowed } = quotaManager.checkQuota(
        request.tenantId,
        request.resource,
        request.amount,
        request.identifiers
      );

      if (allowed) {
        quotaManager.consumeQuota(
          request.tenantId,
          request.resource,
          request.amount,
          request.identifiers
        );
        // Remove the request from the queue and resolve its promise
        this.requestQueue.splice(i, 1);
        i--; // Decrement i because we've removed an element
        request.resolve(true);
      } else {
        // If a high-priority request is blocked, stop processing the queue
        // to ensure lower-priority requests don't jump ahead.
        break;
      }
    }
  }
}

export const resourceAllocator = new ResourceAllocator();
