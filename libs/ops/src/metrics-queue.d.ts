import prom from "prom-client";
export declare const queueDepth: prom.Gauge<string>;
export declare const queueProcessed: prom.Counter<"status" | "type">;
export declare const queueProcessingDuration: prom.Histogram<"type">;
export declare const cacheHits: prom.Counter<string>;
export declare const cacheMiss: prom.Counter<string>;
