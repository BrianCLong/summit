export function writeOrder(db, order, flags) {
  return db.tx(async (t) => {
    await t.insert('orders', order);
    if (flags.dual_write_orders) {
      await t.none('UPDATE orders SET new_total_cents = $1 WHERE id=$2', [
        order.total_cents,
        order.id,
      ]);
    }
  });
}
