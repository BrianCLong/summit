export interface MemoryEntry {
  id: string;
  content: string;
  embedding?: number[];
  metadata: Record<string, any>;
  created_at?: string; // Should be omitted for stamp.json
}

export interface SemanticRule extends MemoryEntry {
  rule_type: 'principle' | 'guideline' | 'rubric';
}

export interface EpisodicExample extends MemoryEntry {
  input: string;
  output: string;
  label: string | number;
  rationale: string;
}

export interface MemoryQuery {
  query: string;
  limit?: number;
  threshold?: number;
  tags?: string[];
}

export interface MemoryStore<T extends MemoryEntry> {
  add(entry: T): Promise<void>;
  retrieve(query: MemoryQuery): Promise<T[]>;
  delete(id: string): Promise<void>;
  list(): Promise<T[]>;
  clear(): Promise<void>;
}
