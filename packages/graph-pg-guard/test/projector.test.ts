import { ReservationProjector } from '../src/projectors/ReservationProjector';
import { ChangeEvent } from '../src/domain/ChangeEvent';

describe('ReservationProjector', () => {
  const projector = new ReservationProjector();

  it('projects to Reservation node', () => {
    const event: ChangeEvent = {
      table: 'capacity_reservations',
      op: 'INSERT',
      pk: { reservation_id: 'res-1' },
      after: {
        reservation_id: 'res-1',
        tenant_id: 'tenant-1',
        pool_id: 'pool-1',
        status: 'active'
      }
    };

    const node = projector.toNode(event);
    expect(node).toMatchObject({
      label: 'Reservation',
      id: 'res-1',
      props: {
        status: 'active'
      }
    });
  });

  it('projects relationships', () => {
    const event: ChangeEvent = {
      table: 'capacity_reservations',
      op: 'INSERT',
      pk: { reservation_id: 'res-1' },
      after: {
        reservation_id: 'res-1',
        tenant_id: 'tenant-1',
        pool_id: 'pool-1'
      }
    };

    const rels = projector.toRels(event);
    expect(rels).toHaveLength(2);
    expect(rels).toContainEqual(expect.objectContaining({ type: 'RESERVED_FOR', fromId: 'res-1', toId: 'tenant-1' }));
    expect(rels).toContainEqual(expect.objectContaining({ type: 'ALLOCATED_FROM', fromId: 'res-1', toId: 'pool-1' }));
  });
});
