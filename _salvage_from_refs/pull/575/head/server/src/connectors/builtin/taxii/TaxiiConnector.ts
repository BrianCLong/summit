import { Connector, ConnectorContext, NormalizedObservation } from '../../ConnectorSDK';

export class TaxiiConnector implements Connector {
  name = 'taxii';
  version = '1.0.0';
  schedule: 'interval' = 'interval';
  intervalMs = 60_000;

  async *run(ctx: ConnectorContext): AsyncGenerator<NormalizedObservation> {
    ctx.log('taxii.run');
    // fixture-driven implementation placeholder
    return;
  }
}
