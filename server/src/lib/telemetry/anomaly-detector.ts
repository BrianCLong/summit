
import { telemetry } from './comprehensive-telemetry';
import { snapshotter } from './diagnostic-snapshotter';
import { alertingService } from './alerting-service';

class AnomalyDetector {
  private metricBaselines: Map<string, { mean: number; std: number }> = new Map();
  private metricData: Map<string, number[]> = new Map();

  constructor() {
    telemetry.onMetric(this.processMetric.bind(this));
  }

  private processMetric(metricName: string, value: number) {
    if (!this.metricData.has(metricName)) {
      this.metricData.set(metricName, []);
    }
    const data = this.metricData.get(metricName);

    if (this.metricBaselines.has(metricName)) {
      this.detectAnomalies(metricName, value);
    }

    data.push(value);

    if (data.length > 100) {
      this.updateBaseline(metricName, data);
      this.metricData.set(metricName, []);
    }
  }

  private updateBaseline(metricName: string, data: number[]) {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    const std = Math.sqrt(data.map((x) => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / data.length);

    const existingBaseline = this.metricBaselines.get(metricName);
    if (existingBaseline) {
      this.metricBaselines.set(metricName, {
        mean: existingBaseline.mean * 0.9 + mean * 0.1,
        std: existingBaseline.std * 0.9 + std * 0.1,
      });
    } else {
      this.metricBaselines.set(metricName, { mean, std });
    }
  }

  private detectAnomalies(metricName: string, value: number) {
    const baseline = this.metricBaselines.get(metricName);
    if (!baseline || baseline.std === 0) {
      return;
    }

    const zScore = (value - baseline.mean) / baseline.std;
    if (Math.abs(zScore) > 3) {
      this.triggerAlert(metricName, value, zScore);
    }
  }

  private triggerAlert(metricName: string, value: number, zScore: number) {
    const alertMessage = `Anomaly detected in ${metricName}: value=${value}, z-score=${zScore}`;
    alertingService.sendAlert(alertMessage);
    snapshotter.triggerSnapshot(`anomaly_detected_${metricName}`);
  }
}

export const anomalyDetector = new AnomalyDetector();
