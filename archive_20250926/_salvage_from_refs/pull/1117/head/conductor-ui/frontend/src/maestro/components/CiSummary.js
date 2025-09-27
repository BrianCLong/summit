import { jsx as _jsx, jsxs as _jsxs } from 'react/jsx-runtime';
export default function CiSummary({ annotations }) {
  const by = (lvl) => annotations.filter((a) => a.level === lvl).length;
  const repos = new Set(annotations.map((a) => a.repo).filter(Boolean));
  return _jsxs('div', {
    className: 'grid grid-cols-1 gap-3 md:grid-cols-4',
    children: [
      _jsx(Card, { label: 'Failures', value: by('failure') }),
      _jsx(Card, { label: 'Warnings', value: by('warning') }),
      _jsx(Card, { label: 'Notices', value: by('notice') }),
      _jsx(Card, { label: 'Repos', value: repos.size }),
    ],
  });
}
function Card({ label, value }) {
  return _jsxs('div', {
    className: 'rounded-2xl border p-4',
    children: [
      _jsx('div', { className: 'text-sm text-gray-500', children: label }),
      _jsx('div', { className: 'text-2xl font-semibold', children: value }),
    ],
  });
}
