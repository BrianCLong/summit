import {
  addTicketRunLink,
  addTicketDeploymentLink,
  extractTicketFromMetadata,
} from './ticket-links.js';

export interface RunEvent {
  type: 'run_created' | 'run_completed' | 'run_failed';
  runId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface DeploymentEvent {
  type: 'deployment_started' | 'deployment_completed' | 'deployment_failed';
  deploymentId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * Lifecycle listener for run events
 */
export async function handleRunEvent(event: RunEvent) {
  console.log(`Handling run event: ${event.type} for run ${event.runId}`);

  try {
    // Extract ticket information from metadata
    if (event.metadata) {
      const ticket = extractTicketFromMetadata(event.metadata);

      if (ticket) {
        await addTicketRunLink(ticket, event.runId, {
          event_type: event.type,
          timestamp: event.timestamp.toISOString(),
          ...event.metadata,
        });

        console.log(
          `Successfully linked ticket ${ticket.provider}:${ticket.externalId} to run ${event.runId} via ${event.type} event`,
        );
      } else {
        console.log(
          `No ticket information found in run ${event.runId} metadata`,
        );
      }
    }
  } catch (error) {
    console.error(`Failed to handle run event for ${event.runId}:`, error);
  }
}

/**
 * Lifecycle listener for deployment events
 */
export async function handleDeploymentEvent(event: DeploymentEvent) {
  console.log(
    `Handling deployment event: ${event.type} for deployment ${event.deploymentId}`,
  );

  try {
    // Extract ticket information from metadata
    if (event.metadata) {
      const ticket = extractTicketFromMetadata(event.metadata);

      if (ticket) {
        await addTicketDeploymentLink(ticket, event.deploymentId, {
          event_type: event.type,
          timestamp: event.timestamp.toISOString(),
          ...event.metadata,
        });

        console.log(
          `Successfully linked ticket ${ticket.provider}:${ticket.externalId} to deployment ${event.deploymentId} via ${event.type} event`,
        );
      } else {
        console.log(
          `No ticket information found in deployment ${event.deploymentId} metadata`,
        );
      }
    }
  } catch (error) {
    console.error(
      `Failed to handle deployment event for ${event.deploymentId}:`,
      error,
    );
  }
}

/**
 * Register lifecycle listeners to be called when runs/deployments are created/updated
 */
export class LifecycleManager {
  private static runListeners: ((event: RunEvent) => void)[] = [];
  private static deploymentListeners: ((event: DeploymentEvent) => void)[] = [];

  static onRunEvent(listener: (event: RunEvent) => void) {
    this.runListeners.push(listener);
  }

  static onDeploymentEvent(listener: (event: DeploymentEvent) => void) {
    this.deploymentListeners.push(listener);
  }

  static async emitRunEvent(event: RunEvent) {
    for (const listener of this.runListeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error('Run event listener error:', error);
      }
    }
  }

  static async emitDeploymentEvent(event: DeploymentEvent) {
    for (const listener of this.deploymentListeners) {
      try {
        await listener(event);
      } catch (error) {
        console.error('Deployment event listener error:', error);
      }
    }
  }
}

// Register the ticket linking listeners
LifecycleManager.onRunEvent(handleRunEvent);
LifecycleManager.onDeploymentEvent(handleDeploymentEvent);
