"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WatchlistService = void 0;
class WatchlistService {
    lists = {};
    create(data) {
        const id = Date.now().toString();
        this.lists[id] = { ...data, id, members: [] };
        return this.lists[id];
    }
    add(id, entityIds) {
        this.lists[id].members.push(...entityIds);
    }
    remove(id, entityIds) {
        this.lists[id].members = this.lists[id].members.filter((m) => !entityIds.includes(m));
    }
    get(id) {
        return this.lists[id];
    }
    all() {
        return Object.values(this.lists);
    }
}
exports.WatchlistService = WatchlistService;
