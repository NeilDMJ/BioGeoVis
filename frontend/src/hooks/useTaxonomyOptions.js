import { useEffect, useMemo, useRef, useState } from "react";
import { fetchTaxonomyOptions } from "../services/api";
import { EMPTY_TAXONOMY_OPTIONS, TAXONOMY_KEYS } from "../constants/taxonomy";

const cache = new Map();
const DEFAULT_STALE_TIME = 60_000; // 1 min
const DEFAULT_DEBOUNCE = 600; // >= 500 ms per requerimiento

const normalizeOptionsPayload = (payload = {}) => {
  const normalized = {};
  TAXONOMY_KEYS.forEach((key) => {
    const value = payload?.[key];
    normalized[key] = Array.isArray(value) ? value : [];
  });
  return normalized;
};

const normalizeFilters = (raw = {}) => {
  const ordered = {};
  TAXONOMY_KEYS.forEach((key) => {
    const value = raw[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      ordered[key] = trimmed.length ? trimmed : undefined;
    } else if (value != null) {
      ordered[key] = value;
    } else {
      ordered[key] = undefined;
    }
  });
  return ordered;
};

const serializeFilters = (filters) => JSON.stringify(normalizeFilters(filters));

const getCacheEntry = (key, staleTime) => {
  const cached = cache.get(key);
  if (!cached) return { data: null, fresh: false };
  const fresh = Date.now() - cached.timestamp <= staleTime;
  return { data: cached.data, fresh };
};

export function useTaxonomyOptions(
  filters,
  { staleTime = DEFAULT_STALE_TIME, debounceMs = DEFAULT_DEBOUNCE } = {}
) {
  const serialized = useMemo(() => serializeFilters(filters), [filters]);
  const [state, setState] = useState({
    options: { ...EMPTY_TAXONOMY_OPTIONS },
    loading: true,
    error: null,
  });
  const [version, setVersion] = useState(0);
  const requestRef = useRef();

  useEffect(() => {
    let cancelled = false;
    if (requestRef.current) {
      clearTimeout(requestRef.current);
      requestRef.current = undefined;
    }
    const { data, fresh } = getCacheEntry(serialized, staleTime);
    if (data) {
      setState({ options: data, loading: false, error: null });
      if (fresh) {
        return () => {
          cancelled = true;
        };
      }
    }

    requestRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const payload = JSON.parse(serialized);
      fetchTaxonomyOptions(payload)
        .then((result) => {
          const normalized = normalizeOptionsPayload(result);
          cache.set(serialized, { data: normalized, timestamp: Date.now() });
          if (!cancelled) {
            setState({ options: normalized, loading: false, error: null });
          }
        })
        .catch((error) => {
          if (!cancelled) {
            setState((prev) => ({ ...prev, loading: false, error: error.message || "Error" }));
          }
        });
    }, debounceMs);

    return () => {
      cancelled = true;
      if (requestRef.current) {
        clearTimeout(requestRef.current);
        requestRef.current = undefined;
      }
    };
  }, [serialized, staleTime, debounceMs, version]);

  const refresh = () => {
    cache.delete(serialized);
    setVersion((v) => v + 1);
  };

  return { ...state, refresh };
}
