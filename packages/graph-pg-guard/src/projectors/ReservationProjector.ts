import type { Projector } from '../domain/Projector';
import type { ChangeEvent } from '../domain/ChangeEvent';

export class ReservationProjector implements Projector {
  toNode(event: ChangeEvent) {
    if (event.table !== 'capacity_reservations') return null;

    // Assuming 'after' holds the row data for INSERT/UPDATE
    const data = event.after || event.before || {};
    const id = String(data.reservation_id || event.pk.reservation_id);

    return {
      label: 'Reservation',
      id,
      props: {
        ...data,
        // Make sure date objects are converted to strings or supported types if needed
        start_at: data.start_at ? String(data.start_at) : undefined,
        end_at: data.end_at ? String(data.end_at) : undefined,
        created_at: data.created_at ? String(data.created_at) : undefined,
        updated_at: data.updated_at ? String(data.updated_at) : undefined,
      } as Record<string, unknown>
    };
  }

  toRels(event: ChangeEvent) {
    if (event.table !== 'capacity_reservations') return [];

    const data = event.after || event.before || {};
    const id = String(data.reservation_id || event.pk.reservation_id);
    const rels = [];

    if (data.tenant_id) {
      rels.push({
        type: 'RESERVED_FOR',
        fromId: id,
        toId: String(data.tenant_id),
        props: {}
      });
    }

    if (data.pool_id) {
      rels.push({
        type: 'ALLOCATED_FROM',
        fromId: id,
        toId: String(data.pool_id),
        props: {}
      });
    }

    return rels;
  }
}
