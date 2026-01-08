/**
 * Plugin Management Hooks
 *
 * React hooks for plugin management operations.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration)
 *
 * @module hooks/usePlugins
 */

import { useState, useEffect, useCallback } from "react";
import { PluginAPI } from "../services/plugin-api";

/**
 * Hook for listing plugins with filtering and pagination
 */
export function usePlugins(initialFilters = {}) {
  const [plugins, setPlugins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchPlugins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await PluginAPI.listPlugins({
        ...filters,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });

      setPlugins(response.data || []);
      if (response.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.pagination.total,
          totalPages: response.pagination.totalPages,
        }));
      }
    } catch (err) {
      setError(err.message);
      setPlugins([]);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.pageSize]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const updateFilters = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

  const changePage = useCallback((newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  }, []);

  return {
    plugins,
    loading,
    error,
    filters,
    pagination,
    updateFilters,
    changePage,
    refresh: fetchPlugins,
  };
}

/**
 * Hook for getting a single plugin's details
 */
export function usePluginDetail(pluginId) {
  const [plugin, setPlugin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlugin = useCallback(async () => {
    if (!pluginId) {
      setPlugin(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await PluginAPI.getPlugin(pluginId);
      setPlugin(response.data);
    } catch (err) {
      setError(err.message);
      setPlugin(null);
    } finally {
      setLoading(false);
    }
  }, [pluginId]);

  useEffect(() => {
    fetchPlugin();
  }, [fetchPlugin]);

  return { plugin, loading, error, refresh: fetchPlugin };
}

/**
 * Hook for plugin operations (enable, disable, execute)
 */
export function usePluginOperations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const enablePlugin = useCallback(async (pluginId, config = {}) => {
    try {
      setLoading(true);
      setError(null);
      const result = await PluginAPI.enablePlugin(pluginId, config);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const disablePlugin = useCallback(async (pluginId) => {
    try {
      setLoading(true);
      setError(null);
      const result = await PluginAPI.disablePlugin(pluginId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeAction = useCallback(async (pluginId, action, params = {}, simulation = false) => {
    try {
      setLoading(true);
      setError(null);
      const result = await PluginAPI.executeAction(pluginId, action, params, simulation);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uninstallPlugin = useCallback(async (pluginId) => {
    try {
      setLoading(true);
      setError(null);
      const result = await PluginAPI.uninstallPlugin(pluginId);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    enablePlugin,
    disablePlugin,
    executeAction,
    uninstallPlugin,
  };
}

/**
 * Hook for plugin configuration management
 */
export function usePluginConfig(pluginId) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!pluginId) {
      setConfig(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await PluginAPI.getConfig(pluginId);
      setConfig(response.data);
    } catch (err) {
      setError(err.message);
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, [pluginId]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const saveConfig = useCallback(
    async (newConfig, enabled = true) => {
      if (!pluginId) return;

      try {
        setSaving(true);
        setError(null);

        const response = await PluginAPI.updateConfig(pluginId, newConfig, enabled);
        setConfig(response.data);
        return response;
      } catch (err) {
        setError(err.message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [pluginId]
  );

  return {
    config,
    loading,
    error,
    saving,
    saveConfig,
    refresh: fetchConfig,
  };
}

/**
 * Hook for plugin health monitoring
 */
export function usePluginHealth(pluginId) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHealth = useCallback(async () => {
    if (!pluginId) {
      setHealth(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await PluginAPI.getHealth(pluginId);
      setHealth(response.data);
    } catch (err) {
      setError(err.message);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [pluginId]);

  useEffect(() => {
    fetchHealth();
    // Auto-refresh health every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return { health, loading, error, refresh: fetchHealth };
}
