import { create } from 'zustand';

interface PluginStoreState {
  installedPlugins: Map<string, InstalledPluginState>;
  selectedPlugin: string | null;
  searchQuery: string;
  categoryFilter: string | null;
  sortBy: 'name' | 'date' | 'usage';

  // Actions
  setSelectedPlugin: (pluginId: string | null) => void;
  setSearchQuery: (query: string) => void;
  setCategoryFilter: (category: string | null) => void;
  setSortBy: (sort: 'name' | 'date' | 'usage') => void;
  updatePluginState: (pluginId: string, state: Partial<InstalledPluginState>) => void;
  addPlugin: (plugin: InstalledPluginState) => void;
  removePlugin: (pluginId: string) => void;
}

interface InstalledPluginState {
  id: string;
  name: string;
  version: string;
  state: 'active' | 'paused' | 'error' | 'loading';
  config: Record<string, any>;
}

export const usePluginStore = create<PluginStoreState>((set) => ({
  installedPlugins: new Map(),
  selectedPlugin: null,
  searchQuery: '',
  categoryFilter: null,
  sortBy: 'name',

  setSelectedPlugin: (pluginId) =>
    set({ selectedPlugin: pluginId }),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  setCategoryFilter: (category) =>
    set({ categoryFilter: category }),

  setSortBy: (sort) =>
    set({ sortBy: sort }),

  updatePluginState: (pluginId, state) =>
    set((prev) => {
      const plugins = new Map(prev.installedPlugins);
      const existing = plugins.get(pluginId);
      if (existing) {
        plugins.set(pluginId, { ...existing, ...state });
      }
      return { installedPlugins: plugins };
    }),

  addPlugin: (plugin) =>
    set((prev) => {
      const plugins = new Map(prev.installedPlugins);
      plugins.set(plugin.id, plugin);
      return { installedPlugins: plugins };
    }),

  removePlugin: (pluginId) =>
    set((prev) => {
      const plugins = new Map(prev.installedPlugins);
      plugins.delete(pluginId);
      return { installedPlugins: plugins };
    }),
}));
