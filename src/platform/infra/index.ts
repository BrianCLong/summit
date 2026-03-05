export interface InfraModule {
  name: string;
  version: string;
  owner: string;
}

export interface InfraStack {
  name: string;
  modules: InfraModule[];
  environment: string;
}
