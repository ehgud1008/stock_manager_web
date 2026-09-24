import { getStockPrices } from '../../../api/priceApi';
import { useEffect, useState } from 'react';

export default function useStockPrices(stockCode, period, minuteInterval, refreshKey, realData = false) {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([stockCode, period, minuteInterval, refreshKey, realData, attempt]);
  useEffect(() => {
    let active = true;
    setState({ key, status: 'loading', data: null, error: null });
    const pending = realData
      ? getStockPrices(stockCode, period, minuteInterval, { realData: true })
      : getStockPrices(stockCode, period, minuteInterval);
    pending.then((result) => {
      if (active) setState({ key, status: 'success', data: result.data, error: null });
    }).catch((error) => {
      if (active) setState({ key, status: 'error', data: null, error });
    });
    return () => { active = false; };
  }, [stockCode, period, minuteInterval, refreshKey, realData, key]);
  return {
    ...(state.key === key ? state : { status: 'loading', data: null, error: null }),
    reload: () => setAttempt((value) => value + 1),
  };
}
