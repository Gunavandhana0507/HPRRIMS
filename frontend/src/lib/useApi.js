import { useCallback, useEffect, useRef, useState } from 'react';
import { api, errorMessage } from './api';

/** GET a resource and expose { data, loading, error, reload }. Pass url=null to skip. */
export function useApi(url, params) {
  const [state, setState] = useState({ data: null, loading: !!url, error: null });
  const key = JSON.stringify(params || {});
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get(url, { params: JSON.parse(key) });
      if (id === seq.current) setState({ data: res.data, loading: false, error: null });
    } catch (e) {
      if (id === seq.current) setState((s) => ({ ...s, loading: false, error: errorMessage(e), status: e.response?.status }));
    }
  }, [url, key]);

  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}
