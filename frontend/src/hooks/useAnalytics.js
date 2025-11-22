import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ADVANCED_FILTERS_STORAGE_KEY,
  clearPersistedFilters,
  fetchAnalytics,
  persistAdvancedFilters,
  readPersistedFilters
} from '../services/api';

const serializeFilters = (filters) => JSON.stringify(filters ?? {});

export function usePersistedExplorerFilters() {
  const [filters, setFilters] = useState(() => readPersistedFilters());

  const refresh = useCallback(() => {
    setFilters(readPersistedFilters());
  }, []);

  const updateFilters = useCallback((patch = {}) => {
    if (typeof patch !== 'object' || patch === null) return;
    setFilters((prev) => {
      const next = { ...(prev || {}) };
      Object.entries(patch).forEach(([key, value]) => {
        if (value === undefined) {
          delete next[key];
        } else {
          next[key] = value;
        }
      });
      const hasEntries = Object.keys(next).length > 0;
      if (!hasEntries) {
        clearPersistedFilters();
        return null;
      }
      persistAdvancedFilters(next);
      return next;
    });
  }, []);

  const removeFilter = useCallback((key) => {
    if (!key) return;
    setFilters((prev) => {
      if (!prev || !(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      if (!Object.keys(next).length) {
        clearPersistedFilters();
        return null;
      }
      persistAdvancedFilters(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    clearPersistedFilters();
    setFilters(null);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleStorage = (event) => {
      if (event.storageArea !== sessionStorage) return;
      if (event.key === ADVANCED_FILTERS_STORAGE_KEY) {
        refresh();
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refresh]);

  return {
    filters,
    refresh,
    updateFilters,
    removeFilter,
    clear
  };
}

export function useAnalyticsData(filters, dimension = 'family') {
  const serializedFilters = useMemo(() => serializeFilters(filters), [filters]);
  const memoFilters = useMemo(() => (filters ? { ...filters } : undefined), [serializedFilters]);
  const dimensionKey = dimension || 'family';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetchAnalytics({ filters: memoFilters ?? {}, dimension: dimensionKey }, { signal: controller.signal })
      .then((payload) => {
        setData(payload);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('[Analytics] Error:', err);
        setError(err.message || 'No fue posible obtener analytics');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return controller;
  }, [memoFilters, serializedFilters, dimensionKey]);

  useEffect(() => {
    const controller = fetchData();
    return () => controller?.abort();
  }, [fetchData, serializedFilters]);

  return {
    data,
    loading,
    error,
    refresh: fetchData
  };
}
