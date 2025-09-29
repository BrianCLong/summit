import { Connector, ConnectorContext, NormalizedObservation } from '../../ConnectorSDK';

export class VirusTotalConnector implements Connector {
  name = 'virustotal';
  version = '1.0.0';
  schedule: 'interval' = 'interval';
  intervalMs = 15_000;

  async *run(ctx: ConnectorContext): AsyncGenerator<NormalizedObservation> {
    ctx.log('virustotal.run');
    return;
  }
}
