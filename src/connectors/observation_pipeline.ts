export interface Observation {
  modality: "text" | "image" | "video" | "audio" | "graph";
  payload: unknown;
}
