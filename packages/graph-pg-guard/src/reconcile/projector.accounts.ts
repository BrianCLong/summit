import { ChangeEvent } from '../domain/ChangeEvent.js';
import { Projector } from '../domain/Projector.js';

export const AccountsProjector: Projector = {
  toNode(ev) {
    if (ev.table !== 'accounts' || !ev.after) return null;

    return {
      label: 'Account',
      id: String(ev.pk.id),
      props: {
        name: ev.after.name,
        status: ev.after.status,
        parent_id: ev.after.parent_id
      }
    };
  },

  toRels(ev) {
    if (ev.table !== 'accounts' || !ev.after?.parent_id) return [];

    return [
      {
        type: 'PARENT_OF',
        fromId: String(ev.after.parent_id),
        fromLabel: 'Account',
        toId: String(ev.pk.id),
        toLabel: 'Account'
      }
    ];
  }
};
