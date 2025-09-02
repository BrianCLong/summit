const initialState = { currentRun: null, events: [] };

export function copilotReducer(state = initialState, action) {
  switch (action.type) {
    case 'copilot/runStarted':
      return { ...state, currentRun: action.payload, events: [] };
    case 'copilot/event':
      return { ...state, events: [action.payload].concat(state.events) };
    default:
      return state;
  }
}

export const copilotActions = {
  runStarted: (run) => ({ type: 'copilot/runStarted', payload: run }),
  eventReceived: (ev) => ({ type: 'copilot/event', payload: ev }),
};
