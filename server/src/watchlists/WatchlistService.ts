export type Watchlist = {
  id: string;
  name: string;
  type: string;
  threshold?: number;
  band?: string;
  expiresAt?: string;
  members: string[];
};

export class WatchlistService {
  private lists: Record<string, Watchlist> = {};

  create(data: Omit<Watchlist, 'id' | 'members'>): Watchlist {
    const id = Date.now().toString();
    this.lists[id] = { ...data, id, members: [] };
    return this.lists[id];
  }

  add(id: string, entityIds: string[]) {
    this.lists[id].members.push(...entityIds);
  }

  remove(id: string, entityIds: string[]) {
    this.lists[id].members = this.lists[id].members.filter(
      (m) => !entityIds.includes(m),
    );
  }

  get(id: string) {
    return this.lists[id];
  }

  all() {
    return Object.values(this.lists);
  }
}
