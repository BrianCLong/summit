// @ts-nocheck
// server/src/lib/resources/resource-allocator.ts

/**
 * @file Allocates resources to tenants based on quotas and priority.
 * @author Jules
 * @version 1.1.0
 *
 * @warning This implementation uses a non-persistent in-memory queue.
 */

import { QuotaManager, ResourceType, ResourceIdentifiers } from './quota-manager.js';

// Access the singleton instance
const quotaManager = QuotaManager.getInstance();

interface QueuedRequest {
  id: string;
  tenantId: string;
  resource: ResourceType;
  amount: number;
  priority: number; // Lower number means higher priority
  identifiers: ResourceIdentifiers;
  resolve: (value: boolean | PromiseLike<boolean>) => void;
  reject: (reason?: unknown) => void;
}

export class ResourceAllocator {
  private requestQueue: QueuedRequest[] = [];

  public requestResource(
    id: string,
    tenantId: string,
    resource: ResourceType,
    amount: number,
    priority: number,
    identifiers: ResourceIdentifiers,
  ): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        id,
        tenantId,
        resource,
        amount,
        priority,
        identifiers,
        resolve,
        reject,
      });
      this.requestQueue.sort((a, b) => a.priority - b.priority);
      this.processQueue();
    });
  }

  public releaseResource(
    tenantId: string,
    resource: ResourceType,
    amount: number,
    identifiers: ResourceIdentifiers,
  ): void {
    quotaManager.releaseQuota(tenantId, resource, amount, identifiers);
    this.processQueue();
  }

  private processQueue(): void {
    for (let i = 0; i < this.requestQueue.length; i++) {
      const request = this.requestQueue[i];
      const check = quotaManager.checkQuota(
        request.tenantId,
        request.resource,
        request.amount,
        request.identifiers
      );

      if (check.allowed) {
        quotaManager.consumeQuota(
          request.tenantId,
          request.resource,
          request.amount,
          request.identifiers,
        );
        // Remove the request from the queue and resolve its promise
        this.requestQueue.splice(i, 1);
        i--; // Decrement i because we've removed an element
        request.resolve(true);
      } else {
        // If a high-priority request is blocked, stop processing the queue
        // to ensure lower-priority requests don't jump ahead.
        // Optional: Implement timeout or rejection for blocked requests

        // For now, if blocked by budget (hard stop), we might want to reject immediately
        if (check.reason && check.reason.includes('Budget exceeded')) {
             this.requestQueue.splice(i, 1);
             i--;
             request.resolve(false); // Resolve as false (denied)
        } else {
             break; // Blocked by concurrency limit, wait.
        }
      }
    }
  }
}

export const resourceAllocator = new ResourceAllocator();
