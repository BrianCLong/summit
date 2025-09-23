import { EventEmitter } from 'events';
import { Redis } from 'ioredis';
import { prometheus } from '../monitoring/metrics';

/**
 * Streaming SLO Manager
 * Tracks end-to-end alert latency and streaming performance metrics
 */
export class StreamingSLOManager extends EventEmitter {
  private redis: Redis;
  private alertLatencyHistogram: any;
  private kafkaLagGauge: any;
  private websocketBacklogGauge: any;
  private dlqMessageCounter: any;
  private sloViolationCounter: any;
  
  // SLO Definitions
  private readonly SLO_TARGETS = {
    ALERT_LATENCY_P95_MS: 2000,      // Alert producer → consumer → UI in <2s
    KAFKA_CONSUMER_LAG_MAX: 1000,    // Max acceptable consumer lag
    WEBSOCKET_BACKLOG_MAX: 100,      // Max queued WS messages per connection
    DLQ_THRESHOLD_PERCENT: 1.0       // Max 1% of messages to DLQ
  };

  constructor(redis: Redis) {
    super();
    this.redis = redis;
    
    // Initialize Prometheus metrics
    this.alertLatencyHistogram = new prometheus.Histogram({
      name: 'intelgraph_alert_latency_seconds',
      help: 'End-to-end alert processing latency',
      labelNames: ['alert_type', 'tenant_id'],
      buckets: [0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
    });

    this.kafkaLagGauge = new prometheus.Gauge({
      name: 'intelgraph_kafka_consumer_lag',
      help: 'Current consumer lag per topic partition',
      labelNames: ['topic', 'partition', 'consumer_group']
    });

    this.websocketBacklogGauge = new prometheus.Gauge({
      name: 'intelgraph_websocket_backlog',
      help: 'Queued messages per WebSocket connection',
      labelNames: ['connection_id', 'tenant_id']
    });

    this.dlqMessageCounter = new prometheus.Counter({
      name: 'intelgraph_dlq_messages_total',
      help: 'Messages sent to dead letter queue',
      labelNames: ['topic', 'reason', 'tenant_id']
    });

    this.sloViolationCounter = new prometheus.Counter({
      name: 'intelgraph_slo_violations_total',
      help: 'SLO violations by type',
      labelNames: ['slo_type', 'severity']
    });

    this.startPeriodicChecks();
  }

  /**
   * Track alert end-to-end latency
   */
  async trackAlertLatency(alertId: string, alertType: string, tenantId: string, producedAt: Date): Promise<void> {
    const latencyMs = Date.now() - producedAt.getTime();
    const latencySeconds = latencyMs / 1000;
    
    // Record metric
    this.alertLatencyHistogram
      .labels(alertType, tenantId)
      .observe(latencySeconds);
    
    // Check SLO violation
    if (latencyMs > this.SLO_TARGETS.ALERT_LATENCY_P95_MS) {
      this.sloViolationCounter
        .labels('alert_latency', 'warning')
        .inc();
      
      this.emit('slo_violation', {
        type: 'alert_latency',
        alertId,
        alertType,
        tenantId,
        latencyMs,
        threshold: this.SLO_TARGETS.ALERT_LATENCY_P95_MS
      });
    }
    
    // Store for trending analysis
    await this.redis.zadd(
      `alert_latency:${alertType}:${tenantId}`,
      Date.now(),
      JSON.stringify({ alertId, latencyMs, timestamp: Date.now() })
    );
    
    // Keep only last 1000 measurements
    await this.redis.zremrangebyrank(`alert_latency:${alertType}:${tenantId}`, 0, -1001);
  }

  /**
   * Update Kafka consumer lag metrics
   */
  updateKafkaLag(topic: string, partition: number, consumerGroup: string, lag: number): void {
    this.kafkaLagGauge
      .labels(topic, partition.toString(), consumerGroup)
      .set(lag);
    
    // Check SLO violation
    if (lag > this.SLO_TARGETS.KAFKA_CONSUMER_LAG_MAX) {
      this.sloViolationCounter
        .labels('kafka_lag', 'critical')
        .inc();
      
      this.emit('slo_violation', {
        type: 'kafka_lag',
        topic,
        partition,
        consumerGroup,
        currentLag: lag,
        threshold: this.SLO_TARGETS.KAFKA_CONSUMER_LAG_MAX
      });
    }
  }

  /**
   * Update WebSocket backlog metrics
   */
  updateWebSocketBacklog(connectionId: string, tenantId: string, backlogSize: number): void {
    this.websocketBacklogGauge
      .labels(connectionId, tenantId)
      .set(backlogSize);
    
    // Check SLO violation
    if (backlogSize > this.SLO_TARGETS.WEBSOCKET_BACKLOG_MAX) {
      this.sloViolationCounter
        .labels('websocket_backlog', 'warning')
        .inc();
      
      this.emit('slo_violation', {
        type: 'websocket_backlog',
        connectionId,
        tenantId,
        backlogSize,
        threshold: this.SLO_TARGETS.WEBSOCKET_BACKLOG_MAX
      });
    }
  }

  /**
   * Record DLQ message
   */
  recordDLQMessage(topic: string, reason: string, tenantId: string, originalMessage: any): void {
    this.dlqMessageCounter
      .labels(topic, reason, tenantId)
      .inc();
    
    this.emit('dlq_message', {
      topic,
      reason,
      tenantId,
      messageId: originalMessage.key || 'unknown',
      timestamp: Date.now()
    });
  }

  /**
   * Get current SLO status
   */
  async getSLOStatus(): Promise<{
    alertLatencyP95: number;
    kafkaLagMax: number;
    websocketBacklogMax: number;
    dlqRate: number;
    sloCompliance: {
      alertLatency: boolean;
      kafkaLag: boolean;
      websocketBacklog: boolean;
      dlqRate: boolean;
    };
  }> {
    // Calculate p95 alert latency from recent measurements
    const alertLatencyP95 = await this.calculateAlertLatencyP95();
    
    // Get max Kafka lag across all partitions
    const kafkaLagMax = await this.getMaxKafkaLag();
    
    // Get max WebSocket backlog
    const websocketBacklogMax = await this.getMaxWebSocketBacklog();
    
    // Calculate DLQ rate
    const dlqRate = await this.calculateDLQRate();
    
    return {
      alertLatencyP95,
      kafkaLagMax,
      websocketBacklogMax,
      dlqRate,
      sloCompliance: {
        alertLatency: alertLatencyP95 <= this.SLO_TARGETS.ALERT_LATENCY_P95_MS,
        kafkaLag: kafkaLagMax <= this.SLO_TARGETS.KAFKA_CONSUMER_LAG_MAX,
        websocketBacklog: websocketBacklogMax <= this.SLO_TARGETS.WEBSOCKET_BACKLOG_MAX,
        dlqRate: dlqRate <= this.SLO_TARGETS.DLQ_THRESHOLD_PERCENT
      }
    };
  }

  /**
   * Start periodic SLO compliance checks
   */
  private startPeriodicChecks(): void {
    setInterval(async () => {
      try {
        const status = await this.getSLOStatus();
        
        // Emit overall SLO status
        this.emit('slo_status', status);
        
        // Log compliance violations
        Object.entries(status.sloCompliance).forEach(([slo, compliant]) => {
          if (!compliant) {
            console.warn(`SLO violation: ${slo} not meeting target`);
          }
        });
        
      } catch (error) {
        console.error('Error checking SLO compliance:', error);
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Calculate p95 alert latency from recent measurements
   */
  private async calculateAlertLatencyP95(): Promise<number> {
    try {
      const keys = await this.redis.keys('alert_latency:*');
      const allLatencies: number[] = [];
      
      for (const key of keys) {
        const measurements = await this.redis.zrange(key, -100, -1); // Last 100 measurements
        measurements.forEach(measurement => {
          try {
            const parsed = JSON.parse(measurement);
            allLatencies.push(parsed.latencyMs);
          } catch (e) {
            // Skip malformed measurements
          }
        });
      }
      
      if (allLatencies.length === 0) return 0;
      
      allLatencies.sort((a, b) => a - b);
      const p95Index = Math.ceil(allLatencies.length * 0.95) - 1;
      return allLatencies[p95Index] || 0;
      
    } catch (error) {
      console.error('Error calculating alert latency p95:', error);
      return 0;
    }
  }

  /**
   * Get maximum Kafka consumer lag
   */
  private async getMaxKafkaLag(): Promise<number> {
    try {
      const register = prometheus.register;
      const metrics = await register.metrics();
      const kafkaLagMatches = metrics.match(/intelgraph_kafka_consumer_lag (\d+)/g);
      
      if (!kafkaLagMatches) return 0;
      
      const lags = kafkaLagMatches.map(match => {
        const value = match.match(/(\d+)$/);
        return value ? parseInt(value[1], 10) : 0;
      });
      
      return Math.max(...lags, 0);
      
    } catch (error) {
      console.error('Error getting max Kafka lag:', error);
      return 0;
    }
  }

  /**
   * Get maximum WebSocket backlog
   */
  private async getMaxWebSocketBacklog(): Promise<number> {
    try {
      const register = prometheus.register;
      const metrics = await register.metrics();
      const backlogMatches = metrics.match(/intelgraph_websocket_backlog (\d+)/g);
      
      if (!backlogMatches) return 0;
      
      const backlogs = backlogMatches.map(match => {
        const value = match.match(/(\d+)$/);
        return value ? parseInt(value[1], 10) : 0;
      });
      
      return Math.max(...backlogs, 0);
      
    } catch (error) {
      console.error('Error getting max WebSocket backlog:', error);
      return 0;
    }
  }

  /**
   * Calculate DLQ message rate as percentage
   */
  private async calculateDLQRate(): Promise<number> {
    try {
      const register = prometheus.register;
      const metrics = await register.metrics();
      
      // Get DLQ message count
      const dlqMatches = metrics.match(/intelgraph_dlq_messages_total (\d+)/g);
      const dlqTotal = dlqMatches ? 
        dlqMatches.reduce((sum, match) => {
          const value = match.match(/(\d+)$/);
          return sum + (value ? parseInt(value[1], 10) : 0);
        }, 0) : 0;
      
      // Estimate total messages (would need to be tracked separately)
      // For now, assume 1% if any DLQ messages exist
      return dlqTotal > 0 ? 1.0 : 0.0;
      
    } catch (error) {
      console.error('Error calculating DLQ rate:', error);
      return 0;
    }
  }
}

export default StreamingSLOManager;