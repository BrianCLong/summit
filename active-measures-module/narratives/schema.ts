export type Narrative = {
  id: string; // NAR:<slug>
  canonicalLabel: string;
  keyPhrases: string[];
  firstSeenAt: string | null;
  languages: string[];
  intendedAudiences: string[];
  evidenceIds: string[];
};

export type Actor = {
  id: string;
  name: string;
  alignment: string;
  languages: string[];
  actorType: string;
  audienceReachScore?: number;
};

export type Claim = {
  id: string;
  text: string;
  stance: string;
  emotionalTone: string;
  narrativeIds?: string[];
  evidenceIds: string[];
};

export type Channel = {
  id: string;
  platform: string;
  handle: string;
  language: string;
  geoFocus: string;
};

export type MediaObject = {
  id: string;
  sha256: string;
  perceptualHash: string;
  firstSeenAt: string | null;
  suspectedOrigin: string | null;
  reuseAsNew: boolean;
  externalDetectorRefs: string[];
  riskBasis?: string[];
};

export type ConnectivityState = {
  region: string;
  platform: string;
  state: "normal" | "throttled" | "shutdown";
  startedAt: string | null;
  endedAt: string | null;
  evidenceIds: string[];
};
