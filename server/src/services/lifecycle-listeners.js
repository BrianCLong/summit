"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifecycleManager = void 0;
exports.handleRunEvent = handleRunEvent;
exports.handleDeploymentEvent = handleDeploymentEvent;
const ticket_links_js_1 = require("./ticket-links.js");
/**
 * Lifecycle listener for run events
 */
async function handleRunEvent(event) {
    console.log(`Handling run event: ${event.type} for run ${event.runId}`);
    try {
        // Extract ticket information from metadata
        if (event.metadata) {
            const ticket = (0, ticket_links_js_1.extractTicketFromMetadata)(event.metadata);
            if (ticket) {
                await (0, ticket_links_js_1.addTicketRunLink)(ticket, event.runId, {
                    event_type: event.type,
                    timestamp: event.timestamp.toISOString(),
                    ...event.metadata,
                });
                console.log(`Successfully linked ticket ${ticket.provider}:${ticket.externalId} to run ${event.runId} via ${event.type} event`);
            }
            else {
                console.log(`No ticket information found in run ${event.runId} metadata`);
            }
        }
    }
    catch (error) {
        console.error(`Failed to handle run event for ${event.runId}:`, error);
    }
}
/**
 * Lifecycle listener for deployment events
 */
async function handleDeploymentEvent(event) {
    console.log(`Handling deployment event: ${event.type} for deployment ${event.deploymentId}`);
    try {
        // Extract ticket information from metadata
        if (event.metadata) {
            const ticket = (0, ticket_links_js_1.extractTicketFromMetadata)(event.metadata);
            if (ticket) {
                await (0, ticket_links_js_1.addTicketDeploymentLink)(ticket, event.deploymentId, {
                    event_type: event.type,
                    timestamp: event.timestamp.toISOString(),
                    ...event.metadata,
                });
                console.log(`Successfully linked ticket ${ticket.provider}:${ticket.externalId} to deployment ${event.deploymentId} via ${event.type} event`);
            }
            else {
                console.log(`No ticket information found in deployment ${event.deploymentId} metadata`);
            }
        }
    }
    catch (error) {
        console.error(`Failed to handle deployment event for ${event.deploymentId}:`, error);
    }
}
/**
 * Register lifecycle listeners to be called when runs/deployments are created/updated
 */
class LifecycleManager {
    static runListeners = [];
    static deploymentListeners = [];
    static onRunEvent(listener) {
        this.runListeners.push(listener);
    }
    static onDeploymentEvent(listener) {
        this.deploymentListeners.push(listener);
    }
    static async emitRunEvent(event) {
        for (const listener of this.runListeners) {
            try {
                await listener(event);
            }
            catch (error) {
                console.error('Run event listener error:', error);
            }
        }
    }
    static async emitDeploymentEvent(event) {
        for (const listener of this.deploymentListeners) {
            try {
                await listener(event);
            }
            catch (error) {
                console.error('Deployment event listener error:', error);
            }
        }
    }
}
exports.LifecycleManager = LifecycleManager;
// Register the ticket linking listeners
LifecycleManager.onRunEvent(handleRunEvent);
LifecycleManager.onDeploymentEvent(handleDeploymentEvent);
