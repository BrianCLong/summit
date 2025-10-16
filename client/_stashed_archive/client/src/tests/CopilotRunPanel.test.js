// import React from 'react';
// import { render, screen, fireEvent } from '@testing-library/react';
// import { MockedProvider } from '@apollo/client/testing';
// import CopilotRunPanel from '@/components/ai/CopilotRunPanel.jsx';
// import { START_RUN } from '../../graphql/copilot.gql';
// import { Provider } from 'react-redux';
// import { createStore, combineReducers } from 'redux';
// import { copilotReducer } from '../../store/copilotSlice';

// const store = createStore(combineReducers({ copilot: copilotReducer }));

// const mocks = [{
//   request: { query: START_RUN, variables: { goalId: 'g1' } },
//   result: {
//     data: { startCopilotRun: { id: 'r1', status: 'PENDING', createdAt: new Date().toISOString(),
//       plan: { id: 'p1', createdAt: new Date().toISOString(), steps: [{ id:'t1', kind:'NEO4J_QUERY', status:'PENDING' }] } } }
//   }
// }];

// test('starts a run and renders plan', async () => {
//   render(
//     <Provider store={store}>
//       <MockedProvider mocks={mocks} addTypename={false}>
//         <CopilotRunPanel goalId="g1" />
//       </MockedProvider>
//     </Provider>
//   );

//   fireEvent.click(screen.getByRole('button', { name: /run copilot/i }));
//   expect(await screen.findByText(/NEO4J_QUERY/)).toBeInTheDocument();
// });
