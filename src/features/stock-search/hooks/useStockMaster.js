import { useEffect, useState } from 'react';
import { loadStockMaster, STOCK_MARKET } from '../services/stockMasterService';

export default function useStockMaster(market = STOCK_MARKET.DOMESTIC) {
  const [state, setState] = useState({ stocks: [], status: 'loading', error: null });

  useEffect(() => {
    let active = true;
    setState({ stocks: [], status: 'loading', error: null });

    loadStockMaster(market)
      .then((stocks) => {
        if (active) setState({ stocks, status: 'success', error: null });
      })
      .catch((error) => {
        if (active) setState({ stocks: [], status: 'error', error });
      });

    return () => { active = false; };
  }, [market]);

  return state;
}
