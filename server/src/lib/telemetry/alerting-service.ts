
class AlertingService {
  public sendAlert(message: string) {
    console.log(`[ALERT] ${message}`);
    // In a real implementation, this would send a request to PagerDuty, Slack, etc.
  }
}

export const alertingService = new AlertingService();
