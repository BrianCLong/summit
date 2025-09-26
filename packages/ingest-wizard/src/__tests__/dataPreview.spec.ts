/// <reference types="@playwright/test" />

import { expect, test } from '@playwright/test';
import {
  formatPreviewValue,
  inferPreviewColumns,
  normalizePreviewRows,
  DataPreviewRow
} from '../DataPreviewTable';

test.describe('Data preview helpers', () => {
  test('normalizePreviewRows converts CSV arrays into row objects', () => {
    const rows = normalizePreviewRows(
      [
        ['1', 'Alice', 'true'],
        ['2', 'Bob', 'false']
      ],
      ['id', 'name', 'active']
    );

    const expected: DataPreviewRow[] = [
      { id: '1', name: 'Alice', active: 'true' },
      { id: '2', name: 'Bob', active: 'false' }
    ];

    expect(rows).toEqual(expected);
  });

  test('inferPreviewColumns derives columns from JSON rows', () => {
    const rows = normalizePreviewRows([
      { id: 1, metadata: { source: 's3', region: 'us-east-1' } },
      { id: 2, metadata: { source: 'gcs', region: 'us-central1' }, owner: 'ops' }
    ]);

    expect(inferPreviewColumns(rows)).toEqual(['id', 'metadata', 'owner']);
  });

  test('formatPreviewValue stringifies special values consistently', () => {
    expect(formatPreviewValue(true)).toBe('true');
    expect(formatPreviewValue(false)).toBe('false');
    expect(formatPreviewValue(null)).toBe('—');
    expect(formatPreviewValue(undefined)).toBe('—');
    expect(formatPreviewValue(42)).toBe('42');
  });
});
