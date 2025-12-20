import crypto from 'crypto';

/**
 * Verifies a Stripe webhook signature.
 * Checks if the payload signature matches the provided header using the secret.
 *
 * @param payload - The raw webhook payload.
 * @param header - The `stripe-signature` header value.
 * @param secret - The webhook signing secret.
 * @returns An object containing the timestamp and a validity flag.
 * @throws Error if the signature is invalid.
 */
export function verifyStripeSig(
  payload: string,
  header: string,
  secret: string,
) {
  const parts = header.split(',');
  const t = parts[0].split('=')[1];
  const v1 = parts[1].split('=')[1];
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${t}.${payload}`)
    .digest('hex');
  if (sig !== v1) throw new Error('stripe_sig_invalid');
  return { ts: Number(t), ok: true };
}

/**
 * Handles a Stripe webhook event.
 * Processes payment success and refund events to update orders, entitlements, and transparency logs.
 *
 * @param evt - The parsed Stripe event object.
 * @param deps - Dependencies for order, entitlement, and transparency management.
 * @param deps.orders - Service for managing orders.
 * @param deps.entitlements - Service for managing entitlements.
 * @param deps.transparency - Service for appending transparency logs.
 * @param deps.idempotency - Optional set for idempotency checks.
 * @returns A result object indicating if the event was handled or skipped.
 */
export async function handleWebhook(
  evt: any,
  deps: {
    orders: any;
    entitlements: any;
    transparency: any;
    idempotency?: Set<string>;
  },
) {
  const id = evt.id;
  if (deps.idempotency) {
    if (deps.idempotency.has(id)) return { idempotent: true };
    deps.idempotency.add(id);
  }

  if (evt.type === 'payment_intent.succeeded') {
    const orderId = evt.data.object.metadata.orderId;
    await deps.orders.markPaid(orderId);
    const ent = await deps.entitlements.issueFromOrder(orderId);
    await deps.transparency.appendIssue(ent.id);
  } else if (evt.type === 'charge.refunded') {
    const orderId = evt.data.object.metadata.orderId;
    const entId = await deps.orders.findEntitlement(orderId);
    await deps.entitlements.revoke(entId);
    await deps.transparency.appendRevoke(entId);
  }
  return { handled: true };
}
