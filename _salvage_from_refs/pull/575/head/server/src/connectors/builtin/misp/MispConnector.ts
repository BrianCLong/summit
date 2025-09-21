import { Connector, ConnectorContext, NormalizedObservation } from '../../ConnectorSDK';

export class MispConnector implements Connector {
  name = 'misp';
  version = '1.0.0';
  schedule: 'interval' = 'interval';
  intervalMs = 300_000;

  async *run(ctx: ConnectorContext): AsyncGenerator<NormalizedObservation> {
    ctx.log('misp.run');
    return;
  }
}
