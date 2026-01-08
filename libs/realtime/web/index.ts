import { createClient } from "graphql-ws";

export class WebRealtimeClient {
  private client: any;

  constructor(url: string, token: string) {
    this.client = createClient({
      url,
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
