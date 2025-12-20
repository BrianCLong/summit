export type Watchlist = {
  id: string;
  name: string;
  type: string;
  threshold?: number;
  band?: string;
  expiresAt?: string;
  members: string[];
};

/**
 * Service for managing watchlists of entities.
 * Allows creating, updating, and querying watchlists.
 */
export class WatchlistService {
  private lists: Record<string, Watchlist> = {};

  /**
   * Creates a new watchlist.
   * @param data - The data for the new watchlist (excluding ID and members).
   * @returns The created watchlist.
   */
  create(data: Omit<Watchlist, 'id' | 'members'>): Watchlist {
    const id = Date.now().toString();
    this.lists[id] = { ...data, id, members: [] };
    return this.lists[id];
  }

  /**
   * Adds entities to a watchlist.
   * @param id - The ID of the watchlist.
   * @param entityIds - The IDs of the entities to add.
   */
  add(id: string, entityIds: string[]) {
    this.lists[id].members.push(...entityIds);
  }

  /**
   * Removes entities from a watchlist.
   * @param id - The ID of the watchlist.
   * @param entityIds - The IDs of the entities to remove.
   */
  remove(id: string, entityIds: string[]) {
    this.lists[id].members = this.lists[id].members.filter(
      (m) => !entityIds.includes(m),
    );
  }

  /**
   * Retrieves a watchlist by ID.
   * @param id - The ID of the watchlist.
   * @returns The watchlist, or undefined if not found.
   */
  get(id: string) {
    return this.lists[id];
  }

  /**
   * Retrieves all watchlists.
   * @returns An array of all watchlists.
   */
  all() {
    return Object.values(this.lists);
  }
}
