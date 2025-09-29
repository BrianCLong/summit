import { createStore } from 'redux'

const initialState = {
  nodes: [],
  edges: [],
  aiOverlay: false,
  insightNodes: []
}

function reducer(state = initialState, action) {
  switch (action.type) {
    case 'INIT_GRAPH':
      return { ...state, nodes: action.payload.nodes, edges: action.payload.edges }
    case 'GRAPH_CHANGE':
      return { ...state, ...action.payload }
    case 'AI_TOGGLE':
      return { ...state, aiOverlay: action.payload }
    case 'INSIGHT_NODES':
      return { ...state, insightNodes: action.payload }
    default:
      return state
  }
}

export const store = createStore(reducer)
