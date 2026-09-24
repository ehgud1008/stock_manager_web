import { useCallback, useEffect, useState } from 'react';

export default function useAsyncData(loader, dependencies = []) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(async () => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const result = await loader();
      setState({ status: result?.data ? 'success' : 'empty', data: result?.data ?? null, error: null });
    } catch (error) {
      setState({ status: 'error', data: null, error });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}
