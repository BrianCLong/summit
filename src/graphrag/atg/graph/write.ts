import { Driver } from 'neo4j-driver';
import { TECFEvent } from '../tecf/schema.js';
export class ATGGraphWriter {
  constructor(private driver: Driver) {}
  async writeEvent(event: TECFEvent) {
    const session = this.driver.session();
    try {
      await session.executeWrite(tx => tx.run(`
        MERGE (actor:ATGIdentity { tenant_id: $tenant_id, id: $actor_id })
        SET actor.type = $actor_type
        MERGE (asset:ATGAsset { tenant_id: $tenant_id, id: $asset_id })
        SET asset.type = $asset_type
        MERGE (actor)-[r:PERFORMED { tenant_id: $tenant_id, event_id: $event_id }]->(asset)
        SET r.action = $action, r.channel = $channel, r.event_time = datetime($event_time), r.confidence = $confidence
      `, { tenant_id: event.tenant_id, actor_id: event.actor.id, actor_type: event.actor.type, asset_id: event.asset.id, asset_type: event.asset.type, event_id: event.event_id, action: event.action, channel: event.channel, event_time: event.event_time, confidence: event.confidence }));
    } finally { await session.close(); }
  }
}
