import { CtxBandit } from '../../src/bandit_contextual';

test('chooses one of the provided domains', () => {
  const b = new CtxBandit(['a.example', 'b.example']);
  const pick = b.choose({
    purpose: 'qna',
    hour: 12,
    domainClass: 'docs',
    recent: 'ok',
  });
  expect(['a.example', 'b.example']).toContain(pick);
  b.update(pick, true);
});
