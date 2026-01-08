declare global {
  interface Window {
    __MAESTRO_CFG__?: {
      gatewayBase?: string;
      grafanaBase?: string;
      grafanaDashboards?: Record<string, string>;
      a11y?: "on" | "off";
    };
  }
}
export {};
