export interface UIBlock {
  type: string;
  props: Record<string, unknown>;
}

export interface GenerativeInterface {
  id: string;
  blocks: UIBlock[];
}
