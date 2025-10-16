export type RelayMsg = {
  id: string;
  kind: 'exec.step' | 'exec.result' | 'ping';
  siteId: string;
  payload: any;
  createdAt: string;
  sig: string;
};
