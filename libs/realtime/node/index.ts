import { createClient } from "graphql-ws";
import WebSocket from "ws";

export class RealtimeClient {
  private client: any;

  constructor(url: string, token: string) {
    this.client = createClient({
      url,
      webSocketImpl: WebSocket,
      connectionParams: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  subscribe(
    query: string,
    variables: any,
    onNext: (data: any) => void,
    onError: (err: any) => void
  ) {
    return this.client.subscribe(
      { query, variables },
      {
        next: onNext,
        error: onError,
        complete: () => {},
      }
    );
  }
}
