import { ElementsDefinition } from 'cytoscape';

export interface EventItem {
  id: string;
  action: string;
  confidence: number;
  result: string;
}

export interface NodeElement {
  data: {
    id: string;
    label: string;
    type: string;
    deception_score: number;
  };
}

export interface EdgeElement {
  data: {
    source: string;
    target: string;
    label: string;
  };
}

export interface GraphData extends ElementsDefinition {
  nodes: NodeElement[];
  edges: EdgeElement[];
}
