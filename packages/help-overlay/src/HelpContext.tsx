/**
 * Help Context
 * React context for managing help overlay state
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  ReactNode,
} from 'react';
import type {
  HelpContextValue,
  HelpProviderConfig,
  HelpArticle,
  ContextualHelpResponse,
} from './types.js';

const HelpContext = createContext<HelpContextValue | null>(null);

export interface HelpProviderProps {
  children: ReactNode;
  config: HelpProviderConfig;
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>();

export function HelpProvider({ children, config }: HelpProviderProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<HelpArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const cacheTimeout = config.cacheTimeout || 5 * 60 * 1000; // 5 minutes default

  const getCached = useCallback(<T,>(key: string): T | null => {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data as T;
    }
    cache.delete(key);
    return null;
  }, [cacheTimeout]);

  const setCache = useCallback((key: string, data: unknown): void => {
    cache.set(key, { data, timestamp: Date.now() });
  }, []);

  const openHelp = useCallback(() => setIsOpen(true), []);
  const closeHelp = useCallback(() => {
    setIsOpen(false);
    setCurrentArticle(null);
  }, []);
  const toggleHelp = useCallback(() => setIsOpen((prev) => !prev), []);

  const search = useCallback(async (query: string): Promise<void> => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    const cacheKey = `search:${query}`;
    const cached = getCached<HelpArticle[]>(cacheKey);
    if (cached) {
      setSearchResults(cached);
      return;
    }

    setIsSearching(true);
    try {
      const params = new URLSearchParams({
        q: query,
        limit: '10',
      });
      if (config.defaultRole) {
        params.set('role', config.defaultRole);
      }

      const response = await fetch(`${config.baseUrl}/search?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(config.defaultRole && { 'x-user-role': config.defaultRole }),
        },
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setSearchResults(data.articles || []);
      setCache(cacheKey, data.articles || []);
    } catch (error) {
      console.error('Help search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [config.baseUrl, config.defaultRole, getCached, setCache]);

  const fetchContextualHelp = useCallback(
    async (route: string, anchorKey?: string): Promise<ContextualHelpResponse | null> => {
      const cacheKey = `context:${route}:${anchorKey || ''}`;
      const cached = getCached<ContextualHelpResponse>(cacheKey);
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(`${config.baseUrl}/context`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.defaultRole && { 'x-user-role': config.defaultRole }),
          },
          body: JSON.stringify({
            uiRoute: route,
            anchorKey,
            userRole: config.defaultRole,
            limit: 5,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch contextual help');
        }

        const data = await response.json();
        setCache(cacheKey, data);
        return data;
      } catch (error) {
        console.error('Contextual help error:', error);
        return null;
      }
    },
    [config.baseUrl, config.defaultRole, getCached, setCache]
  );

  // Keyboard shortcut to toggle help (? key)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      // Check for ? key (Shift + /)
      if (
        event.key === '?' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey
      ) {
        // Don't trigger if user is typing in an input
        const target = event.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }
        event.preventDefault();
        toggleHelp();
      }

      // Escape to close
      if (event.key === 'Escape' && isOpen) {
        closeHelp();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleHelp, closeHelp]);

  const value = useMemo<HelpContextValue>(
    () => ({
      isOpen,
      openHelp,
      closeHelp,
      toggleHelp,
      currentArticle,
      setCurrentArticle,
      searchQuery,
      setSearchQuery,
      searchResults,
      isSearching,
      search,
      fetchContextualHelp,
      config,
    }),
    [
      isOpen,
      openHelp,
      closeHelp,
      toggleHelp,
      currentArticle,
      searchQuery,
      searchResults,
      isSearching,
      search,
      fetchContextualHelp,
      config,
    ]
  );

  return <HelpContext.Provider value={value}>{children}</HelpContext.Provider>;
}

export function useHelp(): HelpContextValue {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
}

export { HelpContext };
