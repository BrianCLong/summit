import React from 'react';
import { render, screen } from '@testing-library/react';
import * as api from '../../api';
import CICD from '../../pages/CICD';

test('renders CI trend chart area', async () => {
  jest.spyOn(api, 'api').mockReturnValue({
    getCIAnnotationsGlobal: async ()=>({ annotations: [] }),
    getCITrends: async ()=>({ buckets:[{ ts: Date.now(), failure:1, warning:2, notice:3 }] })
  } as any);
  render(<CICD />);
  expect(await screen.findByText(/CI annotations trend/)).toBeInTheDocument();
});

