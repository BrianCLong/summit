export interface BrowserRestrictions {
  defaultDeny: true;
  allowDomains: string[];
}

export interface BrowserBridge {
  setRestrictions(r: BrowserRestrictions): Promise<void>;
  navigate(url: string): Promise<void>;
  snapshot(): Promise<{ pngBase64: string }>;
}
