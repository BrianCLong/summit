export function assertPersistedSubscription(name?: string) {
  if (!process.env.ALLOW_ADHOC_SUBSCRIPTIONS && !name) {
    throw new Error('subscription_must_be_persisted');
  }
}
