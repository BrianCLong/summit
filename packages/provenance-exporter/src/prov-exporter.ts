import { z } from "zod";

// --- PROV Types ---

export type ProvID = string;

export interface ProvEntity {
  [key: string]: any;
}

export interface ProvActivity {
  "prov:startTime"?: string;
  "prov:endTime"?: string;
  [key: string]: any;
}

export interface ProvAgent {
  [key: string]: any;
}

export interface WasGeneratedBy {
  "prov:entity": ProvID;
  "prov:activity": ProvID;
  "prov:time"?: string;
  [key: string]: any;
}

export interface Used {
  "prov:activity": ProvID;
  "prov:entity": ProvID;
  "prov:time"?: string;
  [key: string]: any;
}

export interface WasAssociatedWith {
  "prov:activity": ProvID;
  "prov:agent": ProvID;
  "prov:plan"?: ProvID;
  [key: string]: any;
}

export interface WasAttributedTo {
  "prov:entity": ProvID;
  "prov:agent": ProvID;
  [key: string]: any;
}

export interface WasDerivedFrom {
  "prov:generatedEntity": ProvID;
  "prov:usedEntity": ProvID;
  "prov:activity"?: ProvID;
  "prov:generation"?: ProvID;
  "prov:usage"?: ProvID;
  [key: string]: any;
}

export interface ProvDocument {
  prefix?: Record<string, string>;
  entity?: Record<ProvID, ProvEntity>;
  activity?: Record<ProvID, ProvActivity>;
  agent?: Record<ProvID, ProvAgent>;
  wasGeneratedBy?: Record<string, WasGeneratedBy>;
  used?: Record<string, Used>;
  wasAssociatedWith?: Record<string, WasAssociatedWith>;
  wasAttributedTo?: Record<string, WasAttributedTo>;
  wasDerivedFrom?: Record<string, WasDerivedFrom>;
}

// --- Exporter ---

export class ProvExporter {
  private doc: ProvDocument = {
    prefix: {
      prov: "http://www.w3.org/ns/prov#",
      summit: "https://intelgraph.com/provenance/",
    },
    entity: {},
    activity: {},
    agent: {},
    wasGeneratedBy: {},
    used: {},
    wasAssociatedWith: {},
    wasAttributedTo: {},
    wasDerivedFrom: {},
  };

  constructor(prefixes: Record<string, string> = {}) {
    this.doc.prefix = { ...this.doc.prefix, ...prefixes };
  }

  addEntity(id: ProvID, attributes: ProvEntity = {}) {
    if (!this.doc.entity) this.doc.entity = {};
    this.doc.entity[id] = attributes;
  }

  addActivity(id: ProvID, startTime?: Date, endTime?: Date, attributes: ProvActivity = {}) {
    if (!this.doc.activity) this.doc.activity = {};
    const activity: ProvActivity = { ...attributes };
    if (startTime) activity["prov:startTime"] = startTime.toISOString();
    if (endTime) activity["prov:endTime"] = endTime.toISOString();
    this.doc.activity[id] = activity;
  }

  addAgent(id: ProvID, attributes: ProvAgent = {}) {
    if (!this.doc.agent) this.doc.agent = {};
    this.doc.agent[id] = attributes;
  }

  addWasGeneratedBy(entityId: ProvID, activityId: ProvID, time?: Date, attributes: Omit<WasGeneratedBy, "prov:entity" | "prov:activity"> = {}) {
    if (!this.doc.wasGeneratedBy) this.doc.wasGeneratedBy = {};
    const id = `_:gen_${entityId.replace(/[^a-zA-Z0-9]/g, '_')}_${activityId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const record: WasGeneratedBy = {
      "prov:entity": entityId,
      "prov:activity": activityId,
      ...attributes
    };
    if (time) record["prov:time"] = time.toISOString();
    this.doc.wasGeneratedBy[id] = record;
  }

  addUsed(activityId: ProvID, entityId: ProvID, time?: Date, attributes: Omit<Used, "prov:activity" | "prov:entity"> = {}) {
    if (!this.doc.used) this.doc.used = {};
    const id = `_:used_${activityId.replace(/[^a-zA-Z0-9]/g, '_')}_${entityId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const record: Used = {
      "prov:activity": activityId,
      "prov:entity": entityId,
      ...attributes
    };
    if (time) record["prov:time"] = time.toISOString();
    this.doc.used[id] = record;
  }

  addWasAssociatedWith(activityId: ProvID, agentId: ProvID, planId?: ProvID, attributes: Omit<WasAssociatedWith, "prov:activity" | "prov:agent"> = {}) {
    if (!this.doc.wasAssociatedWith) this.doc.wasAssociatedWith = {};
    const id = `_:assoc_${activityId.replace(/[^a-zA-Z0-9]/g, '_')}_${agentId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const record: WasAssociatedWith = {
      "prov:activity": activityId,
      "prov:agent": agentId,
      ...attributes
    };
    if (planId) record["prov:plan"] = planId;
    this.doc.wasAssociatedWith[id] = record;
  }

  addWasAttributedTo(entityId: ProvID, agentId: ProvID, attributes: Omit<WasAttributedTo, "prov:entity" | "prov:agent"> = {}) {
    if (!this.doc.wasAttributedTo) this.doc.wasAttributedTo = {};
    const id = `_:attr_${entityId.replace(/[^a-zA-Z0-9]/g, '_')}_${agentId.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const record: WasAttributedTo = {
      "prov:entity": entityId,
      "prov:agent": agentId,
      ...attributes
    };
    this.doc.wasAttributedTo[id] = record;
  }

  addWasDerivedFrom(generatedEntityId: ProvID, usedEntityId: ProvID, attributes: Omit<WasDerivedFrom, "prov:generatedEntity" | "prov:usedEntity"> = {}) {
      if (!this.doc.wasDerivedFrom) this.doc.wasDerivedFrom = {};
      const id = `_:derived_${generatedEntityId.replace(/[^a-zA-Z0-9]/g, '_')}_${usedEntityId.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const record: WasDerivedFrom = {
          "prov:generatedEntity": generatedEntityId,
          "prov:usedEntity": usedEntityId,
          ...attributes
      };
      this.doc.wasDerivedFrom[id] = record;
  }

  getJson(): ProvDocument {
    return this.doc;
  }
}
