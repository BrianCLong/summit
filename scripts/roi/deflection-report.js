const fs = require('fs');
const path = require('path');
const parse = (s) =>
  s
    .split(/\r?\n/)
    .slice(1)
    .filter(Boolean)
    .map((l) => {
      const [id, created, subject, tag, resolved, doc_url] = l.split(',');
      return {
        id,
        created,
        subject,
        tag,
        resolved: resolved === 'true',
        doc_url,
      };
    });
const tickets = fs.existsSync('support/tickets.csv')
  ? parse(fs.readFileSync('support/tickets.csv', 'utf8'))
  : [];
const tta = (function () {
  try {
    return JSON.parse(fs.readFileSync('docs/ops/tta/summary.json', 'utf8'));
  } catch {
    return [];
  }
})();
const last = tta[tta.length - 1] || {};
const linked = tickets.filter((t) => t.doc_url);
const deflected = linked.filter(
  (t) => /\b(resolved|answer found)\b/i.test(t.subject) || t.resolved,
);
const roi = {
  period: new Date().toISOString().slice(0, 10),
  tickets: tickets.length,
  linked: linked.length,
  deflected: deflected.length,
  tta_p50: last.tta_p50 || null,
};
fs.mkdirSync('docs/ops/roi', { recursive: true });
fs.writeFileSync('docs/ops/roi/deflection.json', JSON.stringify(roi, null, 2));
console.log('ROI', roi);
