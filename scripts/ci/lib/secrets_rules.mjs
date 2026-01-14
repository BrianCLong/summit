import crypto from 'crypto';

export const SEVERITY_RANK = Object.freeze({
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
});

export function compileRules(rules) {
  return rules.map((rule) => ({
    ...rule,
    regex: new RegExp(rule.pattern, 'g'),
  }));
}

export function hashMatch(matchText) {
  return crypto.createHash('sha256').update(matchText).digest('hex');
}

export function redactMatch(ruleId, matchText) {
  if (ruleId === 'private_key_block') {
    return '<redacted>';
  }

  if (!matchText) {
    return '<redacted>';
  }

  if (matchText.length <= 8) {
    return '<redacted>';
  }

  return `${matchText.slice(0, 4)}…${matchText.slice(-4)}`;
}

export function extractMatches(rule, line) {
  const matches = [];
  rule.regex.lastIndex = 0;
  let match = rule.regex.exec(line);

  while (match) {
    const matchText = match[1] ?? match[0];
    matches.push({
      matchText,
      index: match.index,
    });

    if (match[0].length === 0) {
      rule.regex.lastIndex += 1;
    }

    match = rule.regex.exec(line);
  }

  return matches;
}
