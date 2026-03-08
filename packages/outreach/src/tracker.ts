import Redis from 'ioredis';
import neo4j, { Driver } from 'neo4j-driver';

/**
 * OutreachTracker handles logging of campaign signals like opens, clicks, etc.
 * It integrates with Redis for fast counters and Neo4j for graph-based relationship tracking.
 */
export class OutreachTracker {
  private redis: Redis;
  private driver: Driver;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.driver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || process.env.NEO4J_USERNAME || 'neo4j',
        process.env.NEO4J_PASSWORD || 'devpassword'
      )
    );
  }

  /**
   * Logs an email open event.
   * Increments the open counter in Redis and creates a relationship in Neo4j.
   */
  async logOpen(campaignId: string, email: string): Promise<void> {
    const campaignKey = `outreach:campaign:${campaignId}`;

    // Increment Redis counter
    await this.redis.hincrby(campaignKey, 'opens', 1);
    await this.redis.hincrby(campaignKey, 'total_events', 1);

    // Record graph signal in Neo4j
    const session = this.driver.session();
    try {
      await session.run(
        `
        MERGE (c:Campaign {id: $campaignId})
        MERGE (p:Person {email: $email})
        MERGE (p)-[r:OPENED]->(c)
        ON CREATE SET r.timestamp = datetime(), r.count = 1
        ON MATCH SET r.timestamp = datetime(), r.count = r.count + 1
        `,
        { campaignId, email }
      );
    } catch (error) {
      console.error('Failed to log open signal in Neo4j:', error);
    } finally {
      await session.close();
    }
  }

  /**
   * Generates a Grafana-compatible JSON dashboard definition for a tenant.
   */
  async dashboard(tenant: string): Promise<any> {
    return {
      title: `Outreach Dashboard - ${tenant}`,
      uid: `outreach-${tenant}`,
      panels: [
        {
          id: 1,
          title: "Email Open Rate",
          type: "gauge",
          datasource: "Prometheus",
          targets: [
            { expr: `sum(outreach_opens_total{tenant="${tenant}"}) / sum(outreach_sends_total{tenant="${tenant}"})` }
          ],
          fieldConfig: {
            defaults: {
              min: 0,
              max: 1,
              thresholds: {
                steps: [
                  { color: "red", value: 0 },
                  { color: "yellow", value: 0.25 },
                  { color: "green", value: 0.3 }
                ]
              }
            }
          }
        },
        {
          id: 2,
          title: "Campaign Conversion Funnel",
          type: "bar",
          datasource: "Redis",
          targets: [
            { key: `outreach:campaign:*` }
          ]
        }
      ]
    };
  }

  async close(): Promise<void> {
    await this.redis.quit();
    await this.driver.close();
  }
}
