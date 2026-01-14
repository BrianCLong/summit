import {
  Session,
  InvokeArgs,
  ToolDescriptor,
  ResourceDescriptor,
  PromptDescriptor,
} from './types';
import { TransportClient, TransportSelection } from './transports/types';
import {
  resolveTransportClient,
  TransportRegistryOptions,
} from './transports/registry';

export class McpClient {
  private transportPromise: Promise<{
    client: TransportClient;
    selection: TransportSelection;
  }>;

  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
    private readonly options: TransportRegistryOptions = {},
  ) {
    this.transportPromise = resolveTransportClient(
      this.baseUrl,
      this.token,
      this.options,
    );
  }

  async connect(toolClass: string): Promise<Session> {
    const { client } = await this.transportPromise;
    return client.connect(toolClass);
  }

  async invoke(session: Session, input: InvokeArgs) {
    const { client } = await this.transportPromise;
    return client.invoke(session, input);
  }

  async release(session: Session) {
    const { client } = await this.transportPromise;
    return client.release(session);
  }

  async listTools(): Promise<ToolDescriptor[]> {
    const { client } = await this.transportPromise;
    return client.listTools();
  }

  async listResources(): Promise<ResourceDescriptor[]> {
    const { client } = await this.transportPromise;
    return client.listResources();
  }

  async listPrompts(): Promise<PromptDescriptor[]> {
    const { client } = await this.transportPromise;
    return client.listPrompts();
  }

  stream(session: Session) {
    const iterator = async function* (this: McpClient) {
      const { client } = await this.transportPromise;
      yield* client.stream(session);
    }.bind(this);
    return iterator();
  }

  async transportSelection(): Promise<TransportSelection> {
    const { selection } = await this.transportPromise;
    return selection;
  }
}
