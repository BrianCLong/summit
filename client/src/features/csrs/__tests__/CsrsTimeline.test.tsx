import { render, screen, within } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import CsrsTimeline from '../components/CsrsTimeline';
import type { RetentionPlan } from '../types';

function loadPlanFixture(): RetentionPlan {
  const fixturePath = path.resolve(
    __dirname,
    '../../../../../python/tests/fixtures/csrs_golden_plan.json'
  );
  const content = fs.readFileSync(fixturePath, 'utf-8');
  return JSON.parse(content) as RetentionPlan;
}

const planFixture = loadPlanFixture();

describe('CsrsTimeline', () => {
  it('renders timeline rows with risk highlights', () => {
    render(<CsrsTimeline plan={planFixture} />);

    expect(screen.getByRole('heading', { name: /consent-scoped retention simulator/i })).toBeVisible();

    const timelineTable = screen.getByRole('table', { name: /per-purpose deletion horizons/i });
    const rows = within(timelineTable).getAllByRole('row');
    const fraudRow = rows.find((row) => {
      const utils = within(row);
      return utils.queryByText('accounts_core') && utils.queryByText('fraud_detection');
    });
    expect(fraudRow).not.toBeUndefined();
    expect(fraudRow).toHaveAttribute('data-risk', 'breach');
    expect(within(fraudRow as HTMLTableRowElement).getByText('2023-12-28')).toBeVisible();
  });

  it('lists downstream dependency impacts', () => {
    render(<CsrsTimeline plan={planFixture} />);

    const dependencyTable = screen.getByRole('table', { name: /downstream artifact impacts/i });
    expect(within(dependencyTable).getByText('fraud_features_v4')).toBeVisible();
    expect(within(dependencyTable).getByText(/eligible for deletion 33 days earlier/i)).toBeVisible();
  });
});
