// packages/sdk-ts/src/client.ts

export interface IntelGraphConfig {
  url: string;
  token: string;
  onError?: (err: Error) => void;
}

export class IntelGraphClient {
  private url: string;
  private token: string;
  private onError: (err: Error) => void;

  constructor(config: IntelGraphConfig) {
    this.url = config.url;
    this.token = config.token;
    this.onError =
      config.onError ||
      ((err) => {
        throw err;
      });
  }

  async gql<T>(query: string, variables?: Record<string, any>): Promise<T> {
    try {
      const response = await fetch(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (response.status === 429) {
        throw new Error("RATE_LIMITED");
      }

      const json = await response.json();
      if (json.errors) {
        throw new Error(json.errors[0].message);
      }
      return json.data as T;
    } catch (err: any) {
      this.onError(err);
      throw err;
    }
  }

  searchEntities(q: string) {
    return this.gql<{ search: { id: string; name: string; type: string }[] }>(
      `query($q:String!){ search(q:$q){ id name type } }`,
      { q }
    );
  }
}
