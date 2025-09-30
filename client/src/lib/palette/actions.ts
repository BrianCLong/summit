import { openIntelPanel } from '../../lib/panels/intelPanel';

export const actions = [
  // ...existing
  {
    id: 'intel-search',
    label: 'Market Intel: search…',
    hint: '⌥I',
    run: () => openIntelPanel()
  }
];