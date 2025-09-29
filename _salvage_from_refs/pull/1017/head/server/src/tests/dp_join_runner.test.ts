import { Accountant } from '../privacy/dp/Accountant'
import { runDpJoinAggregate } from '../federation/cleanroom/DpJoinRunner'

test('enforces kMin', async () => {
  const accountant = new Accountant()
  await expect(
    runDpJoinAggregate({
      tokenRef: 't',
      meta: { epsilon: 1, delta: 0.1, kMin: 20, clip: 1 },
      cohortMin: 25,
      accountant,
      template: 'count'
    })
  ).rejects.toThrow('k_min_too_low')
})

test('charges accountant', async () => {
  const accountant = new Accountant()
  await runDpJoinAggregate({
    tokenRef: 't',
    meta: { epsilon: 1, delta: 0.1, kMin: 25, clip: 1 },
    cohortMin: 25,
    accountant,
    template: 'count'
  })
  expect(accountant.get('dp:t')).toBe(1)
})
