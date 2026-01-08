import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ElementDefinition } from "cytoscape";

export interface GraphDataState {
  nodes: ElementDefinition[];
  edges: ElementDefinition[];
}

const initialState: GraphDataState = {
  nodes: [],
  edges: [],
};

const graphSlice = createSlice({
  name: "graphData",
  initialState,
  reducers: {
    addNode(state, action: PayloadAction<ElementDefinition>) {
      state.nodes.push(action.payload);
    },
    addEdge(state, action: PayloadAction<ElementDefinition>) {
      state.edges.push(action.payload);
    },
    reset(state) {
      state.nodes = [];
      state.edges = [];
    },
  },
});

export const { addNode, addEdge, reset } = graphSlice.actions;
export default graphSlice.reducer;
