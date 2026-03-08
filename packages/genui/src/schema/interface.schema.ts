export interface UIBlock {
  type: string;
  props: Record<string, unknown>;
}

export interface GenerativeInterface {
  id: string;
  version: number;
  blocks: UIBlock[];
}
