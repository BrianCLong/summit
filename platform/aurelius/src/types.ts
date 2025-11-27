export interface IPConcept {
  id: string;
  keyword: string;
  category: string;
}

export interface Idea {
  id: string;
  title: string;
  abstract: string;
  concepts: IPConcept[];
  noveltyScore: number;
  claims: string[];
}

export interface PriorArtReference {
  id: string;
  title: string;
  text: string;
}
