"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertingService = void 0;
class AlertingService {
    sendAlert(message, context) {
        console.log(`[ALERT] ${message}`);
        if (context) {
            console.log(`[ALERT CONTEXT] Logs: ${context.logs?.length || 0}, Traces: ${context.relatedTraces?.length || 0}`);
            if (context.metricsContext) {
                console.log(`[ALERT METRICS] ${JSON.stringify(context.metricsContext)}`);
            }
        }
        // In a real implementation, this would send a request to PagerDuty, Slack, etc.
    }
}
exports.alertingService = new AlertingService();
