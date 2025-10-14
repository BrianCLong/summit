// import React from 'react';
// import { describe, it, expect } from 'vitest';
// import { Provider } from 'react-redux';
// import { MemoryRouter } from 'react-router-dom';
// import { render } from '@testing-library/react';
// import EnhancedGraphExplorer from '../components/graph/EnhancedGraphExplorer';
// import { configureStore } from '@reduxjs/toolkit';
// import graphReducer from '../store/slices/graphSlice';
// import uiReducer from '../store/slices/uiSlice';

// function getStore() {
//   return configureStore({ reducer: { graph: graphReducer, ui: uiReducer, auth: (s={})=>s } });
// }

// describe('EnhancedGraphExplorer', () => {
//   it('renders without crashing', () => {
//     const store = getStore();
//     const { getByText } = render(
//       <Provider store={store}>
//         <MemoryRouter initialEntries={["/graph/1"]}>
//           <EnhancedGraphExplorer />
//         </MemoryRouter>
//       </Provider>
//     );
//     expect(getByText(/Enhanced Graph Explorer/i)).toBeTruthy();
//   });
// });